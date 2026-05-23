'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import { RefreshCw, Eye, ThumbsUp, MessageSquare, Flame, TrendingUp, Lightbulb, Youtube, Radio, Film, Video, Clock, Sparkles, AlertCircle, Crown, Search, Target, Zap, KeyRound, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const fmtNum = (n) => {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};
const timeAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
};

const typeIcon = (t) => t === 'short' ? <Film className="w-3 h-3" /> : t === 'live' ? <Radio className="w-3 h-3" /> : <Video className="w-3 h-3" />;
const typeColor = (t) => t === 'short' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : t === 'live' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-blue-500/20 text-blue-300 border-blue-500/40';

const intentColor = (intent) => {
  const map = { informational: 'bg-blue-500/15 text-blue-300 border-blue-500/30', transactional: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', navigational: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
  return map[intent] || 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30';
};
const priorityColor = (p) => ({ high: 'bg-red-500/15 text-red-300 border-red-500/30', medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30', low: 'bg-zinc-700/30 text-zinc-300 border-zinc-600/30' }[p] || 'bg-zinc-700/30 text-zinc-300');

export default function App() {
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingKw, setRefreshingKw] = useState(false);
  const [enrichingKw, setEnrichingKw] = useState(false);
  const [copiedKw, setCopiedKw] = useState('');

  const fetchDashboard = useCallback(async () => {
    try { const r = await fetch('/api/dashboard'); setData(await r.json()); }
    catch (e) { toast.error('Failed to load dashboard'); }
  }, []);

  const fetchVideos = useCallback(async (type) => {
    try {
      const url = type === 'all' ? '/api/videos' : `/api/videos?type=${type}`;
      const r = await fetch(url); const d = await r.json();
      setVideos(d.videos || []);
    } catch (e) { toast.error('Failed to load videos'); }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchDashboard(), fetchVideos('all')]); setLoading(false); })();
  }, []);

  useEffect(() => { fetchVideos(filter); }, [filter, fetchVideos]);

  const handleSync = async (silent = false) => {
    setSyncing(true);
    if (!silent) toast.info('Syncing channels, analyzing comments & generating keywords… (~1 min)');
    try {
      const r = await fetch('/api/sync', { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        toast.success(`Synced ${d.videosFound} videos · ${d.analyzed} analyzed · ${d.ideasGenerated} ideas · ${d.keywordsGenerated} keywords`);
        await Promise.all([fetchDashboard(), fetchVideos(filter)]);
      } else toast.error(d.error || 'Sync failed');
    } catch (e) { toast.error('Sync failed: ' + e.message); }
    setSyncing(false);
  };

  const refreshKeywords = async () => {
    setRefreshingKw(true);
    try {
      const r = await fetch('/api/keywords/regenerate', { method: 'POST' });
      const d = await r.json();
      if (d.keywords) { toast.success('Keywords refreshed'); fetchDashboard(); }
    } catch (e) { toast.error('Failed to refresh keywords'); }
    setRefreshingKw(false);
  };

  const enrichKeywords = async () => {
    setEnrichingKw(true);
    toast.info('Fetching real YouTube data for keywords… (~5s)');
    try {
      const r = await fetch('/api/keywords/enrich', { method: 'POST' });
      const d = await r.json();
      if (d.success) { toast.success(`Enriched ${d.enriched} keywords with real YouTube metrics`); fetchDashboard(); }
      else toast.error(d.error || 'Enrich failed');
    } catch (e) { toast.error('Enrich failed'); }
    setEnrichingKw(false);
  };

  const copyKw = (kw) => {
    navigator.clipboard.writeText(kw);
    setCopiedKw(kw);
    toast.success('Copied: ' + kw);
    setTimeout(() => setCopiedKw(''), 1500);
  };

  const openVideo = async (v) => {
    setSelectedVideo(v); setVideoAnalysis(null);
    try { const r = await fetch(`/api/videos/${v.videoId}/analysis`); const d = await r.json(); if (d.analysis) setVideoAnalysis(d.analysis); } catch (e) {}
  };

  const analyzeVideo = async () => {
    if (!selectedVideo) return;
    setAnalyzing(true);
    try {
      const r = await fetch(`/api/videos/${selectedVideo.videoId}/analyze`, { method: 'POST' });
      const d = await r.json();
      if (d.analysis) { setVideoAnalysis(d.analysis); toast.success('Analysis complete'); }
    } catch (e) { toast.error('Analysis failed'); }
    setAnalyzing(false);
  };

  const chartData = useMemo(() => {
    if (!data?.channels) return [];
    return data.channels
      .map(c => ({ name: c.title.length > 14 ? c.title.substring(0, 14) + '…' : c.title, Views: c.totalViews48h, Likes: c.totalLikes48h, Comments: c.totalComments48h, Videos: c.videosCount, isOwn: !!c.isOwn }))
      .sort((a, b) => b.Views - a.Views);
  }, [data]);

  const myRank = useMemo(() => {
    const own = data?.ownChannels || [];
    if (own.length === 0) return null;
    const best = own.reduce((a, b) => (a.rank < b.rank ? a : b));
    return { rank: best.rank, total: data.benchmark?.length || 0, name: best.title, views: best.totalViews48h, videos: best.videosCount };
  }, [data]);

  const gapVsTop = useMemo(() => {
    if (!myRank || !data?.topCompetitor) return null;
    const top = data.topCompetitor;
    const mine = data.ownChannels.find(c => c.title === myRank.name);
    if (!mine) return null;
    const gap = top.totalViews48h - mine.totalViews48h;
    const pct = top.totalViews48h > 0 ? Math.round((mine.totalViews48h / top.totalViews48h) * 100) : 0;
    return { topName: top.title, topViews: top.totalViews48h, myViews: mine.totalViews48h, gap, pct };
  }, [myRank, data]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-black text-white">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Competitor Pulse</h1>
              <p className="text-xs text-zinc-500">NEET / AYUSH counselling intelligence • last 48h</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {data?.lastSyncAt && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5" /> Synced {timeAgo(data.lastSyncAt)}
              </div>
            )}
            <Button onClick={() => handleSync()} disabled={syncing} className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {!loading && (!data?.lastSyncAt || data.totalVideos === 0) && (
          <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
            <CardContent className="py-16 flex flex-col items-center text-center">
              <Sparkles className="w-12 h-12 text-zinc-600 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Ready when you are 🚀</h2>
              <p className="text-zinc-400 mb-6 max-w-md">Click <span className="text-white font-semibold">Sync Now</span> to fetch the last 48 hours from all 9 channels (7 competitors + your 2), run AI comment analysis and generate keyword research. Takes ~1 minute.</p>
              <Button size="lg" onClick={() => handleSync()} disabled={syncing} className="bg-gradient-to-r from-red-600 to-pink-600">
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                Run First Sync
              </Button>
            </CardContent>
          </Card>
        )}

        {data?.lastSyncAt && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Video className="w-5 h-5" />} label="Total Videos" value={data.totalVideos} sub="last 48h · all channels" tone="blue" />
            <StatCard icon={<Eye className="w-5 h-5" />} label="Total Views" value={fmtNum(data.totalViews || 0)} sub="combined" tone="green" />
            <StatCard icon={<Crown className="w-5 h-5" />} label="Your Rank" value={myRank ? `#${myRank.rank} / ${myRank.total}` : '—'} sub={myRank ? myRank.name : 'add your channel'} tone="amber" />
            <StatCard icon={<KeyRound className="w-5 h-5" />} label="Keywords" value={(data.keywords?.trending?.length || 0) + (data.keywords?.opportunity?.length || 0)} sub="trending + opportunities" tone="purple" />
          </div>
        )}

        {/* You vs Competitors benchmark */}
        {gapVsTop && (
          <Card className="bg-gradient-to-br from-amber-950/30 via-zinc-900/50 to-zinc-900/50 border-amber-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> You vs Top Competitor</CardTitle>
              <CardDescription className="text-zinc-400">Where your channel stands in the last 48h</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 items-center">
                <div className="bg-zinc-900/60 rounded-lg p-4 border border-amber-900/30">
                  <p className="text-xs text-amber-400 uppercase tracking-wider mb-1">Your Channel</p>
                  <p className="text-lg font-semibold truncate">{myRank.name}</p>
                  <p className="text-2xl font-bold text-amber-300 mt-1">{fmtNum(gapVsTop.myViews)} views</p>
                  <p className="text-xs text-zinc-500 mt-1">{myRank.videos} videos posted</p>
                </div>
                <div className="text-center">
                  <p className="text-5xl font-black bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">{gapVsTop.pct}%</p>
                  <p className="text-xs text-zinc-400 mt-1">of top competitor</p>
                  <p className="text-xs text-zinc-500 mt-2">Gap: <span className="text-red-300 font-semibold">{fmtNum(gapVsTop.gap)} views behind</span></p>
                </div>
                <div className="bg-zinc-900/60 rounded-lg p-4 border border-red-900/30">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Top Competitor</p>
                  <p className="text-lg font-semibold truncate">{gapVsTop.topName}</p>
                  <p className="text-2xl font-bold text-red-300 mt-1">{fmtNum(gapVsTop.topViews)} views</p>
                  <p className="text-xs text-zinc-500 mt-1">Rank #1</p>
                </div>
              </div>
              {/* Mini ranking */}
              <div className="mt-5 space-y-1.5">
                {data.benchmark.map(c => (
                  <div key={c.channelId} className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-md ${c.isOwn ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-zinc-900/40'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-sm font-bold w-6 ${c.isOwn ? 'text-amber-400' : 'text-zinc-500'}`}>#{c.rank}</span>
                      <span className={`text-sm truncate ${c.isOwn ? 'text-amber-200 font-semibold' : 'text-zinc-300'}`}>{c.title}</span>
                      {c.isOwn && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] h-4">YOU</Badge>}
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-400 flex-shrink-0">
                      <span>{c.videosCount} videos</span>
                      <span className="text-zinc-300 font-medium w-16 text-right">{fmtNum(c.totalViews48h)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {chartData.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Channel Comparison (last 48h)</CardTitle>
              <CardDescription className="text-zinc-500">Views, likes, comments per channel • <span className="text-amber-400">amber bars = your channels</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" stroke="#71717a" angle={-25} textAnchor="end" height={70} fontSize={11} />
                    <YAxis stroke="#71717a" tickFormatter={fmtNum} fontSize={11} />
                    <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} formatter={(v) => fmtNum(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Views" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.isOwn ? '#f59e0b' : '#ef4444'} />)}
                    </Bar>
                    <Bar dataKey="Likes" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Keyword Research */}
        {data?.lastSyncAt && (
          <Card className="bg-gradient-to-br from-indigo-950/30 via-zinc-900/50 to-zinc-900/50 border-indigo-900/30">
            <CardHeader>
              <div className="flex flex-wrap justify-between items-center gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-indigo-400" /> AI Keyword Research</CardTitle>
                  <CardDescription className="text-zinc-500">
                    Find what to rank for — based on competitor titles + student pain points
                    {data.keywords?.enrichedAt && <span className="ml-2 text-emerald-400">• Real YouTube metrics loaded</span>}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={enrichKeywords} disabled={enrichingKw} className="bg-emerald-950/30 border-emerald-700/40 hover:bg-emerald-900/30 text-emerald-300">
                    <Zap className={`w-3.5 h-3.5 mr-2 ${enrichingKw ? 'animate-pulse' : ''}`} />
                    {enrichingKw ? 'Fetching…' : (data.keywords?.enrichedAt ? 'Re-fetch YT Data' : 'Enrich w/ YouTube Data')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={refreshKeywords} disabled={refreshingKw} className="bg-zinc-900 border-zinc-700">
                    <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshingKw ? 'animate-spin' : ''}`} />Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="trending">
                <TabsList className="bg-zinc-900 mb-4">
                  <TabsTrigger value="trending"><Flame className="w-3.5 h-3.5 mr-1.5" />Trending</TabsTrigger>
                  <TabsTrigger value="opportunity"><Target className="w-3.5 h-3.5 mr-1.5" />Opportunities</TabsTrigger>
                  <TabsTrigger value="pain"><Zap className="w-3.5 h-3.5 mr-1.5" />Pain Points</TabsTrigger>
                  <TabsTrigger value="longtail"><KeyRound className="w-3.5 h-3.5 mr-1.5" />Long-tail</TabsTrigger>
                </TabsList>
                <TabsContent value="trending">
                  <div className="grid md:grid-cols-2 gap-3">
                    {(data.keywords?.trending || []).map((k, i) => (
                      <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-indigo-700/50 transition group">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-sm flex-1">{k.keyword}</p>
                          {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={intentColor(k.intent)}>{k.intent}</Badge>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 10 }).map((_, idx) => (
                              <div key={idx} className={`w-1 h-3 rounded-sm ${idx < (k.frequency || 0) ? 'bg-indigo-400' : 'bg-zinc-700'}`} />
                            ))}
                          </div>
                        </div>
                        {k.whyHot && <p className="text-xs text-zinc-500 mt-2">🔥 {k.whyHot}</p>}
                        <KeywordMetrics metrics={k.metrics} />
                      </div>
                    ))}
                    {(!data.keywords?.trending || data.keywords.trending.length === 0) && <p className="text-sm text-zinc-500 col-span-2 text-center py-8">No trending keywords yet</p>}
                  </div>
                </TabsContent>
                <TabsContent value="opportunity">
                  <div className="grid md:grid-cols-2 gap-3">
                    {(data.keywords?.opportunity || []).map((k, i) => (
                      <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-emerald-700/50 transition group">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-sm flex-1">{k.keyword}</p>
                          {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                        </div>
                        <Badge variant="outline" className={priorityColor(k.priority) + ' mb-2'}>{k.priority} priority</Badge>
                        <p className="text-xs text-zinc-400 mb-1.5"><span className="text-red-300">Gap:</span> {k.gap}</p>
                        <p className="text-xs text-emerald-300"><Lightbulb className="w-3 h-3 inline mr-1" />{k.videoAngle}</p>
                        <KeywordMetrics metrics={k.metrics} />
                      </div>
                    ))}
                    {(!data.keywords?.opportunity || data.keywords.opportunity.length === 0) && <p className="text-sm text-zinc-500 col-span-2 text-center py-8">No opportunities yet</p>}
                  </div>
                </TabsContent>
                <TabsContent value="pain">
                  <div className="grid md:grid-cols-2 gap-3">
                    {(data.keywords?.painPointKeywords || []).map((k, i) => (
                      <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-orange-700/50 transition group">
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-semibold text-sm flex-1">{k.keyword}</p>
                          {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                        </div>
                        <p className="text-xs text-orange-300 mb-1.5">🎯 {k.studentNeed}</p>
                        <p className="text-xs text-zinc-400">💡 {k.videoAngle}</p>
                        <KeywordMetrics metrics={k.metrics} />
                      </div>
                    ))}
                    {(!data.keywords?.painPointKeywords || data.keywords.painPointKeywords.length === 0) && <p className="text-sm text-zinc-500 col-span-2 text-center py-8">No pain-point keywords yet</p>}
                  </div>
                </TabsContent>
                <TabsContent value="longtail">
                  <div className="grid md:grid-cols-2 gap-3">
                    {(data.keywords?.longTail || []).map((k, i) => (
                      <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-purple-700/50 transition group">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-sm flex-1">{k.keyword}</p>
                          {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                        </div>
                        <p className="text-xs text-zinc-500">Intent: {k.searchIntent}</p>
                        <KeywordMetrics metrics={k.metrics} />
                      </div>
                    ))}
                    {(!data.keywords?.longTail || data.keywords.longTail.length === 0) && <p className="text-sm text-zinc-500 col-span-2 text-center py-8">No long-tail keywords yet</p>}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {data?.topVideos?.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="bg-zinc-900/50 border-zinc-800 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Top 5 Videos of the Day</CardTitle>
                <CardDescription className="text-zinc-500">Best performing competitor videos (last 48h)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.topVideos.map((v, i) => (
                  <div key={v.videoId} onClick={() => openVideo(v)} className="group flex gap-3 p-3 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition border border-transparent hover:border-zinc-700">
                    <div className="text-2xl font-black text-zinc-700 w-8 text-center pt-1 group-hover:text-orange-400 transition">{i + 1}</div>
                    <img src={v.thumbnail} alt="" className="w-32 h-20 object-cover rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={typeColor(v.type)}>{typeIcon(v.type)}<span className="ml-1">{v.type}</span></Badge>
                        <span className="text-xs text-zinc-500">{v.channelTitle}</span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2 mb-1">{v.title}</p>
                      <div className="flex gap-3 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtNum(v.views)}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmtNum(v.likes)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{fmtNum(v.comments)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(v.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-950/30 to-zinc-900/50 border-purple-900/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> AI Content Ideas</CardTitle>
                <CardDescription className="text-zinc-500">For your channel — based on gaps & pain points</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[28rem] pr-3">
                  <div className="space-y-3">
                    {(data.ideas || []).map((idea, i) => (
                      <div key={i} className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-purple-700/50 transition">
                        <div className="flex items-start gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm font-semibold leading-snug">{idea.title}</p>
                        </div>
                        <p className="text-xs text-zinc-400 italic mb-2">"{idea.hook}"</p>
                        <p className="text-xs text-zinc-500 mb-2"><span className="text-zinc-400">Why:</span> {idea.whyItWorks}</p>
                        {idea.targetKeyword && <Badge variant="outline" className="text-xs border-purple-700/40 text-purple-300">{idea.targetKeyword}</Badge>}
                      </div>
                    ))}
                    {(!data.ideas || data.ideas.length === 0) && <p className="text-sm text-zinc-500 text-center py-8">Ideas will appear after sync</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {data?.lastSyncAt && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>All Content (last 48h)</CardTitle>
                  <CardDescription className="text-zinc-500">Click any video for AI analysis</CardDescription>
                </div>
                <Tabs value={filter} onValueChange={setFilter}>
                  <TabsList className="bg-zinc-800">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="video"><Video className="w-3.5 h-3.5 mr-1" />Videos</TabsTrigger>
                    <TabsTrigger value="short"><Film className="w-3.5 h-3.5 mr-1" />Shorts</TabsTrigger>
                    <TabsTrigger value="live"><Radio className="w-3.5 h-3.5 mr-1" />Live</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {videos.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-12">No {filter !== 'all' ? filter + 's' : 'content'} found in last 48h</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map(v => (
                    <div key={v.videoId} onClick={() => openVideo(v)} className={`group cursor-pointer rounded-lg overflow-hidden bg-zinc-900 border transition ${v.isOwn ? 'border-amber-600/40 hover:border-amber-500/70' : 'border-zinc-800 hover:border-red-500/50'}`}>
                      <div className="relative aspect-video bg-zinc-950">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        <Badge variant="outline" className={`absolute top-2 right-2 ${typeColor(v.type)} backdrop-blur`}>{typeIcon(v.type)}<span className="ml-1">{v.type}</span></Badge>
                        {v.isOwn && <Badge className="absolute top-2 left-2 bg-amber-500/90 text-zinc-950 border-0 font-bold text-[10px]">YOURS</Badge>}
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-zinc-500 mb-1">{v.channelTitle}</p>
                        <p className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">{v.title}</p>
                        <div className="flex justify-between text-xs text-zinc-400">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{fmtNum(v.views)}</span>
                          <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{fmtNum(v.likes)}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{fmtNum(v.comments)}</span>
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(v.publishedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-32 bg-zinc-800" />
            <Skeleton className="h-80 bg-zinc-800" />
          </div>
        )}
      </main>

      <Dialog open={!!selectedVideo} onOpenChange={(o) => !o && setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          {selectedVideo && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 flex items-start gap-2">
                  {selectedVideo.isOwn && <Badge className="bg-amber-500/90 text-zinc-950 border-0 font-bold text-[10px] mt-1">YOURS</Badge>}
                  {selectedVideo.title}
                </DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {selectedVideo.channelTitle} • {timeAgo(selectedVideo.publishedAt)} • <a href={selectedVideo.url} target="_blank" className="text-red-400 hover:underline">Open on YouTube</a>
                </DialogDescription>
              </DialogHeader>
              <img src={selectedVideo.thumbnail} className="w-full rounded-lg" alt="" />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Views" value={fmtNum(selectedVideo.views)} />
                <Stat label="Likes" value={fmtNum(selectedVideo.likes)} />
                <Stat label="Comments" value={fmtNum(selectedVideo.comments)} />
              </div>
              <Separator className="bg-zinc-800" />
              {videoAnalysis ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" />AI Comment Analysis</h3>
                    <p className="text-sm text-zinc-400 italic mb-3">"{videoAnalysis.summary}"</p>
                    <div className="space-y-2">
                      <SentimentBar label="Positive" pct={videoAnalysis.positivePct} color="bg-emerald-500" />
                      <SentimentBar label="Negative" pct={videoAnalysis.negativePct} color="bg-red-500" />
                      <SentimentBar label="Neutral" pct={videoAnalysis.neutralPct} color="bg-zinc-500" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-blue-300">💬 Top Discussion Points</h4>
                      <ul className="space-y-1.5">
                        {videoAnalysis.discussionPoints?.map((p, i) => <li key={i} className="text-xs text-zinc-300 flex gap-2"><span className="text-blue-400">→</span>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-orange-300">😣 Student Pain Points</h4>
                      <ul className="space-y-1.5">
                        {videoAnalysis.painPoints?.map((p, i) => <li key={i} className="text-xs text-zinc-300 flex gap-2"><span className="text-orange-400">→</span>{p}</li>)}
                      </ul>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={analyzeVideo} disabled={analyzing} className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800">
                    <RefreshCw className={`w-3.5 h-3.5 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                    Re-analyze comments
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-sm text-zinc-400 mb-4">No AI analysis yet for this video</p>
                  <Button onClick={analyzeVideo} disabled={analyzing} className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Sparkles className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                    {analyzing ? 'Analyzing comments…' : 'Analyze with AI'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone }) {
  const tones = {
    blue: 'from-blue-500/10 to-blue-500/0 border-blue-900/30 text-blue-400',
    green: 'from-emerald-500/10 to-emerald-500/0 border-emerald-900/30 text-emerald-400',
    amber: 'from-amber-500/10 to-amber-500/0 border-amber-900/30 text-amber-400',
    purple: 'from-purple-500/10 to-purple-500/0 border-purple-900/30 text-purple-400'
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]} bg-zinc-900/50`}>
      <CardContent className="pt-6">
        <div className={tones[tone].split(' ').pop()}>{icon}</div>
        <p className="text-xs text-zinc-400 uppercase tracking-wide mt-2">{label}</p>
        <p className="text-2xl font-bold mt-0.5 truncate">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function SentimentBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span className="text-zinc-400">{label}</span><span className="text-zinc-300 font-medium">{pct}%</span></div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden"><div className={`h-full ${color} transition-all`} style={{ width: pct + '%' }} /></div>
    </div>
  );
}

function fmtN(n) { if (!n) return '0'; if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1e3) return (n/1e3).toFixed(1)+'K'; return String(n); }

function KeywordMetrics({ metrics }) {
  if (!metrics) return null;
  const compColor = { low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30', high: 'text-red-400 bg-red-500/10 border-red-500/30' }[metrics.competition] || 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30';
  const oppColor = metrics.opportunityScore >= 40 ? 'text-emerald-400' : metrics.opportunityScore >= 25 ? 'text-amber-400' : 'text-zinc-400';
  return (
    <div className="mt-2.5 pt-2.5 border-t border-zinc-800 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Eye className="w-3 h-3" />
          <span>Top: <span className="text-zinc-200 font-semibold">{fmtN(metrics.topViews)}</span></span>
          <span className="text-zinc-600">•</span>
          <span>Avg: <span className="text-zinc-200 font-semibold">{fmtN(metrics.avgViews)}</span></span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <Badge variant="outline" className={compColor + ' text-[10px] h-4 px-1.5'}>{metrics.competition} comp</Badge>
        <span className="text-zinc-500">{fmtN(metrics.totalResults)} videos</span>
        <span className={`font-bold ${oppColor}`} title="Opportunity Score">★ {metrics.opportunityScore}/100</span>
      </div>
    </div>
  );
}
