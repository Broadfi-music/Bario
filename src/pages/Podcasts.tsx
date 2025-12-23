import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronUp, ChevronDown, Play, Pause, Mic, 
  Users, Heart, MessageSquare, Share2, Radio, Calendar,
  Volume2, VolumeX, Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwitchComments from '@/components/podcast/TwitchComments';
import SpaceParticipants from '@/components/podcast/SpaceParticipants';
import GiftModal from '@/components/podcast/GiftModal';
import HostStudio from '@/components/podcast/HostStudio';
import ScheduleManager from '@/components/podcast/ScheduleManager';
import PodcastEpisodes from '@/components/podcast/PodcastEpisodes';
import { toast } from 'sonner';

interface PodcastSession {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: 'scheduled' | 'live' | 'ended';
  listener_count: number;
  started_at: string | null;
}

// Demo podcasts for TikTok-style feed
const DEMO_PODCASTS = [
  {
    id: 'demo-1',
    host_id: 'host-1',
    title: 'The Rise of Afrobeats in America',
    description: 'Discussing how Afrobeats is taking over the US music scene',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    status: 'live' as const,
    listener_count: 1247,
    host_name: 'DJ Akademiks',
    host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
  },
  {
    id: 'demo-2',
    host_id: 'host-2',
    title: 'Producer Secrets: Making Hits',
    description: 'Metro Boomin reveals his production techniques',
    cover_image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
    status: 'live' as const,
    listener_count: 892,
    host_name: 'Metro Boomin',
    host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'
  },
  {
    id: 'demo-3',
    host_id: 'host-3',
    title: 'K-Pop Global Domination',
    description: 'How K-Pop conquered the world music industry',
    cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    status: 'live' as const,
    listener_count: 2341,
    host_name: 'Eric Nam',
    host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100'
  },
  {
    id: 'demo-4',
    host_id: 'host-4',
    title: 'Latin Music Revolution',
    description: 'Reggaeton and its impact on global charts',
    cover_image_url: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=800',
    status: 'live' as const,
    listener_count: 1567,
    host_name: 'J Balvin',
    host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100'
  },
  {
    id: 'demo-5',
    host_id: 'host-5',
    title: 'Indie Artist Spotlight',
    description: 'Underground artists you need to know',
    cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    status: 'live' as const,
    listener_count: 654,
    host_name: 'Phoebe Bridgers',
    host_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'
  }
];

const Podcasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showHostStudio, setShowHostStudio] = useState(false);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('live');
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [liveSessions, setLiveSessions] = useState<PodcastSession[]>([]);

  const podcasts = [...DEMO_PODCASTS, ...liveSessions.map(s => ({
    ...s,
    host_name: 'Host',
    host_avatar: null
  }))];

  const currentPodcast = podcasts[currentIndex];

  useEffect(() => {
    fetchLiveSessions();
    
    // Subscribe to new sessions
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
    const { data } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('status', 'live')
      .order('listener_count', { ascending: false });
    
    if (data) setLiveSessions(data as PodcastSession[]);
  };

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % podcasts.length);
  }, [podcasts.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + podcasts.length) % podcasts.length);
  }, [podcasts.length]);

  // Handle touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') goToPrev();
      if (e.key === 'ArrowDown') goToNext();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isPlaying]);

  // Handle scroll wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 30) {
      goToNext();
    } else if (e.deltaY < -30) {
      goToPrev();
    }
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const toggleLike = (id: string) => {
    setLiked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const sharePodcast = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied!');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </button>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-white/10 h-8">
              <TabsTrigger value="live" className="text-xs px-4 data-[state=active]:bg-red-500">
                <Radio className="h-3 w-3 mr-1" />
                Live
              </TabsTrigger>
              <TabsTrigger value="episodes" className="text-xs px-4">
                <Headphones className="h-3 w-3 mr-1" />
                Episodes
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs px-4">
                <Calendar className="h-3 w-3 mr-1" />
                Schedule
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            {user && (
              <Button
                onClick={() => setShowHostStudio(true)}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-xs h-8"
              >
                <Mic className="h-3 w-3 mr-1" />
                Go Live
              </Button>
            )}
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" variant="outline" className="text-xs h-8 border-white/20">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-xs h-8">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {activeTab === 'live' ? (
        /* TikTok-style Vertical Feed - Fitted height */
        <div 
          ref={containerRef}
          className="h-[100dvh] overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {currentPodcast && (
            <div className="relative h-full w-full flex flex-col bg-black">
              {/* Twitter Space Style Participants - Takes most of the screen */}
              <div className="flex-1 min-h-0 pt-14">
                <SpaceParticipants 
                  sessionId={currentPodcast.id}
                  hostId={currentPodcast.host_id}
                  isHost={user?.id === currentPodcast.host_id}
                  title={currentPodcast.title}
                />
              </div>

              {/* Bottom - Comments (Twitch Style) */}
              <div className="h-48 md:h-56 shrink-0">
                <TwitchComments 
                  sessionId={currentPodcast.id}
                  onSendGift={() => setShowGiftModal(true)}
                />
              </div>

              {/* Navigation Indicators */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {podcasts.map((_, i) => (
                  <div 
                    key={i}
                    className={`w-1 rounded-full transition-all ${
                      i === currentIndex ? 'h-4 bg-white' : 'h-1.5 bg-white/30'
                    }`}
                  />
                ))}
              </div>

              {/* Swipe hint */}
              <div className="absolute bottom-52 md:bottom-60 left-1/2 -translate-x-1/2 text-[10px] text-white/40">
                Swipe for more
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'episodes' ? (
        <main className="pt-20 pb-6 px-4 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Podcast Episodes</h2>
          <PodcastEpisodes />
        </main>
      ) : (
        <main className="pt-20 pb-6 px-4 max-w-2xl mx-auto">
          <ScheduleManager />
        </main>
      )}

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={currentPodcast?.id || ''}
        hostId={currentPodcast?.host_id || ''}
      />

      {/* Host Studio */}
      <HostStudio
        isOpen={showHostStudio}
        onClose={() => setShowHostStudio(false)}
        session={null}
      />
    </div>
  );
};

export default Podcasts;
