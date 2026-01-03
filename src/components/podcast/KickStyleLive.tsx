import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Heart, Gift, Share2, UserPlus, Eye,
  ChevronUp, ChevronDown, Crown, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import SpaceParticipants from './SpaceParticipants';
import TwitchComments from './TwitchComments';
import GiftModal from './GiftModal';
import ShareModal from './ShareModal';
import { toast } from 'sonner';
import { isValidUUID } from '@/lib/authUtils';

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

  const currentSession = selectedSession || sessions[currentIndex];

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

  // Fetch top gifters for current session
  useEffect(() => {
    if (!currentSession) return;

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
  }, [currentSession]);

  // Fetch recommended sessions (other live sessions)
  useEffect(() => {
    setRecommendedSessions(sessions.filter(s => s.id !== currentSession?.id).slice(0, 8));
  }, [sessions, currentSession]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow');
      return;
    }
    if (!currentSession) return;

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
    const maxIndex = sessions.length - 1;
    const newIndex = Math.min(currentIndex + 1, maxIndex);
    onIndexChange(newIndex);
    onSessionSelect(sessions[newIndex]);
  }, [sessions, currentIndex, onIndexChange, onSessionSelect]);

  const goToPrev = useCallback(() => {
    const newIndex = Math.max(currentIndex - 1, 0);
    onIndexChange(newIndex);
    onSessionSelect(sessions[newIndex]);
  }, [sessions, currentIndex, onIndexChange, onSessionSelect]);

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
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  if (!currentSession) {
    return (
      <div className="h-full flex items-center justify-center text-white/60">
        <p>No live sessions available</p>
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
                    <p className="text-xs font-medium text-white truncate group-hover:text-[#53fc18]">
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
            {/* Participants (Audio Room) */}
            <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-[#1a1a1d] to-[#0e0e10]">
              <SpaceParticipants 
                sessionId={currentSession.id}
                hostId={currentSession.host_id}
                isHost={user?.id === currentSession.host_id}
                title={currentSession.title}
                hostName={currentSession.host_name}
                hostAvatar={currentSession.host_avatar}
              />
            </div>

            {/* Action Bar - Below Video */}
            <div className="shrink-0 border-t border-white/5 bg-[#18181b] px-3 py-2 lg:px-4 lg:py-3">
              {/* Host Info Row */}
              <div className="flex items-center justify-between mb-2 lg:mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full overflow-hidden ring-2 ring-[#53fc18] cursor-pointer"
                    onClick={() => navigate(`/host/${currentSession.host_id}`)}
                  >
                    {currentSession.host_avatar ? (
                      <img src={currentSession.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-bold text-white text-sm lg:text-base cursor-pointer hover:text-[#53fc18]"
                        onClick={() => navigate(`/host/${currentSession.host_id}`)}
                      >
                        {currentSession.host_name}
                      </span>
                      <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">LIVE</span>
                    </div>
                    <p className="text-xs text-white/60 truncate max-w-[200px] lg:max-w-[300px]">
                      {currentSession.title}
                    </p>
                  </div>
                </div>

                {/* Viewer Count */}
                <div className="flex items-center gap-1.5 text-white/60">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">{formatViewers(currentSession.listener_count)} Viewers</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleFollow}
                  size="sm"
                  className={`h-8 px-3 text-xs font-semibold ${
                    isFollowing 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-[#53fc18] text-black hover:bg-[#53fc18]/90'
                  }`}
                >
                  <Heart className={`h-3.5 w-3.5 mr-1.5 ${isFollowing ? 'fill-red-500 text-red-500' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>

                <Button
                  onClick={() => setIsSubscribed(!isSubscribed)}
                  size="sm"
                  className={`h-8 px-3 text-xs font-semibold ${
                    isSubscribed 
                      ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' 
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>

                <Button
                  onClick={() => setShowGiftModal(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs font-semibold border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Gift className="h-3.5 w-3.5 mr-1.5" />
                  Gift
                </Button>

                <Button
                  onClick={() => setShowShareModal(true)}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs font-semibold border-white/20 text-white/70 hover:bg-white/5"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                  Share
                </Button>

                <span className="text-xs text-white/40 ml-auto hidden sm:block">
                  {formatViewers(followerCount)} followers
                </span>
              </div>
            </div>

            {/* Mobile Chat - Collapsible */}
            <div className="lg:hidden shrink-0 h-[200px] border-t border-white/5">
              <TwitchComments 
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

      {/* Modals */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={currentSession.id}
        hostId={currentSession.host_id}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sessionId={currentSession.id}
        title={currentSession.title}
      />
    </div>
  );
};

export default KickStyleLive;
