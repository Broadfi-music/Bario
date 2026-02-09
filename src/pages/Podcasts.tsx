import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Mic, Radio, Home, Flame, Swords, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import HostStudio from '@/components/podcast/HostStudio';
import PodcastFeed from '@/components/podcast/PodcastFeed';
import KickStyleLive from '@/components/podcast/KickStyleLive';
import BattleReelScroller from '@/components/podcast/BattleReelScroller';
import { isValidUUID, isDemoLiveSession } from '@/lib/authUtils';
import { getDemoPodcastSession, DEMO_SESSION_ID } from '@/config/demoSpace';

interface PodcastSession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'scheduled' | 'live' | 'ended';
  listener_count: number;
  started_at: string | null;
  host_name?: string;
  host_avatar?: string | null;
  category?: string;
}

interface HostLiveSession {
  id: string;
  title: string;
  listener_count: number;
}

interface HostBattle {
  id: string;
  host_name: string;
  opponent_name: string;
}

const Podcasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHostStudio, setShowHostStudio] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const [liveSessions, setLiveSessions] = useState<PodcastSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PodcastSession | null>(null);
  const [hostLiveSession, setHostLiveSession] = useState<HostLiveSession | null>(null);
  const [hostBattle, setHostBattle] = useState<HostBattle | null>(null);
  const [showBattleSession, setShowBattleSession] = useState(false);

  // Check if current user has a live session or active battle running
  useEffect(() => {
    if (!user) {
      setHostLiveSession(null);
      setHostBattle(null);
      return;
    }

    const checkHostSession = async () => {
      const { data } = await supabase
        .from('podcast_sessions')
        .select('id, title, listener_count')
        .eq('host_id', user.id)
        .eq('status', 'live')
        .single();
      
      if (data) {
        setHostLiveSession({
          id: data.id,
          title: data.title,
          listener_count: data.listener_count || 0
        });
        // IMPORTANT: Skip auto-opening HostStudio for battle sessions
        // Battle sessions have "Battle:" prefix in title
        if (!data.title?.startsWith('Battle:')) {
          setShowHostStudio(true);
        }
      } else {
        setHostLiveSession(null);
      }
    };

    const checkHostBattle = async () => {
      const { data: battle } = await supabase
        .from('podcast_battles')
        .select('id, host_id, opponent_id')
        .or(`host_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .eq('status', 'active')
        .single();
      
      if (battle) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username')
          .in('user_id', [battle.host_id, battle.opponent_id]);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        setHostBattle({
          id: battle.id,
          host_name: profileMap.get(battle.host_id)?.full_name || profileMap.get(battle.host_id)?.username || 'Host',
          opponent_name: profileMap.get(battle.opponent_id)?.full_name || profileMap.get(battle.opponent_id)?.username || 'Opponent',
        });
      } else {
        setHostBattle(null);
      }
    };

    checkHostSession();
    checkHostBattle();

    const channel = supabase
      .channel('host-session-check')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_sessions',
          filter: `host_id=eq.${user.id}`
        },
        () => checkHostSession()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_battles'
        },
        () => checkHostBattle()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle session URL parameter
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      // Handle demo session specially
      if (isDemoLiveSession(sessionId)) {
        const demoSession = getDemoPodcastSession();
        setSelectedSession(demoSession);
        setActiveTab('live');
        return;
      }
      
      // Set tab immediately, then find/fetch the session
      setActiveTab('live');
      
      // Try to find in existing sessions first
      const foundSession = liveSessions.find(p => p.id === sessionId);
      if (foundSession) {
        setSelectedSession(foundSession);
      } else {
        fetchSessionById(sessionId);
      }
    } else if (!searchParams.get('battle') && !selectedSession && activeTab === 'live') {
      // If on live tab with no session selected and no battle, try to show demo
      const demoSession = getDemoPodcastSession();
      setSelectedSession(demoSession);
    }
  }, [searchParams, liveSessions, selectedSession, activeTab]);

  // Handle battle URL parameter - open battle view directly
  useEffect(() => {
    const battleId = searchParams.get('battle');
    if (battleId && user) {
      fetchBattleById(battleId);
    }
  }, [searchParams, user]);

  const fetchBattleById = async (battleId: string) => {
    if (!isValidUUID(battleId)) return;

    console.log('🔍 Fetching battle by ID:', battleId);

    // Include both pending and active battles - not just active
    const { data: battle, error } = await supabase
      .from('podcast_battles')
      .select('*')
      .eq('id', battleId)
      .in('status', ['pending', 'active']) // Include pending battles too
      .single();

    if (error) {
      console.error('❌ Error fetching battle:', error);
      return;
    }

    if (battle) {
      console.log('✅ Battle found:', battle.id, 'status:', battle.status);
      
      // Fetch profiles for host and opponent
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', [battle.host_id, battle.opponent_id]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      setHostBattle({
        id: battle.id,
        host_name: profileMap.get(battle.host_id)?.full_name || profileMap.get(battle.host_id)?.username || 'Host',
        opponent_name: profileMap.get(battle.opponent_id)?.full_name || profileMap.get(battle.opponent_id)?.username || 'Opponent',
      });
      
      // Open battle session view
      setShowBattleSession(true);
    } else {
      console.log('⚠️ Battle not found or already ended');
    }
  };

  const fetchSessionById = async (sessionId: string) => {
    if (!isValidUUID(sessionId)) return;

    const { data } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (data) {
      let hostProfile = null;
      if (isValidUUID(data.host_id)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username')
          .eq('user_id', data.host_id)
          .single();
        hostProfile = profile;
      }

      const session: PodcastSession = {
        id: data.id,
        host_id: data.host_id,
        title: data.title,
        description: data.description,
        cover_image_url: data.cover_image_url,
        status: data.status as 'scheduled' | 'live' | 'ended',
        listener_count: data.listener_count || 0,
        started_at: data.started_at,
        host_name: hostProfile?.full_name || hostProfile?.username || 'Host',
        host_avatar: hostProfile?.avatar_url || null,
        category: 'Music'
      };
      setSelectedSession(session);
      setActiveTab('live');
    }
  };

  useEffect(() => {
    fetchLiveSessions();
    
    const channel = supabase
      .channel('live-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_sessions'
        },
        () => fetchLiveSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveSessions = async (retryCount = 0) => {
    try {
      // IMPORTANT: Filter out battle sessions (they have "Battle:" prefix in title)
      // Battle sessions should NOT appear in the regular live feed
      const { data: sessions, error } = await supabase
        .from('podcast_sessions')
        .select('*')
        .eq('status', 'live')
        .not('title', 'ilike', 'Battle:%') // Exclude battle sessions
        .order('listener_count', { ascending: false });
      
      // Handle JWT errors with retry
      if (error) {
        console.error('Error fetching live sessions:', error);
        if ((error.message?.includes('JWT') || error.code === 'PGRST303') && retryCount < 1) {
          console.log('JWT error, refreshing token and retrying...');
          await supabase.auth.refreshSession();
          return fetchLiveSessions(retryCount + 1);
        }
        return;
      }
      
      if (!sessions) return;

      const validHostIds = sessions.filter(s => isValidUUID(s.host_id)).map(s => s.host_id);
      
      interface ProfileInfo {
        user_id: string;
        full_name: string | null;
        avatar_url: string | null;
        username: string | null;
      }
      
      let profiles: ProfileInfo[] = [];
      if (validHostIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, username')
          .in('user_id', validHostIds);
        profiles = data || [];
      }

      const profileMap = new Map<string, ProfileInfo>(profiles.map(p => [p.user_id, p]));
      
      setLiveSessions(sessions.map(s => {
        const profile = profileMap.get(s.host_id);
        return {
          id: s.id,
          host_id: s.host_id,
          title: s.title,
          description: s.description,
          cover_image_url: s.cover_image_url,
          status: s.status as 'scheduled' | 'live' | 'ended',
          listener_count: s.listener_count || 0,
          started_at: s.started_at,
          host_name: profile?.full_name || profile?.username || 'Host',
          host_avatar: profile?.avatar_url || null,
          category: 'Music'
        };
      }));
    } catch (err) {
      console.error('Unexpected error fetching live sessions:', err);
    }
  };

  const handleBackToFeed = () => {
    setSelectedSession(null);
    setActiveTab('feed');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Battle Session Banner - shown when user is in an active battle */}
      {hostBattle && !showBattleSession && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 py-2 px-4">
          <div className="flex items-center justify-center gap-3 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span className="text-xs font-semibold text-white">BATTLE</span>
            </div>
            <span className="text-xs text-white/90 truncate max-w-[120px] sm:max-w-xs">
              {hostBattle.host_name} vs {hostBattle.opponent_name}
            </span>
            <Button
              onClick={() => setShowBattleSession(true)}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white text-xs h-6 px-2"
            >
              Return to Session
            </Button>
          </div>
        </div>
      )}

      {/* Live Session Banner - shown when host has an active session */}
      {hostLiveSession && !showHostStudio && !hostBattle && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-red-600 to-pink-600 py-2 px-4">
          <div className="flex items-center justify-center gap-3 max-w-screen-xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
              <span className="text-xs font-semibold text-white">LIVE</span>
            </div>
            <span className="text-xs text-white/90 truncate max-w-[120px] sm:max-w-xs">{hostLiveSession.title}</span>
            <span className="text-xs text-white/70">{hostLiveSession.listener_count} listeners</span>
            <Button
              onClick={() => setShowHostStudio(true)}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white text-xs h-6 px-2"
            >
              Return to Studio
            </Button>
          </div>
        </div>
      )}

      {/* Kick.com Style Header */}
      <header className={`fixed left-0 right-0 z-50 bg-[#18181b] border-b border-white/5 ${(hostLiveSession && !showHostStudio) || (hostBattle && !showBattleSession) ? 'top-10' : 'top-0'}`}>
        <div className="flex items-center justify-between h-12 px-2 sm:px-4">
          {/* Left: Logo/Back */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => activeTab === 'live' && selectedSession ? handleBackToFeed() : navigate('/')} 
              className="flex items-center gap-1 text-white/60 hover:text-white lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link to="/" className="hidden lg:flex items-center">
              <span className="text-white font-bold text-xl">BARIO</span>
            </Link>
          </div>

          {/* Center: Tabs - Add Battle and Leaderboard tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'live') { setSelectedSession(null); setSearchParams({}); } }} className="w-auto">
            <TabsList className="bg-white/5 h-8">
              <TabsTrigger value="feed" className="text-xs px-2 sm:px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7">
                Feed
              </TabsTrigger>
              <TabsTrigger value="live" className="text-xs px-2 sm:px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7">
                Live
              </TabsTrigger>
              <TabsTrigger value="battles" className="text-xs px-2 sm:px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7 flex items-center gap-1">
                <Swords className="h-3 w-3" />
                <span className="hidden sm:inline">Battles</span>
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="text-xs px-2 sm:px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7 flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                <span className="hidden sm:inline">Leaderboard</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Additional nav links */}
          <div className="flex items-center gap-1 ml-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white h-8 px-2 text-xs">
                Heatmap
              </Button>
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <Button
                onClick={() => setShowHostStudio(true)}
                size="sm"
                className="bg-black hover:bg-black/90 text-white text-xs h-8 px-3 font-semibold"
              >
                <Mic className="h-3 w-3 mr-1.5" />
                <span className="hidden sm:inline text-white">Go Live</span>
              </Button>
            )}
            {user ? (
              <Link to="/dashboard">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500" />
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-black text-white hover:bg-black/90 text-xs h-8 px-3 font-semibold">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {activeTab === 'live' ? (
        <KickStyleLive
          sessions={liveSessions}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          selectedSession={selectedSession}
          onSessionSelect={setSelectedSession}
          hostLiveSession={hostLiveSession}
        />
      ) : activeTab === 'battles' ? (
        <div className="pt-16">
          <BattleReelScroller onClose={() => setActiveTab('feed')} />
        </div>
      ) : activeTab === 'leaderboard' ? (
        <div className="pt-20 pb-24 px-4 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <p className="text-white/60 text-sm max-w-xs mx-auto">
              We're building something exciting! The leaderboard will showcase top creators, battle winners, and rising stars.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
              <span className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="text-yellow-400 text-sm font-medium">In Development</span>
            </div>
          </div>
        </div>
      ) : (
        <PodcastFeed />
      )}

      {/* Host Studio */}
      <HostStudio
        isOpen={showHostStudio}
        onClose={() => setShowHostStudio(false)}
        session={null}
      />

      {/* Battle Session View */}
      {showBattleSession && hostBattle && (
        <div className="fixed inset-0 z-[70]">
          <BattleReelScroller
            onClose={() => setShowBattleSession(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Podcasts;
