import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Users, Play, Pause, Calendar, Headphones, Search, User, X, Swords, Radio, Flame, Mic, Music, Plus } from 'lucide-react';
import DiscoverCreatorsModal from './DiscoverCreatorsModal';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BattleInviteModal from './BattleInviteModal';
import BattleNotification from './BattleNotification';
import BattleReelScroller from './BattleReelScroller';
import { getAllDemoLiveHosts, isDemoSessionId, getDemoSessionById } from '@/config/demoSessions';

interface LiveHost {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  listener_count: number;
  host_name?: string;
  host_avatar?: string;
  category?: string;
  cover_image_url?: string;
}

interface ScheduleItem {
  id: string;
  host_id: string;
  host_name?: string;
  host_avatar?: string;
  title: string;
  description?: string;
  scheduled_at: string;
}

interface EpisodeItem {
  id: string;
  host_id: string;
  host_name?: string;
  host_avatar?: string;
  title: string;
  cover_image_url?: string;
  audio_url?: string;
  play_count: number;
  duration_ms: number;
  isRealUser?: boolean;
}

interface BattleSession {
  id: string;
  host_id: string;
  opponent_id: string;
  status: string;
  host_name?: string;
  host_avatar?: string;
  opponent_name?: string;
  opponent_avatar?: string;
  duration_seconds: number;
  started_at?: string;
}

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

const formatScheduleTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Starting soon';
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
};

const PodcastFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveHosts, setLiveHosts] = useState<LiveHost[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'recommended' | 'followed'>('recommended');
  

  const [currentEpisode, setCurrentEpisode] = useState<EpisodeItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showBattleInviteModal, setShowBattleInviteModal] = useState(false);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [activeBattles, setActiveBattles] = useState<BattleSession[]>([]);
  const [showDiscoverCreators, setShowDiscoverCreators] = useState(false);
  const [sidebarCreators, setSidebarCreators] = useState<{user_id: string; full_name: string | null; username: string | null; avatar_url: string | null}[]>([]);

  const filteredHosts = searchQuery.trim()
    ? liveHosts.filter(h =>
        h.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : liveHosts;

  // Fetch active battles
  const fetchActiveBattles = async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: battles, error } = await supabase
        .from('podcast_battles')
        .select('*')
        .eq('status', 'active')
        .is('ended_at', null)
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false });

      if (error || !battles || battles.length === 0) {
        setActiveBattles([]);
        return;
      }

      const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
      const freshBattles = battles.filter(b => {
        if (b.started_at) return new Date(b.started_at).getTime() > thirtyMinAgo;
        return true;
      });

      if (freshBattles.length === 0) { setActiveBattles([]); return; }

      const userIds = [...new Set(freshBattles.flatMap(b => [b.host_id, b.opponent_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setActiveBattles(freshBattles.map(b => ({
        ...b,
        host_name: profileMap.get(b.host_id)?.full_name || profileMap.get(b.host_id)?.username || 'Host',
        host_avatar: profileMap.get(b.host_id)?.avatar_url,
        opponent_name: profileMap.get(b.opponent_id)?.full_name || profileMap.get(b.opponent_id)?.username || 'Opponent',
        opponent_avatar: profileMap.get(b.opponent_id)?.avatar_url,
      })));
    } catch {
      setActiveBattles([]);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    fetchSchedules();
    fetchEpisodes();
    fetchActiveBattles();
    fetchSidebarCreators();

    const channel = supabase
      .channel('podcast-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_sessions' }, () => fetchLiveSessions())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_battles' }, (payload: any) => {
        if (payload.new?.status === 'ended' || payload.new?.ended_at) {
          setActiveBattles(prev => prev.filter(b => b.id !== payload.new.id));
        }
        fetchActiveBattles();
      })
      .subscribe();

    // Listen for battle invite modal open from mobile nav
    const handleOpenBattle = () => setShowBattleInviteModal(true);
    window.addEventListener('open-battle-invite', handleOpenBattle);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('open-battle-invite', handleOpenBattle);
    };
  }, []);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('podcast_schedules')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (data) {
      const hostIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setSchedules(data.map(s => ({
        id: s.id, host_id: s.user_id,
        host_name: profileMap.get(s.user_id)?.full_name || profileMap.get(s.user_id)?.username || 'Host',
        host_avatar: profileMap.get(s.user_id)?.avatar_url || undefined,
        title: s.title, description: s.description || undefined, scheduled_at: s.scheduled_at
      })));
    }
  };

  const fetchEpisodes = async () => {
    const { data } = await supabase
      .from('podcast_episodes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);

    if (data && data.length > 0) {
      const hostIds = [...new Set(data.map(e => e.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setEpisodes(data.map(e => {
        const profile = profileMap.get(e.host_id);
        return {
          id: e.id, host_id: e.host_id,
          host_name: profile?.full_name || profile?.username || 'Music Podcast',
          host_avatar: profile?.avatar_url || undefined,
          title: e.title, cover_image_url: e.cover_image_url || undefined,
          audio_url: e.audio_url || undefined, play_count: e.play_count || 0,
          duration_ms: e.duration_ms || 0, isRealUser: !!profile
        };
      }));
    }
  };

  const fetchLiveSessions = async (retryCount = 0) => {
    try {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data: sessions, error } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('status', 'live')
        .is('ended_at', null)
        .gte('created_at', twoHoursAgo)
        .order('listener_count', { ascending: false });

      if (error) {
        if ((error.message?.includes('JWT') || error.code === 'PGRST303') && retryCount < 1) {
          await supabase.auth.refreshSession();
          return fetchLiveSessions(retryCount + 1);
        }
        setLiveHosts(getAllDemoLiveHosts());
        return;
      }

      if (!sessions || sessions.length === 0) {
        setLiveHosts(getAllDemoLiveHosts());
        return;
      }

      const hostIds = [...new Set(sessions.map(s => s.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const realSessions = sessions
        .filter(s => {
          if (s.started_at && new Date(s.started_at).getTime() < oneHourAgo) return false;
          return true;
        })
        .map(s => {
          const profile = profileMap.get(s.host_id);
          return {
            id: s.id, host_id: s.host_id, title: s.title,
            description: s.description || '', listener_count: s.listener_count || 0,
            host_name: profile?.full_name || profile?.username || 'Host',
            host_avatar: profile?.avatar_url || null,
            category: 'Music', cover_image_url: s.cover_image_url
          };
        });

      const allDemos = getAllDemoLiveHosts();
      const demosToAdd = allDemos.filter(d =>
        !realSessions.some(s => s.id === d.id)
      );
      setLiveHosts([...demosToAdd, ...realSessions]);
    } catch {
      setLiveHosts(getAllDemoLiveHosts());
    }
  };

  const fetchSidebarCreators = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setSidebarCreators(data);
  };

  const heroHosts = liveHosts.slice(0, 5);
  const currentHero = heroHosts[heroIndex];
  const nextHero = () => setHeroIndex((prev) => (prev + 1) % heroHosts.length);
  const prevHero = () => setHeroIndex((prev) => (prev - 1 + heroHosts.length) % heroHosts.length);

  useEffect(() => {
    if (heroHosts.length === 0) return;
    const timer = setInterval(nextHero, 8000);
    return () => clearInterval(timer);
  }, [heroHosts.length]);

  const playEpisode = (episode: EpisodeItem) => {
    if (!episode.audio_url) return;
    if (currentEpisode?.id === episode.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (currentEpisode?.id !== episode.id) {
        setCurrentEpisode(episode);
        if (audioRef.current) { audioRef.current.src = episode.audio_url; audioRef.current.load(); }
      }
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setCurrentEpisode(null);
  };

  useEffect(() => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('ended', handleEnded); audio.pause(); };
  }, []);

  const bannerHeight = 'pt-14';

  return (
    <div className="min-h-screen bg-black text-white pb-16 md:pb-0">
      {/* Twitch-style Top Banner — for non-authenticated users */}
      {/* Top banner removed — join community now in sidebar and footer only */}

        {/* Sidebar — Desktop & Tablet (md+) */}
      <aside className="hidden md:flex fixed left-0 bottom-0 w-[200px] lg:w-[220px] flex-col bg-[#0e0e0e] border-r border-white/5 overflow-y-auto z-40 top-12">
        {/* Navigation Links */}
        <div className="p-2.5 space-y-0.5">
          <button
            onClick={() => navigate('/podcasts?tab=feed')}
            className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          >
            <Radio className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Live</span>
          </button>
          <button
            onClick={() => setShowBattleInviteModal(true)}
            className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          >
            <Swords className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">Battle</span>
          </button>
          <button
            onClick={() => navigate('/ai-remix')}
            className="flex items-center gap-2 w-full p-1.5 rounded hover:bg-white/5 transition-colors text-white/70 hover:text-white"
          >
            <Music className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium">AI Remix</span>
          </button>
          {user && (
            <button
              onClick={() => {
                navigate('/podcasts');
                setTimeout(() => window.dispatchEvent(new CustomEvent('open-host-studio')), 100);
              }}
              className="flex items-center gap-2 w-full p-1.5 rounded bg-white text-black hover:bg-white/90 transition-colors mt-1"
            >
              <Mic className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Go Live</span>
            </button>
          )}
        </div>

        <div className="border-t border-white/5 mx-2.5" />

        {/* Recommended Channels */}
        <div className="p-2.5">
          <div className="mb-1.5">
            <h3 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              {sidebarTab === 'recommended' ? 'Recommended Channels' : 'Followed Channels'}
            </h3>
          </div>
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setSidebarTab('recommended')}
              className={`text-[9px] px-1.5 py-0.5 rounded ${sidebarTab === 'recommended' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              For You
            </button>
            <button
              onClick={() => setSidebarTab('followed')}
              className={`text-[9px] px-1.5 py-0.5 rounded ${sidebarTab === 'followed' ? 'bg-white text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              Following
            </button>
          </div>
          <div className="space-y-0.5">
            {filteredHosts.slice(0, 10).map((host) => (
              <Link
                key={`sidebar-${host.id}`}
                to={`/podcasts?session=${host.id}`}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors group"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                    {host.host_avatar ? (
                      <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate group-hover:text-white">{host.host_name}</p>
                  <p className="text-[10px] text-white/30 truncate">{host.category}</p>
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-white/30">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {formatViewers(host.listener_count)}
                </div>
              </Link>
            ))}

            {user && (
              <div
                onClick={() => navigate(`/host/${user.id}`)}
                className="flex items-center gap-1.5 p-1 rounded hover:bg-white/5 transition-colors group cursor-pointer mt-1.5 border-t border-white/5 pt-1.5"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-white/80 group-hover:text-white">My Page</p>
                  <p className="text-[9px] text-white/30">Your host profile</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </aside>

      {/* Main Content — offset for sidebar on md+ */}
      <main className={`md:ml-[200px] lg:ml-[220px] ${bannerHeight} pb-8 px-0`}>
        {/* Hero Carousel — Twitch-style */}
        {heroHosts.length > 0 && (
          <div className="relative px-2 md:px-3 lg:px-4 mb-2">
            <div className="relative overflow-hidden rounded-md bg-[#0e0e0e]">
              <Link
                to={`/podcasts?session=${currentHero?.id}`}
                className="relative block group"
              >
                <div className="flex flex-col md:flex-row h-[160px] md:h-[220px] lg:h-[260px]">
                  {/* Thumbnail — contained, not cropped */}
                   <div className="relative w-full md:w-[55%] h-full bg-black flex items-center justify-center overflow-hidden">
                     {currentHero?.cover_image_url ? (
                       <img src={currentHero.cover_image_url} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center">
                         <Radio className="w-8 h-8 text-white/10" />
                       </div>
                     )}
                    <div className="absolute top-1.5 left-1.5 bg-white text-black text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      LIVE
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5">
                      <button className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center border border-white/10">
                        <Play className="h-2.5 w-2.5 text-white" fill="white" />
                      </button>
                    </div>
                  </div>
                  {/* Info panel */}
                  <div className="hidden md:flex flex-1 p-3 flex-col justify-center bg-[#0e0e0e]">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border border-white/10">
                        {currentHero?.host_avatar ? (
                          <img src={currentHero.host_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-white/40" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-white">{currentHero?.host_name}</p>
                        <p className="text-[8px] text-white/40">{formatViewers(currentHero?.listener_count || 0)} listeners</p>
                      </div>
                    </div>
                    <h2 className="text-base font-bold text-white mb-1 line-clamp-2">{currentHero?.title}</h2>
                    <p className="text-xs text-white/40 line-clamp-2 mb-2">{currentHero?.description}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[8px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">{currentHero?.category}</span>
                      <span className="text-[8px] bg-white/10 text-white/60 px-1.5 py-0.5 rounded">Audio</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Navigation arrows */}
              {heroHosts.length > 1 && (
                <>
                  <button
                    onClick={prevHero}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-black/60 hover:bg-black/80 border border-white/10"
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={nextHero}
                    className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-black/60 hover:bg-black/80 border border-white/10"
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </>
              )}
            </div>

            {/* Dot indicators */}
            {heroHosts.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-1.5">
                {heroHosts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === heroIndex ? 'bg-white' : 'bg-white/20 hover:bg-white/40'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories removed for density */}

        {/* Creators — denser row */}
        <section className="px-1.5 md:px-2 lg:px-3 mb-1.5">
          <div className="bg-white/5 rounded-md p-1.5 md:p-2">
            <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setShowDiscoverCreators(true)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5"
              >
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Plus className="h-4 w-4 text-white/50" />
                </div>
                <span className="text-[8px] md:text-[9px] text-white/40 w-11 md:w-12 text-center truncate leading-tight">Discover</span>
              </button>
              {sidebarCreators.slice(0, 12).map(creator => (
                <button
                  key={creator.user_id}
                  onClick={() => navigate(`/host/${creator.user_id}`)}
                  className="flex-shrink-0 flex flex-col items-center gap-0.5"
                >
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-full overflow-hidden bg-white/10 border border-white/10 hover:border-white/30 transition-colors">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20" />
                    )}
                  </div>
                  <span className="text-[8px] md:text-[9px] text-white/60 w-11 md:w-12 text-center truncate leading-tight">
                    {creator.full_name || creator.username || 'Creator'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Live Battles Section */}
        {activeBattles.length > 0 && (
          <section className="px-2 md:px-3 lg:px-4 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold flex items-center gap-1.5 text-white/80">
                <Swords className="h-3.5 w-3.5 text-white/50" />
                Live Battles
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
              {activeBattles.map((battle) => (
                <div
                  key={battle.id}
                  onClick={() => navigate(`/podcasts?battle=${battle.id}`)}
                  className="group block cursor-pointer"
                >
                  <div className="relative aspect-video rounded overflow-hidden bg-white/5 mb-0.5">
                    <div className="absolute inset-0 flex">
                      <div className="flex-1 flex items-center justify-center border-r border-white/10">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/30">
                          {battle.host_avatar ? (
                            <img src={battle.host_avatar} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full bg-white/20" />}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/30">
                          {battle.opponent_avatar ? (
                            <img src={battle.opponent_avatar} alt="" className="w-full h-full object-cover" />
                          ) : <div className="w-full h-full bg-white/20" />}
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-black text-[8px] font-bold px-1 py-0.5 rounded-full">VS</div>
                    <div className="absolute top-0.5 left-0.5 bg-white text-black text-[7px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Swords className="w-2 h-2" />
                      BATTLE
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-white/80 truncate group-hover:text-white">{battle.host_name} vs {battle.opponent_name}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Live Channels — flat grid, no categories, tight like Twitch */}
        <section className="px-2 md:px-3 lg:px-4 mb-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Live channels
            </h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-x-1.5 gap-y-2">
            {filteredHosts.map((host) => (
              <Link
                key={host.id}
                to={`/podcasts?session=${host.id}`}
                className="group block"
              >
                <div className="relative aspect-video rounded overflow-hidden bg-white/5">
                  {host.cover_image_url ? (
                    <img src={host.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-white/10" />
                  )}
                  <div className="absolute top-1 left-1 bg-red-600 text-white text-[7px] md:text-[9px] font-bold px-1 md:px-1.5 py-0.5 rounded">
                    LIVE
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/80 text-white text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded">
                    {formatViewers(host.listener_count)} viewers
                  </div>
                </div>
                <div className="flex gap-1.5 mt-1">
                  <div
                    className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/10"
                    onClick={(e) => { e.preventDefault(); navigate(`/host/${host.host_id}`); }}
                  >
                    {host.host_avatar ? (
                      <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full bg-white/20" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[11px] md:text-sm font-medium text-white/90 truncate group-hover:text-white">{host.title}</h3>
                    <p className="text-[10px] md:text-xs text-white/40 truncate">{host.host_name}</p>
                    <span className="text-[9px] md:text-[11px] text-white/30">{host.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Upcoming Schedules */}
        {schedules.length > 0 && (
          <section className="px-2 md:px-3 lg:px-4 mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-white/80 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/50" />
                Upcoming
              </h2>
            </div>
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 md:mx-0 md:px-0 md:overflow-visible">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex-shrink-0 w-48 md:w-auto bg-white/5 rounded p-2 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/host/${schedule.host_id}`)}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-white/10">
                      <img src={schedule.host_avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium truncate text-white/80">{schedule.host_name}</p>
                      <p className="text-[8px] text-white/40">{formatScheduleTime(schedule.scheduled_at)}</p>
                    </div>
                  </div>
                  <h3 className="text-[10px] font-medium line-clamp-1 text-white/70">{schedule.title}</h3>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Episodes */}
        {episodes.length > 0 && (
          <section className="px-2 md:px-3 lg:px-4 mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-bold text-white/80 flex items-center gap-1.5">
                <Headphones className="h-3.5 w-3.5 text-white/50" />
                Episodes
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {episodes.slice(0, 6).map((episode) => (
                <div
                  key={episode.id}
                  className="group cursor-pointer"
                  onClick={() => {
                    if (episode.audio_url) playEpisode(episode);
                    else if (episode.isRealUser) navigate(`/host/${episode.host_id}`);
                  }}
                >
                  <div className="relative aspect-square rounded overflow-hidden bg-white/5 mb-1">
                    {episode.cover_image_url ? (
                      <img src={episode.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : <div className="w-full h-full bg-white/10" />}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {currentEpisode?.id === episode.id && isPlaying ? (
                        <Pause className="h-5 w-5 text-white" fill="white" />
                      ) : (
                        <Play className="h-5 w-5 text-white" fill="white" />
                      )}
                    </div>
                    {currentEpisode?.id === episode.id && isPlaying && (
                      <div className="absolute top-0.5 left-0.5 bg-white text-black text-[7px] font-bold px-1 py-0.5 rounded flex items-center gap-0.5">
                        <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        PLAYING
                      </div>
                    )}
                    {episode.duration_ms > 0 && (
                      <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[7px] px-1 py-0.5 rounded">
                        {formatDuration(episode.duration_ms)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xs font-medium line-clamp-2 text-white/80 group-hover:text-white">{episode.title}</h3>
                  <p className="text-[11px] text-white/40 truncate">{episode.host_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer banner moved outside main for full-width */}

        {/* Floating Audio Player */}
        {currentEpisode && (
          <div className="fixed bottom-16 md:bottom-4 left-0 right-0 md:left-[200px] lg:left-[220px] z-50 px-2 md:px-3 lg:px-4">
            <div className="bg-[#111] border border-white/10 rounded-md p-2 flex items-center gap-2 shadow-2xl">
              <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                {currentEpisode.cover_image_url ? (
                  <img src={currentEpisode.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : <div className="w-full h-full bg-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-medium truncate text-white">{currentEpisode.title}</h4>
                <p className="text-[9px] text-white/40 truncate">{currentEpisode.host_name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => playEpisode(currentEpisode)}
                  className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/80 transition-colors"
                >
                  {isPlaying ? <Pause className="h-3 w-3" fill="currentColor" /> : <Play className="h-3 w-3" fill="currentColor" />}
                </button>
                <button
                  onClick={stopAudio}
                  className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Battle Invite Modal */}
        <BattleInviteModal
          isOpen={showBattleInviteModal}
          onClose={() => setShowBattleInviteModal(false)}
          onBattleStart={(battleId) => fetchBattle(battleId)}
        />

        <BattleNotification onAccept={async (battleId) => { await fetchBattle(battleId); }} />

        {activeBattle && (
          <div className="fixed inset-0 z-50">
            <BattleReelScroller initialBattle={activeBattle} onClose={() => setActiveBattle(null)} />
          </div>
        )}
      </main>

      {/* Full-width Twitch-style bottom banner for guests — spans behind sidebar */}
      {!user && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e0e0e] border-t border-white/5">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <img src="/bario-logo.png" alt="Bario" className="h-6 w-6 object-contain flex-shrink-0" />
              <p className="text-sm text-white/70">
                <span className="font-semibold text-white">Join the Bario community!</span>
                {' '}Discover the best live audio streams anywhere.
              </p>
            </div>
            <Button
              onClick={() => navigate('/auth')}
              size="sm"
              className="bg-white text-black hover:bg-white/90 text-xs h-8 px-5 font-semibold rounded flex-shrink-0"
            >
              Sign Up
            </Button>
          </div>
        </div>
      )}

      {/* Discover Creators Modal */}
      <DiscoverCreatorsModal
        isOpen={showDiscoverCreators}
        onClose={() => setShowDiscoverCreators(false)}
      />
    </div>
  );

  async function fetchBattle(battleId: string) {
    const { data: battle } = await supabase
      .from('podcast_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battle) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', [battle.host_id, battle.opponent_id]);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      setActiveBattle({
        ...battle,
        host_name: profileMap.get(battle.host_id)?.full_name || profileMap.get(battle.host_id)?.username || 'Host',
        host_avatar: profileMap.get(battle.host_id)?.avatar_url,
        opponent_name: profileMap.get(battle.opponent_id)?.full_name || profileMap.get(battle.opponent_id)?.username || 'Opponent',
        opponent_avatar: profileMap.get(battle.opponent_id)?.avatar_url,
      });
    }
  }
};

export default PodcastFeed;
