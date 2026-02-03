import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Users, Play, Pause, Calendar, Headphones, Search, User, X, Swords } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BattleInviteModal from './BattleInviteModal';
import BattleNotification from './BattleNotification';
import BattleReelScroller from './BattleReelScroller';
import { getDemoLiveHost, DEMO_SESSION_ID } from '@/config/demoSpace';

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

// Only show real users - no demo data
// All data comes from database only

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

const PodcastFeed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [liveHosts, setLiveHosts] = useState<LiveHost[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio player state
  const [currentEpisode, setCurrentEpisode] = useState<EpisodeItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Battle state
  const [showBattleInviteModal, setShowBattleInviteModal] = useState(false);
  const [activeBattle, setActiveBattle] = useState<any>(null);
  const [activeBattles, setActiveBattles] = useState<BattleSession[]>([]);

  // Filter hosts based on search
  const filteredHosts = searchQuery.trim() 
    ? liveHosts.filter(h => 
        h.host_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : liveHosts;

  // Fetch active battles - include both pending and active status
  const fetchActiveBattles = async () => {
    try {
      console.log('🔍 PodcastFeed: Fetching active battles...');
      
      const { data: battles, error } = await supabase
        .from('podcast_battles')
        .select('*')
        .in('status', ['active', 'pending']) // Include BOTH pending and active battles
        .is('ended_at', null) // Only battles that haven't ended
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching battles:', error);
        setActiveBattles([]);
        return;
      }

      console.log('📦 PodcastFeed: Battles found:', battles?.length || 0);

      if (!battles || battles.length === 0) {
        console.log('ℹ️ No active/pending battles found');
        setActiveBattles([]);
        return;
      }

      const userIds = [...new Set(battles.flatMap(b => [b.host_id, b.opponent_id]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedBattles = battles.map(b => ({
        ...b,
        host_name: profileMap.get(b.host_id)?.full_name || profileMap.get(b.host_id)?.username || 'Host',
        host_avatar: profileMap.get(b.host_id)?.avatar_url,
        opponent_name: profileMap.get(b.opponent_id)?.full_name || profileMap.get(b.opponent_id)?.username || 'Opponent',
        opponent_avatar: profileMap.get(b.opponent_id)?.avatar_url,
      }));
      
      console.log('✅ PodcastFeed: Enriched battles:', enrichedBattles.length);
      setActiveBattles(enrichedBattles);
    } catch (err) {
      console.error('❌ Battle fetch error:', err);
      setActiveBattles([]);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    fetchSchedules();
    fetchEpisodes();
    fetchActiveBattles();
    
    // Subscribe to real-time updates for immediate live session visibility
    const channel = supabase
      .channel('podcast-feed-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'podcast_sessions' 
      }, (payload) => {
        console.log('New session inserted:', payload);
        fetchLiveSessions();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'podcast_sessions' 
      }, (payload: any) => {
        console.log('Session updated:', payload);
        // Immediately remove ended sessions from UI
        if (payload.new.status === 'ended' || payload.new.ended_at) {
          console.log('Session ended, removing from state:', payload.new.id);
          setLiveHosts(prev => prev.filter(h => h.id !== payload.new.id));
        }
        fetchLiveSessions();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'podcast_sessions' 
      }, () => {
        console.log('Session deleted');
        fetchLiveSessions();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'podcast_battles' 
      }, (payload) => {
        console.log('Battle inserted:', payload);
        fetchActiveBattles();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'podcast_battles' 
      }, (payload: any) => {
        console.log('Battle updated:', payload);
        // If battle is ended, immediately remove from local state
        if (payload.new.status === 'ended' || payload.new.ended_at) {
          console.log('Battle ended, removing from state:', payload.new.id);
          setActiveBattles(prev => prev.filter(b => b.id !== payload.new.id));
        }
        fetchActiveBattles(); // Also re-fetch for safety
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'podcast_battles' 
      }, (payload) => {
        console.log('Battle deleted:', payload);
        fetchActiveBattles();
      })
      .subscribe((status) => {
        console.log('Podcast feed realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
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
      // Fetch host profiles for schedules
      const hostIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setSchedules(data.map(s => ({
        id: s.id,
        host_id: s.user_id,
        host_name: profileMap.get(s.user_id)?.full_name || profileMap.get(s.user_id)?.username || 'Host',
        host_avatar: profileMap.get(s.user_id)?.avatar_url || undefined,
        title: s.title,
        description: s.description || undefined,
        scheduled_at: s.scheduled_at
      })));
    }
  };

  const fetchEpisodes = async () => {
    // Try fetching from database - we want real episodes with audio
    const { data } = await supabase
      .from('podcast_episodes')
      .select('*')
      .not('audio_url', 'is', null) // Only get episodes with audio
      .order('created_at', { ascending: false })
      .limit(12);

    if (data && data.length > 0) {
      // Fetch host profiles for episodes
      const hostIds = [...new Set(data.map(e => e.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setEpisodes(data.map(e => {
        const profile = profileMap.get(e.host_id);
        return {
          id: e.id,
          host_id: e.host_id,
          host_name: profile?.full_name || profile?.username || 'Music Podcast',
          host_avatar: profile?.avatar_url || undefined,
          title: e.title,
          cover_image_url: e.cover_image_url || undefined,
          audio_url: e.audio_url || undefined,
          play_count: e.play_count || 0,
          duration_ms: e.duration_ms || 0,
          isRealUser: !!profile
        };
      }));
    } else {
      // Fallback - get all episodes even without audio
      const { data: allEpisodes } = await supabase
        .from('podcast_episodes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(12);
        
      if (allEpisodes) {
        const hostIds = [...new Set(allEpisodes.map(e => e.host_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, username')
          .in('user_id', hostIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        setEpisodes(allEpisodes.map(e => {
          const profile = profileMap.get(e.host_id);
          return {
            id: e.id,
            host_id: e.host_id,
            host_name: profile?.full_name || profile?.username || 'Music Podcast',
            host_avatar: profile?.avatar_url || undefined,
            title: e.title,
            cover_image_url: e.cover_image_url || undefined,
            audio_url: e.audio_url || undefined,
            play_count: e.play_count || 0,
            duration_ms: e.duration_ms || 0,
            isRealUser: !!profile
          };
        }));
      }
    }
  };

  const fetchLiveSessions = async (retryCount = 0) => {
    console.log('Fetching live sessions...');
    
    try {
      // Calculate staleness threshold - only show sessions from last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      // Step 1: Fetch live sessions with staleness filter
      const { data: sessions, error: sessionsError } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('status', 'live')
        .is('ended_at', null) // Extra safety - only sessions that haven't ended
        .gte('created_at', twoHoursAgo) // Only sessions from last 2 hours
        .order('listener_count', { ascending: false });

      // Handle JWT errors with retry
      if (sessionsError) {
        console.error('Error fetching live sessions:', sessionsError);
        if ((sessionsError.message?.includes('JWT') || sessionsError.code === 'PGRST303') && retryCount < 1) {
          console.log('JWT error, refreshing token and retrying...');
          await supabase.auth.refreshSession();
          return fetchLiveSessions(retryCount + 1);
        }
        setLiveHosts([]); // Clear state on error
        return;
      }

      console.log('Live sessions fetched:', sessions?.length || 0);
      
      if (!sessions || sessions.length === 0) {
        setLiveHosts([]);
        return;
      }

      // Step 2: Fetch host profiles separately
      const hostIds = [...new Set(sessions.map(s => s.host_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', hostIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Step 3: Combine data and filter out any remaining stale sessions
      const realSessions = sessions
        .filter(s => {
          // Extra client-side filter for sessions older than 1 hour without activity
          if (s.started_at) {
            const startedAt = new Date(s.started_at).getTime();
            const oneHourAgo = Date.now() - 60 * 60 * 1000;
            if (startedAt < oneHourAgo) {
              console.log('Filtering out stale session:', s.id, s.title);
              return false;
            }
          }
          return true;
        })
        .map(s => {
          const profile = profileMap.get(s.host_id);
          return {
            id: s.id,
            host_id: s.host_id,
            title: s.title,
            description: s.description || '',
            listener_count: s.listener_count || 0,
            host_name: profile?.full_name || profile?.username || 'Host',
            host_avatar: profile?.avatar_url || null,
            category: 'Music',
            cover_image_url: s.cover_image_url
          };
        });
      
      // Always inject demo session if there are no real sessions or very few
      const demoHost = getDemoLiveHost();
      const hasDemo = realSessions.some(s => s.id === DEMO_SESSION_ID);
      
      if (!hasDemo) {
        // Add demo session at the beginning when few real sessions exist
        if (realSessions.length < 3) {
          setLiveHosts([demoHost, ...realSessions]);
        } else {
          // Add at position 2-3 when many sessions exist
          const insertIndex = Math.min(2, realSessions.length);
          const withDemo = [...realSessions];
          withDemo.splice(insertIndex, 0, demoHost);
          setLiveHosts(withDemo);
        }
      } else {
        setLiveHosts(realSessions);
      }
    } catch (err) {
      console.error('Unexpected error fetching live sessions:', err);
      // Even on error, show the demo session
      setLiveHosts([getDemoLiveHost()]);
    }
  };

  const heroHosts = liveHosts.slice(0, 5);
  const currentHero = heroHosts[heroIndex];

  const nextHero = () => setHeroIndex((prev) => (prev + 1) % heroHosts.length);
  const prevHero = () => setHeroIndex((prev) => (prev - 1 + heroHosts.length) % heroHosts.length);

  // Auto-rotate hero
  useEffect(() => {
    if (heroHosts.length === 0) return;
    const timer = setInterval(nextHero, 8000);
    return () => clearInterval(timer);
  }, [heroHosts.length]);

  // Audio player functions
  const playEpisode = (episode: EpisodeItem) => {
    if (!episode.audio_url) {
      console.log('No audio URL for episode');
      return;
    }

    if (currentEpisode?.id === episode.id && isPlaying) {
      // Pause if same episode is playing
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Play new episode or resume
      if (currentEpisode?.id !== episode.id) {
        setCurrentEpisode(episode);
        if (audioRef.current) {
          audioRef.current.src = episode.audio_url;
          audioRef.current.load();
        }
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

  // Handle audio end
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white pb-16 lg:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex fixed left-0 top-12 bottom-0 w-56 flex-col bg-[#18181b] border-r border-white/5 overflow-y-auto z-40">
        <div className="p-3">
          <h3 className="text-[10px] font-semibold text-white/50 uppercase mb-2 tracking-wider">Recommended</h3>
          <div className="space-y-0.5">
            {filteredHosts.slice(0, 10).map((host) => (
              <div
                key={`sidebar-${host.id}`}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div 
                  className="relative flex-shrink-0"
                  onClick={() => navigate(`/host/${host.host_id}`)}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-700">
                    {host.host_avatar ? (
                      <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#18181b]" />
                </div>
                <Link 
                  to={`/podcasts?session=${host.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-white truncate group-hover:text-[#53fc18]">
                    {host.host_name}
                  </p>
                  <p className="text-xs text-white/40 truncate">{host.category}</p>
                </Link>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {formatViewers(host.listener_count)}
                </div>
              </div>
            ))}

            {/* My Page - for logged in users */}
            {user && (
              <div
                onClick={() => navigate(`/host/${user.id}`)}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors group cursor-pointer mt-3 border-t border-white/10 pt-3"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#53fc18] to-green-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-black" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#53fc18] truncate group-hover:text-white">
                    My Page
                  </p>
                  <p className="text-xs text-white/40 truncate">Your host profile</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-56 pt-14 pb-8 px-0">
        {/* Search Bar */}
        <div className="px-3 lg:px-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search podcasts, hosts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
              />
            </div>
            {user && (
              <Button
                size="sm"
                onClick={() => navigate(`/host/${user.id}`)}
                className="bg-black hover:bg-black/80 text-white border border-white/20 font-semibold h-9"
              >
                <User className="h-4 w-4 mr-1" />
                My Page
              </Button>
            )}
          </div>
        </div>
        {/* Hero Carousel - Kick.com Style - Mobile Optimized */}
        {currentHero && (
          <div className="relative px-3 lg:px-6 mb-4 lg:mb-6">
            <div 
              ref={heroRef}
              className="relative rounded-lg overflow-hidden bg-gradient-to-r from-purple-900/50 to-pink-900/50"
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 lg:gap-6 p-3 lg:p-6">
                {/* Hero Info */}
                <div className="flex-1 min-w-0 z-10 order-2 sm:order-1">
                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div 
                      className="w-8 h-8 lg:w-12 lg:h-12 rounded-full overflow-hidden ring-2 ring-[#53fc18] cursor-pointer hover:ring-white transition-colors"
                      onClick={() => navigate(`/host/${currentHero.host_id}`)}
                    >
                      {currentHero.host_avatar ? (
                        <img src={currentHero.host_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm lg:text-lg font-bold flex items-center gap-2">
                        <span 
                          className="cursor-pointer hover:text-[#53fc18] transition-colors"
                          onClick={() => navigate(`/host/${currentHero.host_id}`)}
                        >
                          {currentHero.host_name}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] lg:text-sm font-normal text-white/60">
                          <Users className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          {formatViewers(currentHero.listener_count)} listening
                        </span>
                      </h2>
                    </div>
                  </div>
                  <h3 className="text-sm lg:text-lg font-medium mb-1 lg:mb-2 line-clamp-2">{currentHero.title}</h3>
                  <p className="text-xs lg:text-sm text-white/60 line-clamp-1 lg:line-clamp-2 mb-2 lg:mb-3">{currentHero.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-xs bg-white/10 px-2 py-0.5 lg:py-1 rounded">{currentHero.category}</span>
                  </div>
                </div>

                {/* Hero Thumbnail - Show on mobile too */}
                <Link 
                  to={`/podcasts?session=${currentHero.id}`}
                  className="relative w-full sm:w-40 lg:w-64 aspect-video rounded-lg overflow-hidden group flex-shrink-0 order-1 sm:order-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-500/50 to-orange-500/50" />
                  {currentHero.cover_image_url && (
                    <img src={currentHero.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 lg:h-10 lg:w-10 text-white" fill="white" />
                  </div>
                  <div className="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 bg-red-600 text-white text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded flex items-center gap-0.5 lg:gap-1">
                    <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </Link>
              </div>

              {/* Carousel Controls */}
              <div className="absolute bottom-2 lg:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:gap-2">
                <button onClick={prevHero} className="p-0.5 lg:p-1 rounded-full bg-black/50 hover:bg-black/70">
                  <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
                </button>
                <div className="flex gap-1">
                  {heroHosts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-colors ${i === heroIndex ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
                <button onClick={nextHero} className="p-0.5 lg:p-1 rounded-full bg-black/50 hover:bg-black/70">
                  <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Now Section - Only shows real live sessions */}
        {liveHosts.length === 0 && (
          <section className="px-3 lg:px-6 mb-6">
            <div className="bg-white/5 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Headphones className="w-8 h-8 text-white/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Live Sessions</h3>
              <p className="text-white/50 text-sm mb-4">Be the first to go live and share your voice with the community!</p>
              {user && (
                <Button
                  onClick={() => navigate('/podcasts')}
                  className="bg-black hover:bg-black/80 text-white border border-white/20 font-semibold"
                >
                  Go Live Now
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Live Battles Section */}
        {activeBattles.length > 0 && (
          <section className="px-3 lg:px-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Swords className="h-4 w-4 text-yellow-400" />
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Live Battles
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4">
              {activeBattles.map((battle) => (
                <div 
                  key={battle.id}
                  onClick={() => {
                    // Navigate to battle view using URL parameter
                    navigate(`/podcasts?battle=${battle.id}`);
                  }}
                  className="group block cursor-pointer"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-pink-600/50 via-purple-500/50 to-orange-500/50 mb-1.5">
                    {/* VS Split View */}
                    <div className="absolute inset-0 flex">
                      <div className="flex-1 flex items-center justify-center border-r border-white/20">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-pink-500">
                          {battle.host_avatar ? (
                            <img src={battle.host_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-cyan-500">
                          {battle.opponent_avatar ? (
                            <img src={battle.opponent_avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-blue-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* VS Badge */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded-full">
                      VS
                    </div>
                    
                    {/* Battle badge */}
                    <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-[8px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded flex items-center gap-0.5 lg:gap-1">
                      <Swords className="w-2.5 h-2.5" />
                      BATTLE
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <h3 className="text-[11px] lg:text-sm font-medium text-white truncate group-hover:text-[#53fc18] transition-colors">
                      {battle.host_name} vs {battle.opponent_name}
                    </h3>
                    <p className="text-[10px] lg:text-xs text-white/50">
                      {Math.floor(battle.duration_seconds / 60)} min battle
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs for Live and Battle */}
        <div className="px-3 lg:px-6 mb-4">
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-[#53fc18] text-black rounded-full text-xs font-semibold">
              Live
            </button>
            <button 
              onClick={() => navigate('/podcasts?tab=battle')}
              className="px-4 py-2 bg-white/10 text-white/70 hover:bg-white/20 rounded-full text-xs font-medium transition-colors"
            >
              Battle
            </button>
            <Button
              onClick={() => setShowBattleInviteModal(true)}
              size="sm"
              className="ml-2 bg-black hover:bg-black/80 text-white font-semibold px-4 py-2 h-auto rounded-full text-xs"
            >
              <Swords className="h-3.5 w-3.5 mr-1.5" />
              Start Battle
            </Button>
          </div>
        </div>

        {/* Live Sessions - Only show when there are live hosts */}
        {liveHosts.length > 0 && (
          <section className="px-3 lg:px-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Live Now
              </h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4">
              {liveHosts.map((host) => (
                <Link 
                  key={host.id}
                  to={`/podcasts?session=${host.id}`}
                  className="group block"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-800 mb-1.5">
                    {host.cover_image_url ? (
                      <img src={host.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-500/50 to-orange-500/50" />
                    )}
                    
                    {/* Live badge */}
                    <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-red-600 text-white text-[8px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded flex items-center gap-0.5 lg:gap-1">
                      <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                    
                    {/* Listener count */}
                    <div className="absolute bottom-1 left-1 lg:bottom-2 lg:left-2 bg-black/70 text-white text-[8px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 rounded">
                      {formatViewers(host.listener_count)} listening
                    </div>

                    {/* Hover overlay - desktop only */}
                    <div className="hidden lg:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                      <Play className="h-10 w-10 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex gap-1.5 lg:gap-2">
                    <div 
                      className="w-6 h-6 lg:w-8 lg:h-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-700 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/host/${host.host_id}`);
                      }}
                    >
                      {host.host_avatar ? (
                        <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[11px] lg:text-sm font-medium text-white truncate group-hover:text-[#53fc18] transition-colors">
                        {host.title}
                      </h3>
                      <p className="text-[10px] lg:text-xs text-white/50 truncate">{host.host_name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Schedules Section */}
        <section className="px-3 lg:px-6 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#53fc18]" />
              Upcoming Schedules
            </h2>
            <button className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          <div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 lg:mx-0 lg:px-0 lg:overflow-visible">
            {schedules.length > 0 ? schedules.map((schedule) => (
              <div 
                key={schedule.id}
                className="flex-shrink-0 w-64 lg:w-auto bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/host/${schedule.host_id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700">
                    <img src={schedule.host_avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{schedule.host_name}</p>
                    <p className="text-[10px] text-[#53fc18]">{formatScheduleTime(schedule.scheduled_at)}</p>
                  </div>
                </div>
                <h3 className="text-sm font-medium line-clamp-1 mb-1">{schedule.title}</h3>
                <p className="text-[10px] text-white/50 line-clamp-2">{schedule.description}</p>
              </div>
            )) : <p className="text-white/40 text-xs">No upcoming schedules</p>}
          </div>
        </section>

        {/* Episodes Section */}
        <section className="px-3 lg:px-6 mt-8 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Headphones className="h-4 w-4 text-[#53fc18]" />
              Episodes
            </h2>
            <button className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {episodes.slice(0, 6).length > 0 ? episodes.slice(0, 6).map((episode) => (
              <div 
                key={episode.id}
                className="group cursor-pointer"
                onClick={() => {
                  if (episode.audio_url) {
                    playEpisode(episode);
                  } else if (episode.isRealUser) {
                    navigate(`/host/${episode.host_id}`);
                  }
                }}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-2">
                  {episode.cover_image_url ? (
                    <img src={episode.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {currentEpisode?.id === episode.id && isPlaying ? (
                      <Pause className="h-8 w-8 text-white" fill="white" />
                    ) : (
                      <Play className="h-8 w-8 text-white" fill="white" />
                    )}
                  </div>
                  {currentEpisode?.id === episode.id && isPlaying && (
                    <div className="absolute top-1.5 left-1.5 bg-[#53fc18] text-black text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
                      PLAYING
                    </div>
                  )}
                  {episode.duration_ms > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                      {formatDuration(episode.duration_ms)}
                    </div>
                  )}
                </div>
                <h3 className="text-xs font-medium line-clamp-2 mb-1 group-hover:text-[#53fc18] transition-colors">{episode.title}</h3>
                <p className="text-[10px] text-white/50 truncate">{episode.host_name}</p>
                <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                  <Play className="h-2.5 w-2.5" />
                  {formatViewers(episode.play_count)}
                </p>
              </div>
            )) : <p className="text-white/40 text-xs col-span-full text-center py-8">No episodes yet</p>}
          </div>
        </section>

        {/* Floating Audio Player */}
        {currentEpisode && (
          <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 lg:left-56 z-50 px-3 lg:px-6">
            <div className="bg-[#18181b] border border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                {currentEpisode.cover_image_url ? (
                  <img src={currentEpisode.cover_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{currentEpisode.title}</h4>
                <p className="text-xs text-white/50 truncate">{currentEpisode.host_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => playEpisode(currentEpisode)}
                  className="w-10 h-10 rounded-full bg-[#53fc18] text-black flex items-center justify-center hover:bg-[#45d914] transition-colors"
                >
                  {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="h-5 w-5" fill="currentColor" />}
                </button>
                <button
                  onClick={stopAudio}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Battle Invite Modal */}
        <BattleInviteModal
          isOpen={showBattleInviteModal}
          onClose={() => setShowBattleInviteModal(false)}
          onBattleStart={(battleId) => {
            // Fetch the battle and show it
            fetchBattle(battleId);
          }}
        />

        {/* Battle Notification for incoming invites */}
        <BattleNotification
          onAccept={async (battleId) => {
            await fetchBattle(battleId);
          }}
        />

        {/* Active Battle View - Using Reel Scroller */}
        {activeBattle && (
          <div className="fixed inset-0 z-50">
            <BattleReelScroller
              initialBattle={activeBattle}
              onClose={() => setActiveBattle(null)}
            />
          </div>
        )}
      </main>
    </div>
  );

  async function fetchBattle(battleId: string) {
    const { data: battle } = await supabase
      .from('podcast_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battle) {
      // Fetch profiles for host and opponent
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
