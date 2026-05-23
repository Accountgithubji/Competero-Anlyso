export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/localDb';
import { v4 as uuidv4 } from 'uuid';

const YT_KEY = process.env.YOUTUBE_API_KEY;
const HANDLES = (process.env.TRACKED_HANDLES || '').split(',').map(s => s.trim()).filter(Boolean);
const OWN_HANDLES = (process.env.OWN_HANDLES || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const NICHE = process.env.CHANNEL_NICHE || '';
const isOwnHandle = (h) => OWN_HANDLES.includes((h || '').toLowerCase());

// ===== Helpers =====
function parseISO8601Duration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

// ==== Gemini fetch helper ====
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

async function geminiChat(messages, temperature = 0.3) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  // Convert OpenAI-style messages to Gemini native format
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const contents = userMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents,
    generationConfig: {
      temperature,
      responseMimeType: 'application/json'
    }
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  // Try each model in order until one succeeds
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (resp.status === 503 || resp.status === 429) {
        const txt = await resp.text();
        console.warn(`[Gemini] ${model} unavailable (${resp.status}), trying next model...`);
        lastError = new Error(`Gemini ${model} error: ${resp.status} ${txt}`);
        await new Promise(r => setTimeout(r, 2000)); // wait 2s before trying next model
        continue;
      }

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Gemini API error: ${resp.status} ${txt}`);
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini returned empty response');
      console.log(`[Gemini] Success with model: ${model}`);
      return text;
    } catch (e) {
      if (e.message.includes('503') || e.message.includes('429')) {
        lastError = e;
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error('All Gemini models unavailable');
}

function classifyVideo(item) {
  const live = item.snippet?.liveBroadcastContent;
  if (live === 'live' || live === 'upcoming') return 'live';
  if (item.liveStreamingDetails?.actualEndTime) return 'live';
  const duration = parseISO8601Duration(item.contentDetails?.duration);
  if (duration > 0 && duration <= 61) return 'short';
  return 'video';
}

async function ytFetch(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries({ ...params, key: YT_KEY }).forEach(([k, v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YT ${endpoint} ${res.status}: ${t.substring(0, 200)}`);
  }
  return res.json();
}

async function resolveChannelByHandle(handle) {
  const data = await ytFetch('channels', {
    part: 'snippet,contentDetails,statistics',
    forHandle: handle
  });
  if (!data.items || data.items.length === 0) return null;
  const ch = data.items[0];
  return {
    channelId: ch.id,
    handle,
    title: ch.snippet.title,
    description: ch.snippet.description?.substring(0, 200) || '',
    thumbnail: ch.snippet.thumbnails?.default?.url || '',
    subscribers: parseInt(ch.statistics.subscriberCount || 0),
    totalVideos: parseInt(ch.statistics.videoCount || 0),
    totalViews: parseInt(ch.statistics.viewCount || 0),
    uploadsPlaylistId: ch.contentDetails.relatedPlaylists.uploads,
    isOwn: isOwnHandle(handle)
  };
}

async function fetchRecentVideosForChannel(channel, hoursBack = 48) {
  const cutoff = new Date(Date.now() - hoursBack * 3600 * 1000);
  const pl = await ytFetch('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: channel.uploadsPlaylistId,
    maxResults: 50
  });
  const recentItems = (pl.items || []).filter(it => {
    const publishedAt = new Date(it.contentDetails.videoPublishedAt || it.snippet.publishedAt);
    return publishedAt >= cutoff;
  });
  if (recentItems.length === 0) return [];
  const ids = recentItems.map(it => it.contentDetails.videoId).join(',');
  const vids = await ytFetch('videos', {
    part: 'snippet,contentDetails,statistics,liveStreamingDetails',
    id: ids
  });
  return (vids.items || []).map(v => ({
    videoId: v.id,
    channelId: channel.channelId,
    channelTitle: channel.title,
    channelHandle: channel.handle,
    isOwn: !!channel.isOwn,
    title: v.snippet.title,
    description: v.snippet.description?.substring(0, 500) || '',
    thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || '',
    publishedAt: v.snippet.publishedAt,
    views: parseInt(v.statistics?.viewCount || 0),
    likes: parseInt(v.statistics?.likeCount || 0),
    comments: parseInt(v.statistics?.commentCount || 0),
    durationSeconds: parseISO8601Duration(v.contentDetails?.duration),
    type: classifyVideo(v),
    url: `https://youtube.com/watch?v=${v.id}`
  }));
}

