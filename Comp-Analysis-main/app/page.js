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
import { 
  RefreshCw, Eye, ThumbsUp, MessageSquare, Flame, TrendingUp, Lightbulb, 
  Youtube, Radio, Film, Video, Clock, Sparkles, AlertCircle, Crown, 
  Search, Target, Zap, KeyRound, Copy, Check, BarChart3, ChevronRight, Menu, X,
  Microscope, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const NICHES = [
  { slug: 'neet', label: 'NEET', fullLabel: 'NEET Counselling', desc: 'Medical & AYUSH Admissions', color: 'from-emerald-500 to-teal-600', accent: 'text-emerald-400', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: Microscope },
  { slug: 'cuet', label: 'CUET', fullLabel: 'CUET Preparation', desc: 'UG Prep & College Admissions', color: 'from-red-500 to-pink-600', accent: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10', icon: BookOpen },
];

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
  const [niche, setNicheState] = useState('neet');
  const [data, setData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('views');
  const [activeTab, setActiveTab] = useState('overview');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Derived niche config
  const nicheConfig = NICHES.find(n => n.slug === niche) || NICHES[0];

  // Persist niche to localStorage
  const setNiche = (slug) => {
    setNicheState(slug);
    if (typeof window !== 'undefined') localStorage.setItem('selectedNiche', slug);
    setData(null);
    setVideos([]);
  };

  // Load saved niche on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedNiche');
      if (saved && NICHES.find(n => n.slug === saved)) setNicheState(saved);
    }
  }, []);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshingKw, setRefreshingKw] = useState(false);
  const [enrichingKw, setEnrichingKw] = useState(false);
  const [copiedKw, setCopiedKw] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchDashboard = useCallback(async (n = niche) => {
    try { const r = await fetch(`/api/dashboard?niche=${n}`); setData(await r.json()); }
    catch (e) { toast.error('Failed to load dashboard'); }
  }, [niche]);

  const fetchVideos = useCallback(async (type, n = niche) => {
    try {
      const base = type === 'all' ? `/api/videos?niche=${n}` : `/api/videos?niche=${n}&type=${type}`;
      const r = await fetch(base); const d = await r.json();
      setVideos(d.videos || []);
    } catch (e) { toast.error('Failed to load videos'); }
  }, [niche]);

  useEffect(() => {
    (async () => { setLoading(true); await Promise.all([fetchDashboard(niche), fetchVideos('all', niche)]); setLoading(false); })();
  }, [niche]);

  useEffect(() => { fetchVideos(filter, niche); }, [filter, niche]);

  // Poll for Sync Status: if status is syncing, poll every 5 seconds until idle.
  useEffect(() => {
    if (data?.syncStatus === 'syncing') {
      const interval = setInterval(async () => {
        try {
          const r = await fetch(`/api/dashboard?niche=${niche}`);
          const d = await r.json();
          if (d.syncStatus !== 'syncing') {
            toast.success(`Sync completed for ${nicheConfig.fullLabel}!`);
            setData(d);
            fetchVideos(filter, niche);
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [data?.syncStatus, niche, filter, fetchVideos, nicheConfig.fullLabel]);

  // Automatic sync every 1 minute for BOTH NEET & CUET niches.
  useEffect(() => {
    const triggerAutoSync = async () => {
      console.log('[auto-sync] Triggering background sync for both NEET and CUET...');
      try {
        await Promise.all([
          fetch('/api/sync?niche=neet', { method: 'POST' }),
          fetch('/api/sync?niche=cuet', { method: 'POST' })
        ]);
        // Trigger dashboard check for current niche to update UI status
        const r = await fetch(`/api/dashboard?niche=${niche}`);
        const d = await r.json();
        setData(d);
      } catch (err) {
        console.error('[auto-sync] trigger error:', err);
      }
    };

    const interval = setInterval(triggerAutoSync, 60000);
    return () => clearInterval(interval);
  }, [niche]);

  const handleSync = async (silent = false) => {
    setSyncing(true);
    if (!silent) toast.info(`Sync initiated in background for ${nicheConfig.fullLabel}…`);
    try {
      const r = await fetch(`/api/sync?niche=${niche}`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        if (!silent) toast.success(`Background sync triggered successfully!`);
        // Refresh dashboard status
        fetchDashboard(niche);
      } else {
        toast.error(d.error || 'Sync failed');
      }
    } catch (e) { 
      toast.error('Sync failed: ' + e.message); 
    }
    setSyncing(false);
  };

  const refreshKeywords = async () => {
    setRefreshingKw(true);
    try {
      const r = await fetch(`/api/keywords/regenerate?niche=${niche}`, { method: 'POST' });
      const d = await r.json();
      if (d.keywords) { toast.success('Keywords refreshed'); fetchDashboard(niche); }
    } catch (e) { toast.error('Failed to refresh keywords'); }
    setRefreshingKw(false);
  };

  const enrichKeywords = async () => {
    setEnrichingKw(true);
    toast.info('Fetching real YouTube data for keywords… (~5s)');
    try {
      const r = await fetch(`/api/keywords/enrich?niche=${niche}`, { method: 'POST' });
      const d = await r.json();
      if (d.success) { toast.success(`Enriched ${d.enriched} keywords with real YouTube metrics`); fetchDashboard(niche); }
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
    try { const r = await fetch(`/api/videos/${v.videoId}/analysis?niche=${niche}`); const d = await r.json(); if (d.analysis) setVideoAnalysis(d.analysis); } catch (e) {}
  };

  const analyzeVideo = async () => {
    if (!selectedVideo) return;
    setAnalyzing(true);
    try {
      const r = await fetch(`/api/videos/${selectedVideo.videoId}/analyze?niche=${niche}`, { method: 'POST' });
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

  // Client side search and sort for videos
  const filteredAndSortedVideos = useMemo(() => {
    let result = [...videos];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(q) || v.channelTitle.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'likes') return b.likes - a.likes;
      if (sortBy === 'comments') return b.comments - a.comments;
      if (sortBy === 'date') return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return 0;
    });
    return result;
  }, [videos, searchQuery, sortBy]);

  // Derived Trend statistics
  const trendingStats = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    const sortedByViews = [...videos].sort((a, b) => b.views - a.views);
    const topVideo = sortedByViews[0];

    // Find the most discussed video (highest comments)
    const mostDiscussed = [...videos].sort((a, b) => b.comments - a.comments)[0];

    // Simple common word detector in titles to get a trending keyword
    const words = videos
      .flatMap(v => v.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/))
      .filter(w => w.length > 4 && !['video', 'class', 'counselling', 'preparation', 'neet', 'cuet', 'admissions', 'college', 'about', 'students'].includes(w));
    const counts = {};
    let topWord = 'N/A';
    let maxCount = 0;
    words.forEach(w => {
      counts[w] = (counts[w] || 0) + 1;
      if (counts[w] > maxCount) {
        maxCount = counts[w];
        topWord = w;
      }
    });

    return {
      topVideo,
      mostDiscussed,
      popularWord: topWord !== 'N/A' ? `#${topWord}` : 'N/A',
      activeNiche: data?.niche || 'CUET / Admissions'
    };
  }, [videos, data]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-950 text-white font-sans antialiased selection:bg-red-500/30 selection:text-white">
      {/* Dynamic Background Gradients — color changes with niche */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-700 ${niche === 'neet' ? 'bg-gradient-to-br from-emerald-600/10 to-transparent' : 'bg-gradient-to-br from-red-600/10 to-transparent'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] transition-colors duration-700 ${niche === 'neet' ? 'bg-gradient-to-tr from-teal-600/10 to-transparent' : 'bg-gradient-to-tr from-pink-600/10 to-transparent'}`} />
      </div>

      {/* Sidebar - Desktop Layout */}
      <aside className="hidden md:flex flex-col w-64 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-xl p-5 h-screen sticky top-0 justify-between shrink-0 z-30">
        <div className="space-y-5">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${nicheConfig.color} flex items-center justify-center shadow-lg transition-all duration-500`}>
              <Youtube className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">Competitor Pulse</h1>
              <p className={`text-[10px] font-semibold transition-colors duration-300 ${nicheConfig.accent}`}>{nicheConfig.fullLabel}</p>
            </div>
          </div>

          {/* Niche Switcher */}
          <NicheSwitcher currentNiche={niche} onChange={setNiche} />

          <Separator className="bg-zinc-900" />

          {/* Navigation Items */}
          <nav className="space-y-1">
            <SidebarBtn active={activeTab === 'overview'} icon={<BarChart3 className="w-4 h-4" />} label="Overview & Rankings" onClick={() => setActiveTab('overview')} accent={nicheConfig.accent} />
            <SidebarBtn active={activeTab === 'videos'} icon={<Video className="w-4 h-4" />} label="Video Explorer" onClick={() => setActiveTab('videos')} accent={nicheConfig.accent} />
            <SidebarBtn active={activeTab === 'keywords'} icon={<KeyRound className="w-4 h-4" />} label="AI Keywords" onClick={() => setActiveTab('keywords')} accent={nicheConfig.accent} />
            <SidebarBtn active={activeTab === 'ideas'} icon={<Lightbulb className="w-4 h-4" />} label="AI Content Ideas" onClick={() => setActiveTab('ideas')} accent={nicheConfig.accent} />
          </nav>
        </div>

        {/* Footer */}
        <div className="space-y-3">
          {data?.lastSyncAt && (
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 backdrop-blur">
              <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <Clock className="w-3 h-3" />
                <span>Synced {timeAgo(data.lastSyncAt)}</span>
              </div>
              <p className={`text-[10px] mt-1 font-medium ${nicheConfig.accent}`}>{nicheConfig.desc} • IN</p>
            </div>
          )}
          <div className="text-[10px] text-zinc-600 text-center">
  <div>v1.3.0 • Tool Created by Puneet Kumar</div>

  <a
    href="https://wa.me/918979497220"
    target="_blank"
    rel="noopener noreferrer"
    className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-md bg-teal-500 text-black hover:bg-teal-400 transition"
  >
    Contact Me
  </a>
</div>
</div>
</aside>

      {/* Header - Mobile Layout */}
      <header className="md:hidden flex items-center justify-between border-b border-zinc-900 bg-zinc-950/85 backdrop-blur-xl px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${nicheConfig.color} flex items-center justify-center shadow-lg transition-all duration-500`}>
            <Youtube className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Competitor Pulse</h1>
            <p className={`text-[9px] font-semibold ${nicheConfig.accent}`}>{nicheConfig.fullLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Dropdown Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-[57px] left-0 right-0 bg-zinc-950/98 border-b border-zinc-900 p-4 space-y-3 z-40 backdrop-blur-2xl">
          <NicheSwitcher currentNiche={niche} onChange={(s) => { setNiche(s); setMobileMenuOpen(false); }} />
          <Separator className="bg-zinc-900" />
          <SidebarBtn active={activeTab === 'overview'} icon={<BarChart3 className="w-4 h-4" />} label="Overview & Rankings" onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} accent={nicheConfig.accent} />
          <SidebarBtn active={activeTab === 'videos'} icon={<Video className="w-4 h-4" />} label="Video Explorer" onClick={() => { setActiveTab('videos'); setMobileMenuOpen(false); }} accent={nicheConfig.accent} />
          <SidebarBtn active={activeTab === 'keywords'} icon={<KeyRound className="w-4 h-4" />} label="AI Keywords" onClick={() => { setActiveTab('keywords'); setMobileMenuOpen(false); }} accent={nicheConfig.accent} />
          <SidebarBtn active={activeTab === 'ideas'} icon={<Lightbulb className="w-4 h-4" />} label="AI Content Ideas" onClick={() => { setActiveTab('ideas'); setMobileMenuOpen(false); }} accent={nicheConfig.accent} />
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Upper TopBar with Primary Sync actions */}
        <header className="border-b border-zinc-900 bg-zinc-950/50 p-6 hidden md:flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight capitalize">{activeTab} Dashboard</h2>
            <p className="text-xs text-zinc-500">Real-time competitor tracking, AI analytics & SEO intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            {data?.lastSyncAt && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <Clock className="w-3.5 h-3.5" /> Synced {timeAgo(data.lastSyncAt)}
              </div>
            )}
            <Button onClick={() => handleSync()} disabled={syncing || data?.syncStatus === 'syncing'} className="bg-gradient-to-r from-red-600 via-pink-600 to-indigo-600 hover:opacity-95 font-medium transition duration-200 shadow-md shadow-red-500/10">
              <RefreshCw className={`w-4 h-4 mr-2 ${(syncing || data?.syncStatus === 'syncing') ? 'animate-spin' : ''}`} />
              {(syncing || data?.syncStatus === 'syncing') ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-grow p-6 space-y-8 max-w-7xl w-full mx-auto">
          {/* Niche Banner strip under topbar */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${nicheConfig.border} ${nicheConfig.bg} w-fit`}>
            <nicheConfig.icon className={`w-3.5 h-3.5 ${nicheConfig.accent}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${nicheConfig.accent}`}>{nicheConfig.fullLabel}</span>
            <span className="text-xs text-zinc-500">— {nicheConfig.desc}</span>
          </div>
          {!loading && (!data?.lastSyncAt || data.totalVideos === 0) && (
            <Card className="bg-zinc-900/30 border-zinc-800/80 backdrop-blur-md border-dashed">
              <CardContent className="py-20 flex flex-col items-center text-center">
                <Sparkles className="w-14 h-14 text-indigo-500 mb-5 animate-pulse" />
                <h2 className="text-2xl font-bold mb-2">Ready when you are 🚀</h2>
                <p className="text-zinc-400 mb-8 max-w-lg leading-relaxed text-sm">
                  Click <span className="text-white font-semibold">Sync Now</span> to fetch the last 48 hours from all channels, run AI comment analysis, and generate keyword research. Takes ~1 minute.
                </p>
                <Button size="lg" onClick={() => handleSync()} disabled={syncing || data?.syncStatus === 'syncing'} className="bg-gradient-to-r from-red-600 to-pink-600 px-8">
                  <RefreshCw className={`w-4 h-4 mr-2 ${(syncing || data?.syncStatus === 'syncing') ? 'animate-spin' : ''}`} />
                  {(syncing || data?.syncStatus === 'syncing') ? 'Syncing…' : 'Run First Sync'}
                </Button>
              </CardContent>
            </Card>
          )}

          {data?.lastSyncAt && (
            <>
              {/* === VIEW: OVERVIEW & RANKINGS === */}
              {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<Video className="w-5 h-5 text-blue-400" />} label="Total Videos" value={data.totalVideos} sub="last 48h · all channels" tone="blue" />
                    <StatCard icon={<Eye className="w-5 h-5 text-emerald-400" />} label="Total Views" value={fmtNum(data.totalViews || 0)} sub="combined views" tone="green" />
                    <StatCard icon={<Crown className="w-5 h-5 text-amber-400" />} label="Your Rank" value={myRank ? `#${myRank.rank} / ${myRank.total}` : '—'} sub={myRank ? myRank.name : 'add your channel'} tone="amber" />
                    <StatCard icon={<KeyRound className="w-5 h-5 text-purple-400" />} label="Keywords" value={(data.keywords?.trending?.length || 0) + (data.keywords?.opportunity?.length || 0)} sub="trending + gaps" tone="purple" />
                  </div>

                  {/* Benchmark panel & Ranking list */}
                  {gapVsTop && (
                    <div className="grid lg:grid-cols-3 gap-6">
                      <Card className="lg:col-span-2 bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-500 to-red-500" />
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" /> Head-to-Head Benchmark</CardTitle>
                          <CardDescription className="text-zinc-500">Your performance vs the top competitor channel in the last 48h</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid sm:grid-cols-3 gap-4 items-center border-b border-zinc-900 pb-6">
                            <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/60 hover:border-amber-500/20 transition duration-300">
                              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">Your Channel</p>
                              <p className="text-md font-semibold truncate text-zinc-100">{myRank.name}</p>
                              <p className="text-2xl font-bold text-amber-400 mt-1">{fmtNum(gapVsTop.myViews)}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">{myRank.videos} videos posted</p>
                            </div>
                            <div className="text-center py-2">
                              <p className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">{gapVsTop.pct}%</p>
                              <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">of top views</p>
                              <div className="inline-block mt-3 px-3 py-1 rounded-full bg-red-500/10 text-[10px] text-red-400 font-semibold border border-red-500/20">
                                {fmtNum(gapVsTop.gap)} views gap
                              </div>
                            </div>
                            <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800/60 hover:border-red-500/20 transition duration-300">
                              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1">Top Competitor</p>
                              <p className="text-md font-semibold truncate text-zinc-100">{gapVsTop.topName}</p>
                              <p className="text-2xl font-bold text-red-400 mt-1">{fmtNum(gapVsTop.topViews)}</p>
                              <p className="text-[10px] text-zinc-500 mt-1">Rank #1 (last 48h)</p>
                            </div>
                          </div>

                          <div className="mt-5 space-y-2">
                            <h4 className="text-xs font-semibold text-zinc-400 px-1 uppercase tracking-wider">All Tracks & Standings</h4>
                            <div className="space-y-1">
                              {data.benchmark.map(c => (
                                <div key={c.channelId} className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border transition duration-200 ${c.isOwn ? 'bg-amber-500/5 border-amber-500/30 shadow-md shadow-amber-500/5' : 'bg-zinc-950/40 border-zinc-900/60 hover:border-zinc-800'}`}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span className={`text-xs font-bold w-6 ${c.isOwn ? 'text-amber-400' : 'text-zinc-500'}`}>#{c.rank}</span>
                                    <span className={`text-sm truncate ${c.isOwn ? 'text-amber-200 font-semibold' : 'text-zinc-300'}`}>{c.title}</span>
                                    {c.isOwn && <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] h-4 font-bold">YOURS</Badge>}
                                  </div>
                                  <div className="flex gap-4 text-xs text-zinc-400 flex-shrink-0 items-center">
                                    <span>{c.videosCount} vids</span>
                                    <span className="text-zinc-200 font-semibold w-16 text-right">{fmtNum(c.totalViews48h)} views</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Trend & Insights Panel */}
                      {trendingStats && (
                        <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md flex flex-col justify-between">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Pulse Insights</CardTitle>
                            <CardDescription className="text-zinc-500">Derived from 48h competitor metadata</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-3.5 rounded-lg bg-zinc-950/50 border border-zinc-900">
                              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Fastest Growing Competitor Video</p>
                              <p className="text-xs font-semibold text-zinc-200 mt-1 line-clamp-1">{trendingStats.topVideo?.title}</p>
                              <div className="flex justify-between items-center mt-2.5">
                                <span className="text-[10px] text-red-400">{trendingStats.topVideo?.channelTitle}</span>
                                <span className="text-xs font-bold text-zinc-300">{fmtNum(trendingStats.topVideo?.views || 0)} views</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-lg bg-zinc-950/50 border border-zinc-900">
                              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Most Commented & Discussed Topic</p>
                              <p className="text-xs font-semibold text-zinc-200 mt-1 line-clamp-1">{trendingStats.mostDiscussed?.title}</p>
                              <div className="flex justify-between items-center mt-2.5">
                                <span className="text-[10px] text-zinc-400">{trendingStats.mostDiscussed?.channelTitle}</span>
                                <span className="text-xs font-bold text-zinc-300">{fmtNum(trendingStats.mostDiscussed?.comments || 0)} comments</span>
                              </div>
                            </div>
                            <div className="p-3.5 rounded-lg bg-zinc-950/50 border border-zinc-900">
                              <p className="text-[10px] text-zinc-500 uppercase font-semibold">Top Recurring Focus Keyword</p>
                              <div className="flex items-center justify-between mt-1.5">
                                <span className="text-sm font-bold text-indigo-400">{trendingStats.popularWord}</span>
                                <span className="text-[10px] text-zinc-500">Found in titles</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {/* Channel chart */}
                  {chartData.length > 0 && (
                    <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Competitor Engagement Comparison</CardTitle>
                        <CardDescription className="text-zinc-500">Views, likes, and comments per channel • <span className="text-amber-400">Amber color = your channels</span></CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 40 }}>
                              <defs>
                                <linearGradient id="colorOwn" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.2}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" />
                              <XAxis dataKey="name" stroke="#71717a" angle={-15} textAnchor="end" fontSize={10} />
                              <YAxis stroke="#71717a" tickFormatter={fmtNum} fontSize={10} />
                              <Tooltip 
                                contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 8 }} 
                                formatter={(v) => fmtNum(v)} 
                                labelStyle={{ color: '#a1a1aa', fontWeight: 'bold' }}
                              />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                              <Bar dataKey="Views" name="Views (last 48h)" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, i) => (
                                  <Cell key={i} fill={entry.isOwn ? 'url(#colorOwn)' : 'url(#colorComp)'} />
                                ))}
                              </Bar>
                              <Bar dataKey="Likes" name="Likes" fill="url(#colorLikes)" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Comments" name="Comments" fill="url(#colorComments)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* === VIEW: VIDEO EXPLORER === */}
              {activeTab === 'videos' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Top 5 Videos Banner */}
                  {data.topVideos?.length > 0 && (
                    <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Competitor Top 5 Videos of the Day</CardTitle>
                        <CardDescription className="text-zinc-500">Highest viewed competitor videos (excludes own channels)</CardDescription>
                      </CardHeader>
                      <CardContent className="grid md:grid-cols-5 gap-4">
                        {data.topVideos.map((v, i) => (
                          <div key={v.videoId} onClick={() => openVideo(v)} className="group cursor-pointer rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-orange-500/40 transition duration-200 overflow-hidden flex flex-col justify-between">
                            <div className="relative aspect-video">
                              <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-orange-500/90 flex items-center justify-center text-xs font-black text-zinc-950">
                                {i + 1}
                              </div>
                            </div>
                            <div className="p-3 space-y-2 flex-grow flex flex-col justify-between">
                              <div>
                                <p className="text-[9px] text-zinc-500 font-semibold uppercase truncate">{v.channelTitle}</p>
                                <p className="text-xs font-semibold line-clamp-2 mt-1 leading-snug">{v.title}</p>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-900">
                                <span className="font-semibold">{fmtNum(v.views)} views</span>
                                <span className="text-zinc-600">{timeAgo(v.publishedAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* All Content explorer */}
                  <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md">
                    <CardHeader>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle>Content Feed</CardTitle>
                          <CardDescription className="text-zinc-500">Filter and discover trends. Click any video card for comments AI analysis.</CardDescription>
                        </div>

                        {/* Search & Sort Panel */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search videos/channels..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 rounded-md py-1.5 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 w-48 transition"
                            />
                          </div>

                          {/* Sorting */}
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-xs text-zinc-300 focus:outline-none focus:border-red-500/60 transition cursor-pointer"
                          >
                            <option value="views">Sort by Views</option>
                            <option value="likes">Sort by Likes</option>
                            <option value="comments">Sort by Comments</option>
                            <option value="date">Sort by Date</option>
                          </select>

                          {/* Format Filter Tabs */}
                          <Tabs value={filter} onValueChange={setFilter}>
                            <TabsList className="bg-zinc-950 border border-zinc-800">
                              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                              <TabsTrigger value="video" className="text-xs"><Video className="w-3 h-3 mr-1" />Long</TabsTrigger>
                              <TabsTrigger value="short" className="text-xs"><Film className="w-3 h-3 mr-1" />Shorts</TabsTrigger>
                              <TabsTrigger value="live" className="text-xs"><Radio className="w-3 h-3 mr-1" />Live</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {filteredAndSortedVideos.length === 0 ? (
                        <p className="text-sm text-zinc-500 text-center py-12">No matching content found in last 48h</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {filteredAndSortedVideos.map(v => (
                            <div key={v.videoId} onClick={() => openVideo(v)} className={`group cursor-pointer rounded-lg overflow-hidden bg-zinc-950/40 border transition duration-300 flex flex-col justify-between hover:-translate-y-0.5 ${v.isOwn ? 'border-amber-600/30 hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/5' : 'border-zinc-900 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/5'}`}>
                              <div className="relative aspect-video bg-zinc-950">
                                <img src={v.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                                <Badge variant="outline" className={`absolute top-2 right-2 ${typeColor(v.type)} backdrop-blur h-5 text-[9px]`}>{typeIcon(v.type)}<span className="ml-1 uppercase">{v.type}</span></Badge>
                                {v.isOwn && <Badge className="absolute top-2 left-2 bg-amber-500 text-zinc-950 border-0 font-bold text-[9px] px-1.5 h-4.5">YOURS</Badge>}
                              </div>
                              <div className="p-3.5 space-y-2.5 flex-grow flex flex-col justify-between">
                                <div>
                                  <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider truncate">{v.channelTitle}</p>
                                  <p className="text-xs font-semibold text-zinc-200 line-clamp-2 mt-1 leading-snug">{v.title}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[11px] text-zinc-400">
                                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{fmtNum(v.views)}</span>
                                    <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" />{fmtNum(v.likes)}</span>
                                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{fmtNum(v.comments)}</span>
                                  </div>
                                  <p className="text-[9px] text-zinc-600 font-medium text-right">{timeAgo(v.publishedAt)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* === VIEW: AI KEYWORD RESEARCH === */}
              {activeTab === 'keywords' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500" />
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <CardTitle className="flex items-center gap-2"><Search className="w-5 h-5 text-indigo-400" /> AI Keyword Research</CardTitle>
                          <CardDescription className="text-zinc-500">
                            Find high opportunity content targets based on student questions + search intent.
                            {data.keywords?.enrichedAt && <span className="ml-2 text-emerald-400 font-bold">• Real YouTube metrics loaded</span>}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={enrichKeywords} disabled={enrichingKw} className="bg-emerald-950/30 border-emerald-700/40 hover:bg-emerald-900/30 text-emerald-300">
                            <Zap className={`w-3.5 h-3.5 mr-2 ${enrichingKw ? 'animate-pulse' : ''}`} />
                            {enrichingKw ? 'Fetching…' : (data.keywords?.enrichedAt ? 'Re-fetch YT Data' : 'Enrich w/ YouTube Data')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={refreshKeywords} disabled={refreshingKw} className="bg-zinc-900 border-zinc-700 hover:text-white">
                            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshingKw ? 'animate-spin' : ''}`} />Refresh
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="trending">
                        <TabsList className="bg-zinc-950 border border-zinc-800 mb-6">
                          <TabsTrigger value="trending"><Flame className="w-3.5 h-3.5 mr-1.5 text-orange-400" />Trending</TabsTrigger>
                          <TabsTrigger value="opportunity"><Target className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />Opportunities</TabsTrigger>
                          <TabsTrigger value="pain"><Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />Pain Points</TabsTrigger>
                          <TabsTrigger value="longtail"><KeyRound className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />Long-tail</TabsTrigger>
                        </TabsList>
                        <TabsContent value="trending">
                          <div className="grid md:grid-cols-2 gap-4">
                            {(data.keywords?.trending || []).map((k, i) => (
                              <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-4 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-indigo-700/50 transition duration-200 group relative overflow-hidden">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-sm text-zinc-100 flex-1 group-hover:text-indigo-300 transition">{k.keyword}</p>
                                  {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline" className={intentColor(k.intent) + ' text-[10px]'}>{k.intent}</Badge>
                                  <div className="flex items-center gap-0.5" title={`Popularity: ${k.frequency}/10`}>
                                    {Array.from({ length: 10 }).map((_, idx) => (
                                      <div key={idx} className={`w-1 h-3 rounded-sm ${idx < (k.frequency || 0) ? 'bg-indigo-400' : 'bg-zinc-800'}`} />
                                    ))}
                                  </div>
                                </div>
                                {k.whyHot && <p className="text-xs text-zinc-500 mt-2.5">🔥 {k.whyHot}</p>}
                                <KeywordMetrics metrics={k.metrics} />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="opportunity">
                          <div className="grid md:grid-cols-2 gap-4">
                            {(data.keywords?.opportunity || []).map((k, i) => (
                              <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-4 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-emerald-700/50 transition duration-200 group">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-sm text-zinc-100 flex-1 group-hover:text-emerald-300 transition">{k.keyword}</p>
                                  {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                                </div>
                                <Badge variant="outline" className={priorityColor(k.priority) + ' mb-2 h-5 text-[9px] uppercase tracking-wide'}>{k.priority} priority</Badge>
                                <p className="text-xs text-zinc-400 mb-2"><span className="text-red-400 font-semibold">Gap:</span> {k.gap}</p>
                                <p className="text-xs text-emerald-300/95 font-medium"><Lightbulb className="w-3 h-3 inline mr-1 text-yellow-400" />{k.videoAngle}</p>
                                <KeywordMetrics metrics={k.metrics} />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="pain">
                          <div className="grid md:grid-cols-2 gap-4">
                            {(data.keywords?.painPointKeywords || []).map((k, i) => (
                              <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-4 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-orange-700/50 transition duration-200 group">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-sm text-zinc-100 flex-1 group-hover:text-orange-300 transition">{k.keyword}</p>
                                  {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                                </div>
                                <p className="text-xs text-orange-300 mb-2 font-medium">🎯 {k.studentNeed}</p>
                                <p className="text-xs text-zinc-400">💡 {k.videoAngle}</p>
                                <KeywordMetrics metrics={k.metrics} />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                        <TabsContent value="longtail">
                          <div className="grid md:grid-cols-2 gap-4">
                            {(data.keywords?.longTail || []).map((k, i) => (
                              <div key={i} onClick={() => copyKw(k.keyword)} className="cursor-pointer p-4 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-purple-700/50 transition duration-200 group">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-semibold text-sm text-zinc-100 flex-1 group-hover:text-purple-300 transition">{k.keyword}</p>
                                  {copiedKw === k.keyword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />}
                                </div>
                                <p className="text-xs text-zinc-500 font-medium">Intent: <span className="text-zinc-400">{k.searchIntent}</span></p>
                                <KeywordMetrics metrics={k.metrics} />
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* === VIEW: AI CONTENT IDEAS === */}
              {activeTab === 'ideas' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Card className="bg-zinc-900/40 border-zinc-800/80 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 to-pink-500" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" /> Strategic Content Recommendations</CardTitle>
                      <CardDescription className="text-zinc-500">AI-generated Hinglish video outlines tailored to exploit competitors' content gaps</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(data.ideas || []).map((idea, i) => (
                          <div key={i} className="p-4 rounded-lg bg-zinc-950/40 border border-zinc-900 hover:border-purple-600/50 transition duration-300 flex flex-col justify-between h-56 hover:shadow-lg hover:shadow-purple-500/5">
                            <div>
                              <div className="flex items-start gap-2 mb-2">
                                <Sparkles className="w-4.5 h-4.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs font-bold leading-snug text-zinc-100">{idea.title}</p>
                              </div>
                              <p className="text-[11px] text-zinc-400 italic mb-3">"{idea.hook}"</p>
                              <p className="text-[10px] text-zinc-500 leading-relaxed"><span className="text-zinc-400 font-medium">Why:</span> {idea.whyItWorks}</p>
                            </div>
                            {idea.targetKeyword && (
                              <Badge variant="outline" className="text-[9px] border-purple-800/50 text-purple-300 bg-purple-950/10 w-fit mt-3 uppercase tracking-wider font-semibold">
                                {idea.targetKeyword}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-32 bg-zinc-900/40" />
              <Skeleton className="h-80 bg-zinc-900/40" />
            </div>
          )}
        </main>
      </div>

      {/* Video Detail Modal Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={(o) => !o && setSelectedVideo(null)}>
        <DialogContent className="max-w-3xl bg-zinc-950 border border-zinc-900 text-white max-h-[90vh] overflow-y-auto backdrop-blur-3xl shadow-2xl">
          {selectedVideo && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="pr-8 flex items-start gap-2 text-md font-bold tracking-tight">
                  {selectedVideo.isOwn && <Badge className="bg-amber-500 text-zinc-950 border-0 font-bold text-[9px] px-1.5 h-4.5 mt-1 shrink-0">YOURS</Badge>}
                  <span>{selectedVideo.title}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-1 flex items-center justify-between flex-wrap gap-2 pt-1">
                  <span>{selectedVideo.channelTitle} • {timeAgo(selectedVideo.publishedAt)}</span>
                  <a href={selectedVideo.url} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 font-semibold hover:underline flex items-center gap-1">
                    Open on YouTube <ChevronRight className="w-3 h-3" />
                  </a>
                </DialogDescription>
              </DialogHeader>

              <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-900">
                <img src={selectedVideo.thumbnail} className="w-full h-full object-cover" alt="" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat label="Views" value={fmtNum(selectedVideo.views)} />
                <Stat label="Likes" value={fmtNum(selectedVideo.likes)} />
                <Stat label="Comments" value={fmtNum(selectedVideo.comments)} />
              </div>

              <Separator className="bg-zinc-900" />

              {videoAnalysis ? (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      AI Comment Insights
                    </h3>
                    <p className="text-sm text-zinc-300 italic bg-zinc-900/50 p-3 rounded-lg border border-zinc-900">"{videoAnalysis.summary}"</p>
                    <div className="grid grid-cols-3 gap-4 mt-4 bg-zinc-900/20 p-3.5 rounded-lg border border-zinc-900">
                      <SentimentBar label="Positive" pct={videoAnalysis.positivePct} color="bg-emerald-500" />
                      <SentimentBar label="Neutral" pct={videoAnalysis.neutralPct} color="bg-zinc-500" />
                      <SentimentBar label="Negative" pct={videoAnalysis.negativePct} color="bg-red-500" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-lg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-3.5">💬 Top Discussions</h4>
                      <ul className="space-y-2">
                        {videoAnalysis.discussionPoints?.map((p, i) => (
                          <li key={i} className="text-xs text-zinc-300 flex items-start gap-2.5">
                            <span className="text-blue-400 font-bold shrink-0 mt-0.5">•</span>
                            <span className="leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 rounded-lg">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-orange-300 mb-3.5">😣 Student Gaps & Frustrations</h4>
                      <ul className="space-y-2">
                        {videoAnalysis.painPoints?.map((p, i) => (
                          <li key={i} className="text-xs text-zinc-300 flex items-start gap-2.5">
                            <span className="text-orange-400 font-bold shrink-0 mt-0.5">•</span>
                            <span className="leading-relaxed">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" onClick={analyzeVideo} disabled={analyzing} className="bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-xs">
                    <RefreshCw className={`w-3 h-3 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                    Re-analyze comments
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 bg-zinc-900/20 border border-dashed border-zinc-850 rounded-lg">
                  <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                  <p className="text-xs text-zinc-400 mb-4">No AI comment analysis computed for this video yet</p>
                  <Button onClick={analyzeVideo} disabled={analyzing} className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 text-xs">
                    <Sparkles className={`w-3.5 h-3.5 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                    {analyzing ? 'Analyzing comments…' : 'Analyze with AI'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Niche Switcher Component =====
function NicheSwitcher({ currentNiche, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 p-0.5 gap-0.5">
      {NICHES.map(n => {
        const isActive = currentNiche === n.slug;
        return (
          <button
            key={n.slug}
            onClick={() => onChange(n.slug)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all duration-300 ${
              isActive
                ? `bg-gradient-to-br ${n.color} text-white shadow-sm`
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
            }`}
          >
            <n.icon className="w-3 h-3" />
            {n.label}
          </button>
        );
      })}
    </div>
  );
}

// Helper Buttons / Components
function SidebarBtn({ active, icon, label, onClick, accent = 'text-red-400' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition duration-200 ${
        active 
          ? `bg-zinc-900/60 text-white border-l-2 ${accent.replace('text-', 'border-')} shadow-sm` 
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40'
      }`}
    >
      <span className={active ? accent : 'text-zinc-500'}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function StatCard({ icon, label, value, sub, tone }) {
  const tones = {
    blue: 'from-blue-500/5 to-blue-500/0 border-blue-950/40 text-blue-400 hover:border-blue-500/20',
    green: 'from-emerald-500/5 to-emerald-500/0 border-emerald-950/40 text-emerald-400 hover:border-emerald-500/20',
    amber: 'from-amber-500/5 to-amber-500/0 border-amber-950/40 text-amber-400 hover:border-amber-500/20',
    purple: 'from-purple-500/5 to-purple-500/0 border-purple-950/40 text-purple-400 hover:border-purple-500/20'
  };
  return (
    <Card className={`bg-gradient-to-br ${tones[tone]} bg-zinc-900/30 backdrop-blur-md hover:scale-[1.01] transition duration-300`}>
      <CardContent className="pt-6">
        <div className="inline-flex p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-900">{icon}</div>
        <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider mt-3">{label}</p>
        <p className="text-2xl font-bold mt-0.5 truncate text-zinc-100">{value}</p>
        <p className="text-[10px] text-zinc-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-zinc-900 border border-zinc-900 rounded-lg p-3 text-center">
      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{label}</p>
      <p className="text-md font-bold text-zinc-100 mt-0.5">{value}</p>
    </div>
  );
}

function SentimentBar({ label, pct, color }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1 font-semibold">
        <span className="text-zinc-500 uppercase">{label}</span>
        <span className="text-zinc-300">{pct}%</span>
      </div>
      <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function fmtN(n) { 
  if (!n) return '0'; 
  if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; 
  if (n >= 1e3) return (n/1e3).toFixed(1)+'K'; 
  return String(n); 
}

function KeywordMetrics({ metrics }) {
  if (!metrics) return null;
  const compColor = { 
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', 
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20', 
    high: 'text-red-400 bg-red-500/10 border-red-500/20' 
  }[metrics.competition] || 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30';
  
  const oppColor = metrics.opportunityScore >= 40 ? 'text-emerald-400' : metrics.opportunityScore >= 25 ? 'text-amber-400' : 'text-zinc-500';
  
  return (
    <div className="mt-3.5 pt-3.5 border-t border-zinc-900 space-y-2.5">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
          <Eye className="w-3 h-3 text-zinc-500" />
          <span>Top: <span className="text-zinc-200 font-semibold">{fmtN(metrics.topViews)}</span></span>
          <span className="text-zinc-700">•</span>
          <span>Avg: <span className="text-zinc-200 font-semibold">{fmtN(metrics.avgViews)}</span></span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <Badge variant="outline" className={compColor + ' text-[9px] h-4.5 px-1.5 font-bold uppercase tracking-wider'}>{metrics.competition} comp</Badge>
        <span className="text-zinc-500 font-medium">{fmtN(metrics.totalResults)} videos</span>
        <span className={`font-bold text-xs ${oppColor}`} title="Opportunity Score">★ {metrics.opportunityScore}/100</span>
      </div>
    </div>
  );
}
