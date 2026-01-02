import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Radio, Edit, Settings, Users, Gift, Heart, Share2, 
  Play, Pause, ChevronLeft, Loader2, Bell
} from 'lucide-react';
import { RadioLiveSidebar } from '@/components/radio/RadioLiveSidebar';

interface RadioStation {
  id: string;
  user_id: string;
  station_name: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  website_url: string | null;
  stream_url: string | null;
  is_live: boolean;
  listener_count: number;
}

interface HostProfile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const formatFollowers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const RadioFeedProfile = () => {
  const { hostId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [station, setStation] = useState<RadioStation | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const isOwner = user?.id === hostId;
  const targetUserId = hostId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchData();
    } else if (!user) {
      navigate('/auth');
    }
  }, [targetUserId, user]);

  const fetchData = async () => {
    if (!targetUserId) return;
    setLoading(true);

    // Fetch station
    const { data: stationData, error: stationError } = await supabase
      .from('radio_stations')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (stationError && !stationData) {
      // Create station if viewing own profile and doesn't exist
      if (isOwner) {
        const { data: newStation } = await supabase
          .from('radio_stations')
          .insert({ user_id: targetUserId, station_name: 'My Radio Station' })
          .select()
          .single();
        
        if (newStation) {
          setStation(newStation);
        }
      }
    } else if (stationData) {
      setStation(stationData);
    }

    // Fetch host profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url, bio')
      .eq('user_id', targetUserId)
      .single();

    if (profileData) {
      setHostProfile(profileData);
    }

    // Fetch follower count
    const { count: followers } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', targetUserId);

    setFollowerCount(followers || 0);

    // Check if current user follows
    if (user && user.id !== targetUserId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();
      setIsFollowing(!!followData);
    }

    // Fetch subscriber count
    if (stationData) {
      const { count: subs } = await supabase
        .from('radio_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('station_id', stationData.id);

      setSubscriberCount(subs || 0);

      // Check if current user is subscribed
      if (user) {
        const { data: subData } = await supabase
          .from('radio_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('station_id', stationData.id)
          .single();
        setIsSubscribed(!!subData);
      }
    }

    setLoading(false);
  };

  const togglePlay = async () => {
    if (!station?.stream_url) {
      toast.error('No stream URL configured');
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = station.stream_url;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          toast.error('Failed to play stream');
        }
      }
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow');
      return;
    }

    if (!targetUserId) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
      toast.success('Unfollowed');
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId
        });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
      toast.success('Following');
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    if (!station) return;

    if (isSubscribed) {
      await supabase
        .from('radio_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('station_id', station.id);
      setIsSubscribed(false);
      setSubscriberCount(prev => Math.max(0, prev - 1));
      toast.success('Unsubscribed');
    } else {
      await supabase
        .from('radio_subscriptions')
        .insert({
          user_id: user.id,
          station_id: station.id
        });
      setIsSubscribed(true);
      setSubscriberCount(prev => prev + 1);
      toast.success('Subscribed');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleGift = () => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }
    toast.info('Gift feature coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#53fc18] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Sidebar */}
      <RadioLiveSidebar />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#18181b] border-b border-white/5">
        <div className="flex items-center justify-between h-12 px-3 lg:ml-56">
          <button onClick={() => navigate('/radio-stations')} className="flex items-center gap-1 text-white/60 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-white font-bold">BARIO</span>
          <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 text-white/60 hover:text-white">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="lg:ml-56 pt-12 pb-20">
        {/* Banner */}
        <div className="relative h-32 sm:h-48 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
          {station?.cover_image_url && (
            <img src={station.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#0e0e10] bg-neutral-800">
                {station?.logo_url || hostProfile?.avatar_url ? (
                  <img src={station?.logo_url || hostProfile?.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Radio className="h-10 w-10 text-white" />
                  </div>
                )}
              </div>
              {station?.is_live && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{station?.station_name || 'Radio Station'}</h1>
            {hostProfile?.username && (
              <p className="text-white/50 text-sm">@{hostProfile.username}</p>
            )}
          </div>

          {station?.description && (
            <p className="text-white/70 text-sm mb-4 max-w-xl">{station.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-white/50" />
              <span className="font-semibold">{formatFollowers(followerCount)}</span>
              <span className="text-white/50 text-sm">Followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-white/50" />
              <span className="font-semibold">{formatFollowers(subscriberCount)}</span>
              <span className="text-white/50 text-sm">Subscribers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-white/50" />
              <span className="font-semibold">{formatFollowers(station?.listener_count || 0)}</span>
              <span className="text-white/50 text-sm">Listeners</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {station?.stream_url && (
              <Button 
                onClick={togglePlay}
                className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90"
              >
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-2" />Pause</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Listen</>
                )}
              </Button>
            )}
            
            {isOwner ? (
              <>
                <Button
                  onClick={() => navigate('/radio-feed')}
                  variant="outline"
                  className="border-white/20"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Station
                </Button>
                <Button
                  onClick={() => navigate('/radio-studio')}
                  variant="outline"
                  className="border-white/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Studio
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? "outline" : "default"}
                  className={isFollowing ? "border-[#53fc18] text-[#53fc18]" : "bg-[#53fc18] text-black hover:bg-[#53fc18]/90"}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFollowing ? 'fill-[#53fc18]' : ''}`} />
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button
                  onClick={handleSubscribe}
                  variant={isSubscribed ? "outline" : "secondary"}
                  className={isSubscribed ? "border-purple-500 text-purple-500" : ""}
                >
                  <Bell className={`h-4 w-4 mr-2 ${isSubscribed ? 'fill-purple-500' : ''}`} />
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Button>
                <Button
                  onClick={handleGift}
                  variant="outline"
                  className="border-white/20"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Gift
                </Button>
              </>
            )}
          </div>

          {/* Station Content */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">About This Station</h2>
            
            {station?.description ? (
              <p className="text-white/70 mb-4">{station.description}</p>
            ) : (
              <p className="text-white/50 italic mb-4">No description available</p>
            )}

            {station?.website_url && (
              <a 
                href={station.website_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#53fc18] hover:underline text-sm"
              >
                Visit Website →
              </a>
            )}

            {/* Host Info */}
            {hostProfile && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-medium text-white/50 mb-3">Hosted by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700">
                    {hostProfile.avatar_url ? (
                      <img src={hostProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{hostProfile.full_name || hostProfile.username || 'Radio Host'}</p>
                    {hostProfile.bio && (
                      <p className="text-sm text-white/50 line-clamp-1">{hostProfile.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RadioFeedProfile;