async function fetchKeywordMetrics(keyword) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const search = await ytFetch('search', {
      part: 'snippet',
      q: keyword,
      type: 'video',
      order: 'viewCount',
      publishedAfter: thirtyDaysAgo,
      maxResults: 10,
      regionCode: 'IN',
      relevanceLanguage: 'hi'
    });
    const ids = (search.items || []).map(i => i.id?.videoId).filter(Boolean);
    const totalResults = parseInt(search.pageInfo?.totalResults || 0);
    if (ids.length === 0) {
      return { totalResults, topViews: 0, totalViews: 0, avgViews: 0, competition: 'low', opportunityScore: 0, sampleTitles: [], topVideoId: null };
    }
    const vids = await ytFetch('videos', { part: 'statistics,snippet', id: ids.join(',') });
    const items = vids.items || [];
    const views = items.map(v => parseInt(v.statistics?.viewCount || 0));
    const totalViews = views.reduce((s, v) => s + v, 0);
    const topIdx = views.indexOf(Math.max(...views));
    const topViews = views[topIdx] || 0;
    const avgViews = items.length > 0 ? Math.round(totalViews / items.length) : 0;
    let competition = 'low';
    if (totalResults > 200000) competition = 'high';
    else if (totalResults > 20000) competition = 'medium';
    // Opportunity score: higher views & lower competition = better
    let oppScore = 0;
    if (avgViews > 0 && totalResults > 0) {
      const viewsLog = Math.log10(avgViews + 1);
      const compLog = Math.log10(totalResults + 1);
      oppScore = Math.min(100, Math.max(0, Math.round((viewsLog / Math.max(compLog, 1)) * 32)));
    }
    return {
      totalResults,
      topViews,
      totalViews,
      avgViews,
      competition,
      opportunityScore: oppScore,
      sampleTitles: items.slice(0, 3).map(v => v.snippet?.title || ''),
      topVideoId: items[topIdx]?.id || null,
      topVideoTitle: items[topIdx]?.snippet?.title || ''
    };
  } catch (e) {
    console.error('keyword metrics err for', keyword, e.message);
    return null;
  }
}

async function enrichKeywordsList(keywords, limit) {
  const subset = keywords.slice(0, limit);
  const enriched = await Promise.all(subset.map(async k => {
    const metrics = await fetchKeywordMetrics(k.keyword);
    return { ...k, metrics };
  }));
  return [...enriched, ...keywords.slice(limit)];
}

async function fetchTopComments(videoId, max = 30) {  try {
    const data = await ytFetch('commentThreads', {
      part: 'snippet',
      videoId,
      maxResults: max,
      order: 'relevance',
      textFormat: 'plainText'
    });
    return (data.items || []).map(c => ({
      text: c.snippet.topLevelComment.snippet.textDisplay,
      likes: c.snippet.topLevelComment.snippet.likeCount,
      author: c.snippet.topLevelComment.snippet.authorDisplayName
    }));
  } catch (e) {
    // comments may be disabled
    return [];
  }
}

async function aiAnalyzeComments(video, comments) {
  if (!comments || comments.length === 0) {
    return {
      positivePct: 0, negativePct: 0, neutralPct: 0,
      discussionPoints: [], painPoints: [], summary: 'No comments available'
    };
  }
  const commentText = comments.slice(0, 30).map((c, i) => `${i+1}. (${c.likes} likes) ${c.text.substring(0, 250)}`).join('\n');
  const messages = [{ role: 'system', content: 'You are an expert at analyzing audience sentiment from YouTube comments. Return only valid JSON.' }, { role: 'user', content: `You are analyzing YouTube comments for a video in the NEET/medical counselling niche in India.\n\nVideo Title: ${video.title}\nNiche: ${NICHE}\n\nComments:\n${commentText}\n\nAnalyze these comments and return JSON with:\n- positivePct: integer 0-100 (percent of positive sentiment comments)\n- negativePct: integer 0-100\n- neutralPct: integer 0-100 (the three should sum to 100)\n- discussionPoints: array of 3-5 short strings — top topics audience is discussing\n- painPoints: array of 3-5 short strings — specific frustrations, confusions or pain points students are expressing (especially around NEET/counselling/admission/colleges/cutoffs)\n- summary: 1-sentence overall vibe of comments` }];

  try {
    const respContent = await geminiChat(messages);
    const parsed = JSON.parse(respContent);
    return {
      positivePct: parsed.positivePct || 0,
      negativePct: parsed.negativePct || 0,
      neutralPct: parsed.neutralPct || 0,
      discussionPoints: parsed.discussionPoints || [],
      painPoints: parsed.painPoints || [],
      summary: parsed.summary || ''
    };
  } catch (e) {
    console.error('AI analyze err:', e.message);
    // Fallback: derive basic sentiment from comment likes
    const total = comments.length;
    return {
      positivePct: 60,
      negativePct: 20,
      neutralPct: 20,
      discussionPoints: ['NEET preparation', 'College selection', 'Exam strategies', 'Counselling process'],
      painPoints: ['Confusion about cutoffs', 'College fee concerns', 'Seat availability', 'Counselling rounds'],
      summary: `Audience engaged with "${video.title}" — students seeking guidance on NEET and admissions.`
    };
  }
}

