import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Heart, Gift, Share2, UserPlus, Headphones,
  ChevronUp, ChevronDown, Crown, MessageSquare, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SpaceParticipants from './SpaceParticipants';
import TwitchComments from './TwitchComments';
import TikTokGiftModal from './TikTokGiftModal';
import GiftAnimation from './GiftAnimation';
import ShareModal from './ShareModal';
import TikTokGiftDisplay from './TikTokGiftDisplay';
import DemoLiveSpace from './DemoLiveSpace';
import TopEngagementModal from './TopEngagementModal';
import DailyRankingModal from './DailyRankingModal';
import { toast } from 'sonner';
import { isValidUUID, isDemoLiveSession } from '@/lib/authUtils';
import { getDemoPodcastSession, getDemoPodcastSession2, getDemoPodcastSession3, getDemoSessionById, DEMO_SESSION_ID, DEMO_SESSION_ID_2, DEMO_SESSION_ID_3, isDemoSessionId } from '@/config/demoSpace';
import { getRandomAvatarUrl } from '@/lib/randomAvatars';

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

interface TopGifter {
  id: string;
  user_id: string;
  total_points: number;
  user_name?: string;
  user_avatar?: string;
}

interface KickStyleLiveProps {
  sessions: PodcastSession[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  selectedSession: PodcastSession | null;
  onSessionSelect: (session: PodcastSession | null) => void;
  hostLiveSession?: { id: string; title: string; listener_count: number } | null;
}

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const KickStyleLive = ({
  sessions,
  currentIndex,
  onIndexChange,
  selectedSession,
  onSessionSelect,
  hostLiveSession
}: KickStyleLiveProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [recommendedSessions, setRecommendedSessions] = useState<PodcastSession[]>([]);
  const [showEngagementModal, setShowEngagementModal] = useState(false);
  const [showDailyRanking, setShowDailyRanking] = useState(false);
  const [engagementCount, setEngagementCount] = useState(13);

  // Build a combined list of all scrollable sessions (demo + real)
  const allSessions = useMemo(() => {
    const demoSessions = [getDemoPodcastSession(), getDemoPodcastSession2(), getDemoPodcastSession3()];
    const realIds = new Set(sessions.map(s => s.id));
    const demoIds = new Set(demoSessions.map(s => s.id));
    // Combine: demos first, then real sessions not already included
    const combined = [...demoSessions, ...sessions.filter(s => !demoIds.has(s.id))];
    return combined;
  }, [sessions]);

  // Find the current index in allSessions based on selectedSession
  const activeIndex = useMemo(() => {
    if (!selectedSession) return 0;
    const idx = allSessions.findIndex(s => s.id === selectedSession.id);
    return idx >= 0 ? idx : 0;
  }, [selectedSession, allSessions]);

  const currentSession = selectedSession || allSessions[activeIndex] || sessions[currentIndex];

  const [listenerCount, setListenerCount] = useState(0);

  // Fetch follow status
  useEffect(() => {
    if (!user || !currentSession) return;
    
    const checkFollowStatus = async () => {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', currentSession.host_id)
        .single();
      
      setIsFollowing(!!data);
    };

    const fetchFollowerCount = async () => {
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', currentSession.host_id);
      
      setFollowerCount(count || 0);
    };

    checkFollowStatus();
    fetchFollowerCount();
  }, [user, currentSession]);

  // Real-time listener count
  useEffect(() => {
    if (!currentSession) return;

    // Demo sessions use simulated listener counts
    if (isDemoSessionId(currentSession.id)) {
      setListenerCount(currentSession.listener_count || 127);
      const interval = setInterval(() => {
        setListenerCount(prev => {
          const change = Math.floor(Math.random() * 11) - 5;
          return Math.max(85, Math.min(200, prev + change));
        });
      }, 8000 + Math.random() * 4000);
      return () => clearInterval(interval);
    }

    // Real sessions - fetch from DB
    const fetchListenerCount = async () => {
      const { count } = await supabase
        .from('podcast_participants')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', currentSession.id);
      
      setListenerCount(count || currentSession.listener_count || 0);
    };

    fetchListenerCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`listeners-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_participants',
          filter: `session_id=eq.${currentSession.id}`
        },
        () => {
          fetchListenerCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

// Fetch top gifters for current session with real-time updates
  useEffect(() => {
    if (!currentSession) return;

    // Demo sessions use simulated top gifters
    if (isDemoSessionId(currentSession.id)) {
      const demoGifterNames = ['ThoughtLeader', 'MindfulMike', 'GrowthMaster', 'WisdomSeeker', 'DeepThinker', 'SoulfulSara', 'PositivePete', 'BookWorm'];
      setTopGifters(demoGifterNames.map((name, i) => ({
        id: `demo-gifter-${i}`,
        user_id: `demo-gifter-${i}`,
        total_points: Math.max(10, Math.floor(120 - i * 12 + Math.random() * 15)),
        user_name: name,
        user_avatar: getRandomAvatarUrl(name),
      })));
      return;
    }

    const fetchTopGifters = async () => {
      const { data: gifts } = await supabase
        .from('podcast_gifts')
        .select('sender_id, points_value')
        .eq('session_id', currentSession.id);

      if (!gifts || gifts.length === 0) {
        setTopGifters([]);
        return;
      }

      // Aggregate by sender
      const gifterMap = new Map<string, number>();
      gifts.forEach(g => {
        gifterMap.set(g.sender_id, (gifterMap.get(g.sender_id) || 0) + g.points_value);
      });

      // Get top 10
      const sortedGifters = Array.from(gifterMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Fetch profiles
      const userIds = sortedGifters.map(([id]) => id).filter(isValidUUID);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setTopGifters(sortedGifters.map(([userId, total]) => ({
        id: userId,
        user_id: userId,
        total_points: total,
        user_name: profileMap.get(userId)?.full_name || profileMap.get(userId)?.username || 'Anonymous',
        user_avatar: profileMap.get(userId)?.avatar_url || undefined
      })));
    };

    fetchTopGifters();

    // Subscribe to real-time gift updates
    const channel = supabase
      .channel(`gifts-${currentSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_gifts',
          filter: `session_id=eq.${currentSession.id}`
        },
        () => {
          fetchTopGifters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSession]);

  // Fetch recommended sessions - include demo sessions + real live sessions
  useEffect(() => {
    const fetchRecommended = async () => {
      // Build demo sessions list (excluding current)
      const demoRecommended = [getDemoPodcastSession(), getDemoPodcastSession2(), getDemoPodcastSession3()]
        .filter(s => s.id !== currentSession?.id);

      // Fetch real live sessions
      let realSessions: PodcastSession[] = [];
      try {
        const { data: liveSessions } = await supabase
          .from('podcast_sessions')
          .select('id, host_id, title, description, cover_image_url, status, listener_count, started_at')
          .eq('status', 'live')
          .not('title', 'ilike', 'Battle:%')
          .limit(8);

        if (liveSessions && liveSessions.length > 0) {
          const hostIds = liveSessions.map(s => s.host_id).filter(isValidUUID);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, username')
            .in('user_id', hostIds.length > 0 ? hostIds : ['00000000-0000-0000-0000-000000000000']);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

          realSessions = liveSessions
            .filter(s => s.id !== currentSession?.id)
            .map(s => ({
              ...s,
              status: s.status as 'scheduled' | 'live' | 'ended',
              host_name: profileMap.get(s.host_id)?.full_name || profileMap.get(s.host_id)?.username || 'Host',
              host_avatar: profileMap.get(s.host_id)?.avatar_url || null,
            }));
        }
      } catch (err) {
        console.error('Error fetching recommended sessions:', err);
      }

      // Combine demo + real, deduplicate
      const realIds = new Set(realSessions.map(s => s.id));
      const combined = [...demoRecommended.filter(s => !realIds.has(s.id)), ...realSessions].slice(0, 8);
      setRecommendedSessions(combined);
    };

    fetchRecommended();
  }, [sessions, currentSession]);

  // Gradually increase engagement count for demo sessions
  useEffect(() => {
    if (!currentSession || !isDemoSessionId(currentSession.id)) return;
    const interval = setInterval(() => {
      setEngagementCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 10000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, [sessions, currentSession]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow');
      return;
    }
    if (!currentSession) return;

    // Demo sessions use local state only (host IDs aren't valid UUIDs)
    if (isDemoSessionId(currentSession.id)) {
      setIsFollowing(prev => !prev);
      toast.success(isFollowing ? 'Unfollowed' : 'Following!');
      return;
    }

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', currentSession.host_id);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
      toast.success('Unfollowed');
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: currentSession.host_id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
      toast.success('Following!');
    }
  };

  // Vertical scroll navigation
  const goToNext = useCallback(() => {
    const maxIndex = allSessions.length - 1;
    const newIndex = Math.min(activeIndex + 1, maxIndex);
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
      onSessionSelect(allSessions[newIndex]);
    }
  }, [allSessions, activeIndex, onIndexChange, onSessionSelect]);

  const goToPrev = useCallback(() => {
    const newIndex = Math.max(activeIndex - 1, 0);
    if (newIndex !== activeIndex) {
      onIndexChange(newIndex);
      onSessionSelect(allSessions[newIndex]);
    }
  }, [allSessions, activeIndex, onIndexChange, onSessionSelect]);

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

  const lastScrollTime = useRef(0);
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastScrollTime.current < 600) return; // debounce
    if (e.deltaY > 30) { lastScrollTime.current = now; goToNext(); }
    else if (e.deltaY < -30) { lastScrollTime.current = now; goToPrev(); }
  }, [goToNext, goToPrev]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Fallback fetch if sessions prop is empty - exclude battle sessions
  useEffect(() => {
    if (sessions.length === 0 && !selectedSession) {
      const fetchFallbackSessions = async () => {
        try {
          // IMPORTANT: Filter out battle sessions
          const { data, error } = await supabase
            .from('podcast_sessions')
            .select('*')
            .eq('status', 'live')
            .not('title', 'ilike', 'Battle:%') // Exclude battle sessions
            .order('listener_count', { ascending: false })
            .limit(10);
          
          if (error) {
            if (error.message?.includes('JWT') || error.code === 'PGRST303') {
              await supabase.auth.refreshSession();
            }
            return;
          }
          
          if (data && data.length > 0) {
            // Fetch profiles
            const hostIds = data.map(s => s.host_id).filter(isValidUUID);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, full_name, avatar_url, username')
              .in('user_id', hostIds);
            
            const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
            
            const enriched = data.map(s => ({
              ...s,
              status: s.status as 'scheduled' | 'live' | 'ended',
              host_name: profileMap.get(s.host_id)?.full_name || profileMap.get(s.host_id)?.username || 'Host',
              host_avatar: profileMap.get(s.host_id)?.avatar_url || null,
            }));
            
            if (enriched.length > 0) {
              onSessionSelect(enriched[0]);
            }
          }
        } catch (err) {
          console.error('Fallback fetch error:', err);
        }
      };
      
      fetchFallbackSessions();
    }
  }, [sessions.length, selectedSession, onSessionSelect]);

