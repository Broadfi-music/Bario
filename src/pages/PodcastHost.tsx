import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, Users, Calendar, Play, Heart, Share2, 
  MoreHorizontal, Clock, Radio, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFollowSystem } from '@/hooks/useFollowSystem';
import { toast } from 'sonner';

interface HostProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  duration_ms: number | null;
  play_count: number;
  like_count: number;
  created_at: string;
}

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
}

// Only show real signed users - no demo data

const PodcastHost = () => {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, toggleFollow, getFollowerCount } = useFollowSystem();
  const [activeTab, setActiveTab] = useState('episodes');
  const [host, setHost] = useState<(HostProfile & { followerCount: number; isLive: boolean; liveSessionId?: string }) | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!hostId) return;

    // Only fetch real host data from database
    const fetchHostData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', hostId)
        .single();

      if (profile) {
        const count = await getFollowerCount(hostId);
        
        // Check if host is live
        const { data: liveSession } = await supabase
          .from('podcast_sessions')
          .select('id')
          .eq('host_id', hostId)
          .eq('status', 'live')
          .single();

        setHost({
          id: profile.user_id,
          username: profile.username || 'Unknown',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          followerCount: count,
          isLive: !!liveSession,
          liveSessionId: liveSession?.id
        });
        setFollowerCount(count);
      }

      // Fetch episodes
      const { data: episodesData } = await supabase
        .from('podcast_episodes')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (episodesData) setEpisodes(episodesData);

      // Fetch schedule
      const { data: scheduleData } = await supabase
        .from('podcast_schedules')
        .select('*')
        .eq('user_id', hostId)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });

      if (scheduleData) setSchedule(scheduleData);

      setLoading(false);
    };

    fetchHostData();
  }, [hostId, getFollowerCount]);

  const handleFollow = async () => {
    if (!hostId) return;
    const result = await toggleFollow(hostId);
    if (result) {
      setFollowerCount(prev => prev + (isFollowing(hostId) ? -1 : 1));
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '0:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const goToLiveSession = () => {
    if (host?.liveSessionId) {
      navigate(`/podcasts?session=${host.liveSessionId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <p>Host not found</p>
        <Button onClick={() => navigate('/podcasts')} variant="outline">
          Back to Podcasts
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-green-600 via-green-500 to-teal-600">
        <div className="absolute inset-0 bg-black/20" />
        <button 
          onClick={() => navigate('/podcasts')}
          className="absolute top-4 left-4 z-10 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Section */}
      <div className="relative px-4 pb-4">
        {/* Avatar */}
        <div className="absolute -top-16 left-4">
          <div className="relative">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-black overflow-hidden bg-neutral-800">
              {host.avatar_url ? (
                <img src={host.avatar_url} alt={host.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-3xl font-bold">
                  {(host.full_name || host.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Live indicator */}
            {host.isLive && (
              <button 
                onClick={goToLiveSession}
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse cursor-pointer hover:bg-red-500"
              >
                LIVE
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={handleFollow}
            variant={isFollowing(hostId || '') ? 'outline' : 'default'}
            className={`${isFollowing(hostId || '') ? 'border-green-500 text-green-500 hover:bg-green-500/10' : 'bg-green-500 hover:bg-green-400 text-black'}`}
          >
            {isFollowing(hostId || '') ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Following
              </>
            ) : (
              'Follow'
            )}
          </Button>
          <Button variant="outline" size="icon" className="border-white/20">
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="border-white/20">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{host.full_name || host.username}</h1>
            <div className="bg-blue-500 rounded-full p-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
            </div>
          </div>
          <p className="text-white/60 text-sm">@{host.username}</p>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-white/60" />
              <span className="font-bold">{formatFollowers(followerCount)}</span>
              <span className="text-white/60">Followers</span>
            </div>
          </div>

          {/* Bio */}
          {host.bio && (
            <p className="mt-3 text-sm text-white/80">{host.bio}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b border-white/10 rounded-none h-auto pb-0">
          <TabsTrigger 
            value="episodes" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent px-4 py-3"
          >
            Episodes
          </TabsTrigger>
          <TabsTrigger 
            value="schedule" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent px-4 py-3"
          >
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="mt-0">
          <div className="divide-y divide-white/10">
            {episodes.length === 0 ? (
              <div className="py-12 text-center text-white/40">
                No episodes yet
              </div>
            ) : (
              episodes.map((episode) => (
                <div key={episode.id} className="flex gap-3 p-4 hover:bg-white/5 transition-colors cursor-pointer">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                    {episode.cover_image_url ? (
                      <img src={episode.cover_image_url} alt={episode.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {formatDuration(episode.duration_ms)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm md:text-base line-clamp-2">{episode.title}</h3>
                    {episode.description && (
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">{episode.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {episode.play_count.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {episode.like_count.toLocaleString()}
                      </span>
                      <span>{formatDate(episode.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="mt-0">
          <div className="divide-y divide-white/10">
            {schedule.length === 0 ? (
              <div className="py-12 text-center text-white/40">
                No upcoming shows scheduled
              </div>
            ) : (
              schedule.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-white/60 truncate">{item.description}</p>
                    )}
                    <p className="text-xs text-green-500 mt-1">{formatDate(item.scheduled_at)}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10">
                    Remind
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PodcastHost;