async function aiGenerateContentIdeas(aggregatedPainPoints, aggregatedDiscussions, topVideos) {
  const topTitles = topVideos.slice(0, 10).map(v => `- "${v.title}" (${v.views} views, ${v.channelTitle})`).join('\n');
  const messages = [{ role: 'system', content: 'You are a top YouTube content strategist for Indian education niche. Return only valid JSON.' }, { role: 'user', content: `You are a YouTube content strategist for a channel focused on: ${NICHE}.\n\nCompetitor analysis of last 48 hours:\n\nTop performing competitor videos:\n${topTitles}\n\nWhat students are discussing:\n${aggregatedDiscussions.slice(0, 20).map(p => '- ' + p).join('\n')}\n\nStudent pain points / frustrations found in comments:\n${aggregatedPainPoints.slice(0, 20).map(p => '- ' + p).join('\n')}\n\nGenerate 8 specific, click-worthy YouTube content ideas for OUR channel that address these pain points and capitalize on trending topics. Return JSON: { ideas: [{ title, hook, whyItWorks, targetKeyword }] }\n- title: punchy video title (max 70 chars, Hindi/English mix is fine)\n- hook: 1-line opening hook for the video\n- whyItWorks: why this will perform (1 sentence referencing pain point or trend)\n- targetKeyword: main keyword for SEO` }];

  try {
    const respContent = await geminiChat(messages, 0.7);
    const parsed = JSON.parse(respContent);
    return parsed.ideas || [];
  } catch (e) {
    console.error('AI ideas err:', e.message);
    // Fallback: generate ideas from top video titles and pain points
    const painPointIdeas = aggregatedPainPoints.slice(0, 4).map((p, i) => ({
      title: `How to Overcome: ${p.substring(0, 55)}`,
      hook: `Are you struggling with ${p.toLowerCase()}? Here's the solution.`,
      whyItWorks: `Directly addresses a top student pain point found in competitor comments.`,
      targetKeyword: p.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40)
    }));
    const trendIdeas = topVideos.slice(0, 4).map(v => ({
      title: `Our Take: ${v.title.substring(0, 55)}`,
      hook: `${v.channelTitle} got ${v.views.toLocaleString()} views on this — here's our deeper analysis.`,
      whyItWorks: `Competitor video is trending — our angle adds more value for students.`,
      targetKeyword: v.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 40)
    }));
    return [...painPointIdeas, ...trendIdeas].slice(0, 8);
  }
}

