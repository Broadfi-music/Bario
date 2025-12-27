import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Mic, Radio, Home, Flame, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwitchComments from '@/components/podcast/TwitchComments';
import SpaceParticipants from '@/components/podcast/SpaceParticipants';
import GiftModal from '@/components/podcast/GiftModal';
import HostStudio from '@/components/podcast/HostStudio';
import PodcastFeed from '@/components/podcast/PodcastFeed';
import { toast } from 'sonner';
import { getFreshSession, isDemoSession, isValidUUID } from '@/lib/authUtils';

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

// Only show real signed users - no demo data

const Podcasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftSessionId, setGiftSessionId] = useState('');
  const [giftHostId, setGiftHostId] = useState('');
  const [showHostStudio, setShowHostStudio] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [liveSessions, setLiveSessions] = useState<PodcastSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<PodcastSession | null>(null);

  const podcasts = liveSessions;
  const currentPodcast = selectedSession || podcasts[currentIndex];

  // Handle session URL parameter
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      // Find session by ID
      const foundSession = podcasts.find(p => p.id === sessionId);
      if (foundSession) {
        setSelectedSession(foundSession);
        setActiveTab('live');
      } else {
        // Fetch from database
        fetchSessionById(sessionId);
      }
    }
  }, [searchParams, liveSessions]);

  const fetchSessionById = async (sessionId: string) => {
    // Handle demo sessions locally
    if (isDemoSession(sessionId)) {
      const demoSession = DEMO_PODCASTS.find(p => p.id === sessionId);
      if (demoSession) {
        setSelectedSession(demoSession);
        setActiveTab('live');
      }
      return;
    }

    // Only query DB for valid UUIDs
    if (!isValidUUID(sessionId)) {
      return;
    }

    // Query session and profile separately to avoid foreign key issues
    const { data } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (data) {
      // Fetch profile separately only if host_id is a valid UUID
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
    } else {
      // Session not found, check if it's a demo
      const demoSession = DEMO_PODCASTS.find(p => p.id === sessionId);
      if (demoSession) {
        setSelectedSession(demoSession);
        setActiveTab('live');
      }
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

  const fetchLiveSessions = async () => {
    // Fetch sessions first
    const { data: sessions } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('status', 'live')
      .order('listener_count', { ascending: false });
    
    if (!sessions) return;

    // Fetch profiles separately for valid host IDs
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
  };

  const goToNext = useCallback(() => {
    const maxIndex = podcasts.length - 1;
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
    if (currentIndex < podcasts.length - 1) {
      setSelectedSession(podcasts[currentIndex + 1]);
    }
  }, [podcasts.length, currentIndex, podcasts]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
    if (currentIndex > 0) {
      setSelectedSession(podcasts[currentIndex - 1]);
    }
  }, [currentIndex, podcasts]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrev();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') goToPrev();
      if (e.key === 'ArrowDown') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 30) goToNext();
    else if (e.deltaY < -30) goToPrev();
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (container && activeTab === 'live') {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel, activeTab]);

  const handleOpenGift = (sessionId: string, hostId: string) => {
    setGiftSessionId(sessionId);
    setGiftHostId(hostId);
    setShowGiftModal(true);
  };

  const handleBackToFeed = () => {
    setSelectedSession(null);
    setActiveTab('feed');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Kick.com Style Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#18181b] border-b border-white/5">
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

          {/* Center: Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'feed') setSelectedSession(null); }} className="w-auto">
            <TabsList className="bg-white/5 h-8">
              <TabsTrigger value="feed" className="text-xs px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7">
                <Home className="h-3 w-3 mr-1.5" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="live" className="text-xs px-3 data-[state=active]:bg-black data-[state=active]:text-white h-7">
                <Radio className="h-3 w-3 mr-1.5" />
                Live
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Additional nav links */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <Link to="/global-heatmap">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white h-8 px-2 text-xs">
                <Flame className="h-3 w-3 mr-1" />
                Heatmap
              </Button>
            </Link>
            <Link to="/radio-stations">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white h-8 px-2 text-xs">
                <Music className="h-3 w-3 mr-1" />
                Radio
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

      {activeTab === 'live' && currentPodcast ? (
        /* Live Session View */
        <div 
          ref={containerRef}
          className="h-[100dvh] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative h-full w-full flex flex-col bg-black">
            {/* Full height session with self-contained controls */}
            <div className="flex-1 min-h-0 pt-12 flex flex-col">
              {/* Participants section */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <SpaceParticipants 
                  sessionId={currentPodcast.id}
                  hostId={currentPodcast.host_id}
                  isHost={user?.id === currentPodcast.host_id}
                  title={currentPodcast.title}
                  hostName={currentPodcast.host_name}
                  hostAvatar={currentPodcast.host_avatar}
                />
              </div>

              {/* Comments section with controls */}
              <div className="shrink-0">
                <TwitchComments 
                  sessionId={currentPodcast.id}
                  hostId={currentPodcast.host_id}
                  onSendGift={() => handleOpenGift(currentPodcast.id, currentPodcast.host_id)}
                  sessionTitle={currentPodcast.title}
                  isHost={user?.id === currentPodcast.host_id}
                />
              </div>
            </div>

            {/* Swipe hint */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-white/40 z-10">
              Swipe for more sessions
            </div>
          </div>
        </div>
      ) : (
        <PodcastFeed />
      )}

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={giftSessionId}
        hostId={giftHostId}
      />

      {/* Host Studio */}
      <HostStudio
        isOpen={showHostStudio}
        onClose={() => setShowHostStudio(false)}
        session={null}
      />

      {/* Mobile Bottom Navigation removed as requested */}
    </div>
  );
};

export default Podcasts;