  if (!currentSession) {
    // If no session, try to show demo session as fallback
    const demoSession = getDemoPodcastSession();
    if (demoSession) {
      // Render with demo session instead of showing empty state
      return (
        <div 
          className="h-[100dvh] overflow-hidden bg-[#0e0e10] scrollbar-hide"
        >
          <div className="h-full flex pt-12">
            {/* Main Content Area with Demo */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <DemoLiveSpace onLeave={() => {}} />
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/60 gap-4 pt-20">
        <div className="animate-pulse w-16 h-16 rounded-full bg-white/10" />
        <p className="text-sm">Looking for live sessions...</p>
        <p className="text-xs text-white/40">Check back later or start your own stream!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] overflow-hidden bg-[#0e0e10] scrollbar-hide"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`h-full flex ${hostLiveSession ? 'pt-[88px]' : 'pt-12'}`}>
        {/* Left Sidebar - Recommendations & Gifters (Desktop only) */}
        <aside className="hidden lg:flex flex-col w-60 bg-[#18181b] border-r border-white/5 overflow-y-auto scrollbar-hide">
          {/* Recommended Section */}
          <div className="p-3 border-b border-white/5">
            <h3 className="text-[10px] font-semibold text-white/50 uppercase mb-3 tracking-wider">
              Recommended Channels
            </h3>
            <div className="space-y-1">
              {recommendedSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session)}
                  className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700">
                      {session.host_avatar ? (
                        <img src={session.host_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#18181b]" />
                  </div>
                  <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate group-hover:text-white/80">
                      {session.host_name}
                    </p>
                    <p className="text-[10px] text-white/40 truncate">{session.title}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-red-400">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    {formatViewers(session.listener_count)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Gifters Section */}
          <div className="p-3">
            <h3 className="text-[10px] font-semibold text-white/50 uppercase mb-3 tracking-wider flex items-center gap-2">
              <Crown className="h-3 w-3 text-yellow-400" />
              Top Gifters
            </h3>
            <div className="space-y-1">
              {topGifters.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No gifters yet</p>
              ) : (
                topGifters.map((gifter, i) => (
                  <div
                    key={gifter.id}
                    className="flex items-center gap-2 p-2 rounded bg-white/5"
                  >
                    <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/40'}`}>
                      #{i + 1}
                    </span>
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                      {gifter.user_avatar ? (
                        <img src={gifter.user_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{gifter.user_name}</p>
                    </div>
                    <span className="text-xs text-yellow-400 font-medium">{gifter.total_points}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* Video/Audio Space Area */}
          <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
            {/* Participants (Audio Room) or Demo Space */}
            <div className="flex-1 min-h-0 overflow-hidden bg-black">
              {isDemoLiveSession(currentSession.id) ? (
                <DemoLiveSpace key={currentSession.id} onLeave={() => onSessionSelect(null)} sessionId={currentSession.id} />
              ) : (
                <SpaceParticipants 
                  key={currentSession.id}
                  sessionId={currentSession.id}
                  hostId={currentSession.host_id}
                  isHost={user?.id === currentSession.host_id}
                  title={currentSession.title}
                  hostName={currentSession.host_name}
                  hostAvatar={currentSession.host_avatar}
                />
              )}
            </div>


            {/* Mobile Chat - Collapsible */}
            <div className="lg:hidden shrink-0 h-[200px] border-t border-white/5">
              <TwitchComments 
                key={`mobile-chat-${currentSession.id}`}
                sessionId={currentSession.id}
                hostId={currentSession.host_id}
                onSendGift={() => setShowGiftModal(true)}
                sessionTitle={currentSession.title}
                isHost={user?.id === currentSession.host_id}
              />
            </div>
          </div>

          {/* Right Sidebar - Chat (Desktop) */}
          <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-white/5 bg-[#18181b]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Stream Chat
              </h3>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <TwitchComments 
                key={`desktop-chat-${currentSession.id}`}
                sessionId={currentSession.id}
                hostId={currentSession.host_id}
                onSendGift={() => setShowGiftModal(true)}
                sessionTitle={currentSession.title}
                isHost={user?.id === currentSession.host_id}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Scroll navigation indicators */}
      {allSessions.length > 1 && (
        <>
          {/* Dot indicators */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1.5">
            {allSessions.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { onIndexChange(i); onSessionSelect(allSessions[i]); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
          {/* Up/Down arrows */}
          {activeIndex > 0 && (
            <button onClick={goToPrev} className="absolute top-16 left-1/2 -translate-x-1/2 z-50 text-white/40 hover:text-white animate-bounce">
              <ChevronUp className="h-6 w-6" />
            </button>
          )}
          {activeIndex < allSessions.length - 1 && (
            <button onClick={goToNext} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 text-white/40 hover:text-white animate-bounce">
              <ChevronDown className="h-6 w-6" />
            </button>
          )}
        </>
      )}

      {/* Gift Animation Overlay - TikTok style */}
      <GiftAnimation key={`gift-${currentSession.id}`} sessionId={currentSession.id} />
      
      {/* TikTok-style gift display */}
      <TikTokGiftDisplay key={`tiktok-gift-${currentSession.id}`} sessionId={currentSession.id} />

      {/* Modals */}
      <TikTokGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={currentSession.id}
        hostId={currentSession.host_id}
        hostName={currentSession.host_name}
        battleMode={false}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sessionId={currentSession.id}
        title={currentSession.title}
      />

      <TopEngagementModal
        isOpen={showEngagementModal}
        onClose={() => setShowEngagementModal(false)}
        sessionId={currentSession.id}
        onSendGift={() => setShowGiftModal(true)}
      />

      <DailyRankingModal
        isOpen={showDailyRanking}
        onClose={() => setShowDailyRanking(false)}
        sessionId={currentSession.id}
        onSendGift={() => setShowGiftModal(true)}
      />
    </div>
  );
};

export default KickStyleLive;