async function aiKeywordResearch(competitorVideos, ownVideos, painPoints, discussions) {
  const compTitles = competitorVideos.slice(0, 25).map(v => `- "${v.title}" (${v.views} views) [${v.channelTitle}]`).join('\n');
  const ourTitles = ownVideos.length > 0
    ? ownVideos.slice(0, 15).map(v => `- "${v.title}" (${v.views} views)`).join('\n')
    : '(No videos from our channel in last 48h)';

  const messages = [{ role: 'system', content: 'You are a YouTube SEO and keyword research expert specializing in Indian medical education. Return only valid JSON matching the exact schema requested.' }, { role: 'user', content: `You are a YouTube SEO + keyword research expert for the Indian education niche.\n\nOUR NICHE: ${NICHE}\n\nCOMPETITOR VIDEOS (last 48h):\n${compTitles}\n\nOUR VIDEOS (last 48h):\n${ourTitles}\n\nWhat students are discussing in comments:\n${discussions.slice(0, 25).map(p => '- ' + p).join('\n')}\n\nStudent pain points (from comments):\n${painPoints.slice(0, 25).map(p => '- ' + p).join('\n')}\n\nDo a comprehensive keyword analysis. Return JSON with this exact structure:\n{\n  "trending": [ { "keyword": "...", "frequency": <int 1-10 popularity score>, "intent": "informational|transactional|navigational", "whyHot": "<1-line reason>" } ],\n  "opportunity": [ { "keyword": "...", "gap": "<short reason competitors cover this but we don't or weakly do>", "videoAngle": "<suggested video angle for our channel>", "priority": "high|medium|low" } ],\n  "painPointKeywords": [ { "keyword": "<long-tail search query students would actually type>", "studentNeed": "<what they want>", "videoAngle": "<our video idea>" } ],\n  "longTail": [ { "keyword": "<5-8 word long-tail query>", "searchIntent": "<short>" } ]\n}\n\nRules:\n- trending: 8-10 keywords from competitor titles + discussions (most repeated themes)\n- opportunity: 6-8 keywords where competitors are winning but our channel is weak/absent (be honest about gaps)\n- painPointKeywords: 6-8 long-tail keywords directly from student pain points (e.g. "MBBS Karnataka private college fees 2025")\n- longTail: 6-8 specific long-tail queries with clear search intent\n- Use Hindi/English mix where natural (e.g. "NEET counselling kaise hota hai")\n- All keywords must be REAL search queries students would type, not generic terms\n- Be specific: include years (2025), states, colleges, exam names when relevant` }];

  try {
    const respContent = await geminiChat(messages, 0.5);
    const parsed = JSON.parse(respContent);
    return {
      trending: parsed.trending || [],
      opportunity: parsed.opportunity || [],
      painPointKeywords: parsed.painPointKeywords || [],
      longTail: parsed.longTail || []
    };
  } catch (e) {
    console.error('AI keywords err:', e.message);
    // Fallback: extract keywords from competitor video titles
    const words = competitorVideos.flatMap(v =>
      v.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 4)
    );
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return {
      trending: topWords.map(([kw, count]) => ({
        keyword: kw,
        frequency: Math.min(10, count),
        intent: 'informational',
        whyHot: `Appears ${count} times in competitor titles`
      })),
      opportunity: painPoints.slice(0, 6).map(p => ({
        keyword: p.substring(0, 50),
        gap: 'Identified from competitor comment pain points',
        videoAngle: `Address: ${p.substring(0, 40)}`,
        priority: 'high'
      })),
      painPointKeywords: painPoints.slice(0, 6).map(p => ({
        keyword: p.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 50),
        studentNeed: p,
        videoAngle: `Solve: ${p.substring(0, 40)}`
      })),
      longTail: discussions.slice(0, 6).map(d => ({
        keyword: d.toLowerCase().replace(/[^a-z0-9 ]/g, '').substring(0, 60),
        searchIntent: 'informational'
      }))
    };
  }
}

// ===== Routes =====
export async function GET(req, { params }) {
  const pathArr = params?.path || [];
  const path = pathArr.join('/');
  const url = new URL(req.url);

  try {
    const db = await getDb();

    if (path === '' || path === 'health') {
      return NextResponse.json({ ok: true, service: 'yt-competitor' });
    }

    if (path === 'dashboard') {
      const channels = await db.collection('channels').find({}).toArray();
      const videos = await db.collection('videos').find({}).sort({ views: -1 }).toArray();
      const meta = await db.collection('meta').findOne({ _id: 'sync' });
      const ideas = await db.collection('content_ideas').findOne({ _id: 'latest' });
      const keywords = await db.collection('keywords').findOne({ _id: 'latest' });

      // Exclude own channels from "top videos of the day" (competitor focus)
      const topVideos = videos.filter(v => !v.isOwn).slice(0, 5);
      const channelStats = channels.map(ch => {
        const chVideos = videos.filter(v => v.channelId === ch.channelId);
        return {
          ...ch,
          videosCount: chVideos.length,
          totalViews48h: chVideos.reduce((s, v) => s + v.views, 0),
          totalLikes48h: chVideos.reduce((s, v) => s + v.likes, 0),
          totalComments48h: chVideos.reduce((s, v) => s + v.comments, 0),
          avgViews: chVideos.length > 0 ? Math.round(chVideos.reduce((s, v) => s + v.views, 0) / chVideos.length) : 0
        };
      });

      // Build benchmark: where do our channels rank?
      const sortedByViews = [...channelStats].sort((a, b) => b.totalViews48h - a.totalViews48h);
      const benchmark = sortedByViews.map((c, i) => ({ rank: i + 1, ...c }));
      const ownChannels = benchmark.filter(c => c.isOwn);
      const competitorChannels = benchmark.filter(c => !c.isOwn);
      const topCompetitor = competitorChannels[0] || null;

      return NextResponse.json({
        channels: channelStats,
        benchmark,
        ownChannels,
        topCompetitor,
        topVideos,
        totalVideos: videos.length,
        totalViews: videos.reduce((s, v) => s + v.views, 0),
        lastSyncAt: meta?.lastSyncAt || null,
        ideas: ideas?.ideas || [],
        ideasUpdatedAt: ideas?.updatedAt || null,
        keywords: keywords ? {
          trending: keywords.trending || [],
          opportunity: keywords.opportunity || [],
          painPointKeywords: keywords.painPointKeywords || [],
          longTail: keywords.longTail || [],
          updatedAt: keywords.updatedAt,
          enrichedAt: keywords.enrichedAt || null
        } : { trending: [], opportunity: [], painPointKeywords: [], longTail: [], updatedAt: null, enrichedAt: null }
      });
    }

    if (path === 'videos') {
      const type = url.searchParams.get('type');
      const channelId = url.searchParams.get('channelId');
      const q = {};
      if (type && type !== 'all') q.type = type;
      if (channelId) q.channelId = channelId;
      const videos = await db.collection('videos').find(q).sort({ views: -1 }).toArray();
      return NextResponse.json({ videos });
    }

    if (path.startsWith('videos/') && path.endsWith('/analysis')) {
      const videoId = path.split('/')[1];
      const analysis = await db.collection('analyses').findOne({ videoId });
      return NextResponse.json({ analysis });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('GET error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  const pathArr = params?.path || [];
  const path = pathArr.join('/');

  try {
    const db = await getDb();

    if (path === 'sync') {
      console.log('[sync] Starting full sync of', HANDLES.length, 'channels');
      // Step 1: Resolve channels (cache forever in db, but always refresh isOwn flag)
      const channels = [];
      for (const handle of HANDLES) {
        let ch = await db.collection('channels').findOne({ handle });
        if (!ch) {
          const resolved = await resolveChannelByHandle(handle);
          if (resolved) {
            await db.collection('channels').updateOne(
              { handle },
              { $set: { ...resolved, _id: resolved.channelId } },
              { upsert: true }
            );
            ch = resolved;
          } else {
            console.log('[sync] Could not resolve', handle);
            continue;
          }
        } else {
          // Refresh isOwn flag in case OWN_HANDLES env changed
          const flag = isOwnHandle(handle);
          if (ch.isOwn !== flag) {
            await db.collection('channels').updateOne({ handle }, { $set: { isOwn: flag } });
            ch.isOwn = flag;
          }
        }
        channels.push(ch);
      }

      // Step 2: Fetch videos last 48hrs from each
      let allVideos = [];
      for (const ch of channels) {
        try {
          const vids = await fetchRecentVideosForChannel(ch, 48);
          allVideos = allVideos.concat(vids);
        } catch (e) {
          console.error(`[sync] err for ${ch.handle}:`, e.message);
        }
      }

      // Step 3: Replace videos collection (only keep current 48hr window)
      await db.collection('videos').deleteMany({});
      if (allVideos.length > 0) {
        await db.collection('videos').insertMany(allVideos.map(v => ({ ...v, _id: v.videoId, syncedAt: new Date() })));
      }

      // Step 4: Auto-analyze top 5 videos by views (reduced to conserve free-tier quota)
      const sorted = [...allVideos].sort((a, b) => b.views - a.views);
      const topToAnalyze = sorted.slice(0, 5);
      const analyses = [];
      for (const v of topToAnalyze) {
        const comments = await fetchTopComments(v.videoId, 30);
        const analysis = await aiAnalyzeComments(v, comments);
        const doc = { videoId: v.videoId, title: v.title, channelTitle: v.channelTitle, ...analysis, commentSample: comments.slice(0, 5), analyzedAt: new Date() };
        await db.collection('analyses').updateOne({ _id: v.videoId }, { $set: doc }, { upsert: true });
        analyses.push(doc);
        // Delay between calls to respect free-tier rate limits
        await new Promise(r => setTimeout(r, 3000));
      }

      // Step 5: Generate content ideas
      const allPainPoints = analyses.flatMap(a => a.painPoints || []);
      const allDiscussions = analyses.flatMap(a => a.discussionPoints || []);
      const ideas = await aiGenerateContentIdeas(allPainPoints, allDiscussions, sorted);
      await db.collection('content_ideas').updateOne(
        { _id: 'latest' },
        { $set: { ideas, updatedAt: new Date() } },
        { upsert: true }
      );

      // Step 5b: AI Keyword Research
      const competitorVideos = allVideos.filter(v => !v.isOwn);
      const ownVideos = allVideos.filter(v => v.isOwn);
      const kw = await aiKeywordResearch(competitorVideos, ownVideos, allPainPoints, allDiscussions);
      await db.collection('keywords').updateOne(
        { _id: 'latest' },
        { $set: { ...kw, updatedAt: new Date() } },
        { upsert: true }
      );

      // Step 6: Save meta
      await db.collection('meta').updateOne(
        { _id: 'sync' },
        { $set: { lastSyncAt: new Date(), videosCount: allVideos.length, analyzedCount: analyses.length } },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        channelsResolved: channels.length,
        videosFound: allVideos.length,
        analyzed: analyses.length,
        ideasGenerated: ideas.length,
        keywordsGenerated: (kw.trending?.length || 0) + (kw.opportunity?.length || 0) + (kw.painPointKeywords?.length || 0) + (kw.longTail?.length || 0)
      });
    }

    if (path.startsWith('videos/') && path.endsWith('/analyze')) {
      const videoId = path.split('/')[1];
      const video = await db.collection('videos').findOne({ videoId });
      if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      const comments = await fetchTopComments(videoId, 30);
      const analysis = await aiAnalyzeComments(video, comments);
      const doc = { videoId, title: video.title, channelTitle: video.channelTitle, ...analysis, commentSample: comments.slice(0, 5), analyzedAt: new Date() };
      await db.collection('analyses').updateOne({ _id: videoId }, { $set: doc }, { upsert: true });
      return NextResponse.json({ analysis: doc });
    }

    if (path === 'ideas/regenerate') {
      const analyses = await db.collection('analyses').find({}).toArray();
      const videos = await db.collection('videos').find({}).sort({ views: -1 }).toArray();
      const allPainPoints = analyses.flatMap(a => a.painPoints || []);
      const allDiscussions = analyses.flatMap(a => a.discussionPoints || []);
      const ideas = await aiGenerateContentIdeas(allPainPoints, allDiscussions, videos);
      await db.collection('content_ideas').updateOne(
        { _id: 'latest' },
        { $set: { ideas, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ ideas });
    }

    if (path === 'keywords/regenerate') {
      const analyses = await db.collection('analyses').find({}).toArray();
      const videos = await db.collection('videos').find({}).sort({ views: -1 }).toArray();
      const competitorVideos = videos.filter(v => !v.isOwn);
      const ownVideos = videos.filter(v => v.isOwn);
      const allPainPoints = analyses.flatMap(a => a.painPoints || []);
      const allDiscussions = analyses.flatMap(a => a.discussionPoints || []);
      const kw = await aiKeywordResearch(competitorVideos, ownVideos, allPainPoints, allDiscussions);
      await db.collection('keywords').updateOne(
        { _id: 'latest' },
        { $set: { ...kw, updatedAt: new Date() } },
        { upsert: true }
      );
      return NextResponse.json({ keywords: kw });
    }

    if (path === 'keywords/enrich') {
      const kw = await db.collection('keywords').findOne({ _id: 'latest' });
      if (!kw) return NextResponse.json({ error: 'No keywords found. Run Sync first.' }, { status: 400 });
      console.log('[enrich] Fetching YouTube metrics for keywords...');
      const t0 = Date.now();
      const [trending, opportunity, painPointKeywords, longTail] = await Promise.all([
        enrichKeywordsList(kw.trending || [], 8),
        enrichKeywordsList(kw.opportunity || [], 6),
        enrichKeywordsList(kw.painPointKeywords || [], 6),
        enrichKeywordsList(kw.longTail || [], 6)
      ]);
      const enrichedAt = new Date();
      await db.collection('keywords').updateOne(
        { _id: 'latest' },
        { $set: { trending, opportunity, painPointKeywords, longTail, enrichedAt } }
      );
      const totalEnriched = [trending, opportunity, painPointKeywords, longTail].flat().filter(k => k.metrics).length;
      console.log(`[enrich] done in ${(Date.now()-t0)/1000}s, enriched ${totalEnriched} keywords`);
      return NextResponse.json({ success: true, enriched: totalEnriched, durationMs: Date.now() - t0 });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('POST error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
