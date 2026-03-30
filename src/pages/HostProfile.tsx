import { useState, useEffect, useRef } from 'react';
import { getCreatorCover } from '@/lib/creatorCovers';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, Play, Calendar, Radio, Heart, Share2, Edit, MoreVertical, Pause, Plus, Mic, Trash2, UserPlus, MessageCircle, Image as ImageIcon, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { EditProfileModal } from '@/components/podcast/EditProfileModal';
import { EditEpisodeModal } from '@/components/podcast/EditEpisodeModal';
import { EditScheduleModal } from '@/components/podcast/EditScheduleModal';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface HostData {
  id: string;
  user_id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  follower_count: number;
  is_live: boolean;
  current_session_id: string | null;
}

interface Episode {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  play_count: number;
  created_at: string;
}

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
}

interface HostPost {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  like_count: number;
  created_at: string;
}

import { getDemoAvatar } from '@/lib/randomAvatars';
import { ALL_DEMO_SESSIONS } from '@/config/demoSessions';

// Demo host data
const DEMO_HOSTS: Record<string, HostData> = {
  'host-1': {
    id: 'host-1', user_id: 'host-1', full_name: 'DJ Akademiks', username: 'akademiks',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    bio: 'Hip-hop commentator, podcaster, and media personality. Breaking music news daily.',
    follower_count: 2500000, is_live: true, current_session_id: 'demo-1'
  },
  'host-2': {
    id: 'host-2', user_id: 'host-2', full_name: 'Metro Boomin', username: 'metroboomin',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    bio: 'Grammy-winning producer. If young Metro don\'t trust you...',
    follower_count: 1800000, is_live: true, current_session_id: 'demo-2'
  },
  'host-3': {
    id: 'host-3', user_id: 'host-3', full_name: 'Eric Nam', username: 'ericnam',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    bio: 'Korean-American singer and podcast host. Bridging cultures through music.',
    follower_count: 950000, is_live: true, current_session_id: 'demo-3'
  },
  'host-4': {
    id: 'host-4', user_id: 'host-4', full_name: 'J Balvin', username: 'jbalvin',
    avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    bio: 'Latin music icon. Reggaeton pioneer and global ambassador.',
    follower_count: 3200000, is_live: true, current_session_id: 'demo-4'
  },
  'host-5': {
    id: 'host-5', user_id: 'host-5', full_name: 'Phoebe Bridgers', username: 'phoebebridgers',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    bio: 'Indie artist, songwriter, and podcast enthusiast.',
    follower_count: 780000, is_live: true, current_session_id: 'demo-5'
  },
  ...Object.fromEntries(
    ALL_DEMO_SESSIONS.map(s => [
      s.hostId,
      {
        id: s.hostId, user_id: s.hostId, full_name: s.hostName,
        username: s.hostName.toLowerCase().replace(/[\s.]+/g, ''),
        avatar_url: s.hostAvatar || getDemoAvatar(s.hostName),
        bio: `${s.category} host on Bario. ${s.description}`,
        follower_count: s.baseListenerCount * 100 + Math.floor(Math.random() * 5000),
        is_live: true, current_session_id: s.id,
      } as HostData,
    ])
  ),
  'demo-speaker-1': { id: 'demo-speaker-1', user_id: 'demo-speaker-1', full_name: 'Mind Coach', username: 'mindcoach', avatar_url: getDemoAvatar('Mind Coach'), bio: 'Certified mindset coach.', follower_count: 12400, is_live: true, current_session_id: 'demo-live-session' },
  'demo-speaker-2': { id: 'demo-speaker-2', user_id: 'demo-speaker-2', full_name: 'Wisdom Seeker', username: 'wisdomseeker', avatar_url: getDemoAvatar('Wisdom Seeker'), bio: 'Philosophy enthusiast.', follower_count: 8900, is_live: true, current_session_id: 'demo-live-session' },
  'demo-speaker-3': { id: 'demo-speaker-3', user_id: 'demo-speaker-3', full_name: 'Jackson Johsep', username: 'jacksonjohsep', avatar_url: getDemoAvatar('Jackson Johsep'), bio: 'Serial entrepreneur.', follower_count: 19300, is_live: true, current_session_id: 'demo-live-session-2' },
  'demo-speaker-4': { id: 'demo-speaker-4', user_id: 'demo-speaker-4', full_name: 'Finance Guru', username: 'financeguru', avatar_url: getDemoAvatar('Finance Guru'), bio: 'Financial advisor.', follower_count: 15600, is_live: true, current_session_id: 'demo-live-session-3' },
  'demo-speaker-5': { id: 'demo-speaker-5', user_id: 'demo-speaker-5', full_name: 'Side Hustle Pro', username: 'sidehustlepro', avatar_url: getDemoAvatar('Side Hustle Pro'), bio: 'Freelancer turned entrepreneur.', follower_count: 11200, is_live: true, current_session_id: 'demo-live-session-3' },
  'demo-gifter-0': { id: 'demo-gifter-0', user_id: 'demo-gifter-0', full_name: 'ThoughtLeader', username: 'thoughtleader', avatar_url: getDemoAvatar('ThoughtLeader'), bio: 'Passionate about ideas.', follower_count: 8200, is_live: false, current_session_id: null },
  'demo-gifter-1': { id: 'demo-gifter-1', user_id: 'demo-gifter-1', full_name: 'MindfulMike', username: 'mindfulmike', avatar_url: getDemoAvatar('MindfulMike'), bio: 'Mindfulness practitioner.', follower_count: 5400, is_live: false, current_session_id: null },
  'demo-gifter-2': { id: 'demo-gifter-2', user_id: 'demo-gifter-2', full_name: 'GrowthMaster', username: 'growthmaster', avatar_url: getDemoAvatar('GrowthMaster'), bio: 'Always growing.', follower_count: 6100, is_live: false, current_session_id: null },
  'demo-gifter-3': { id: 'demo-gifter-3', user_id: 'demo-gifter-3', full_name: 'WisdomSeeker', username: 'wisdomseeker2', avatar_url: getDemoAvatar('WisdomSeeker'), bio: 'Seeking wisdom.', follower_count: 3800, is_live: false, current_session_id: null },
  'demo-gifter-4': { id: 'demo-gifter-4', user_id: 'demo-gifter-4', full_name: 'DeepThinker', username: 'deepthinker', avatar_url: getDemoAvatar('DeepThinker'), bio: 'Deep thoughts.', follower_count: 4500, is_live: false, current_session_id: null },
  'demo-gifter-5': { id: 'demo-gifter-5', user_id: 'demo-gifter-5', full_name: 'SoulfulSara', username: 'soulfulsara', avatar_url: getDemoAvatar('SoulfulSara'), bio: 'Music lover.', follower_count: 7300, is_live: false, current_session_id: null },
  'demo-gifter-6': { id: 'demo-gifter-6', user_id: 'demo-gifter-6', full_name: 'PositivePete', username: 'positivepete', avatar_url: getDemoAvatar('PositivePete'), bio: 'Spreading positivity.', follower_count: 2900, is_live: false, current_session_id: null },
  'demo-gifter-7': { id: 'demo-gifter-7', user_id: 'demo-gifter-7', full_name: 'BookWorm', username: 'bookworm', avatar_url: getDemoAvatar('BookWorm'), bio: 'Avid reader.', follower_count: 3200, is_live: false, current_session_id: null },
};

const formatFollowers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDuration = (ms: number | null) => {
  if (!ms) return '0:00';
  const minutes = Math.floor(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatScheduleDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatScheduleTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const HostProfile = () => {
  const { hostId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying, pauseTrack, resumeTrack } = useAudioPlayer();
  const [host, setHost] = useState<HostData | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [posts, setPosts] = useState<HostPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  
  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const postImageRef = useRef<HTMLInputElement>(null);
  
  // Edit modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEpisode, setShowEditEpisode] = useState(false);
  const [showEditSchedule, setShowEditSchedule] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  
  const isOwner = user?.id === hostId || user?.id === host?.user_id || (user && hostId?.startsWith('host-'));

  useEffect(() => {
    if (hostId) {
      fetchHostData();
      fetchPosts();
      setupRealtimeSubscription();
    }
  }, [hostId]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`host-followers-${hostId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${hostId}` }, () => {
        fetchFollowerCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchFollowerCount = async () => {
    if (!hostId) return;
    const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', hostId);
    if (count !== null) {
      setFollowerCount(count);
      if (host) setHost(prev => prev ? { ...prev, follower_count: count } : null);
    }
  };

  const fetchPosts = async () => {
    if (!hostId) return;
    const { data } = await supabase
      .from('host_posts')
      .select('*')
      .eq('user_id', hostId)
      .order('created_at', { ascending: false });
    if (data) setPosts(data as HostPost[]);
  };

  const fetchHostData = async () => {
    setLoading(true);
    
    if (hostId && DEMO_HOSTS[hostId]) {
      setHost(DEMO_HOSTS[hostId]);
      setFollowerCount(DEMO_HOSTS[hostId].follower_count);
      setLoading(false);
      return;
    }

    if (hostId && hostId.startsWith('demo-user-')) {
      const displayName = hostId.replace('demo-user-', '');
      setHost({
        id: hostId, user_id: hostId, full_name: displayName, username: displayName.toLowerCase(),
        avatar_url: getDemoAvatar(displayName), bio: `Active community member on Bario Space.`,
        follower_count: Math.floor(Math.random() * 5000) + 500, is_live: false, current_session_id: null,
      });
      setFollowerCount(Math.floor(Math.random() * 5000) + 500);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', hostId).single();

    if (profile) {
      const { count } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', hostId);
      setFollowerCount(count || 0);

      if (user) {
        const { data: followData } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', hostId).single();
        setIsFollowing(!!followData);
      }

      const { data: liveSession } = await supabase.from('podcast_sessions').select('id').eq('host_id', hostId).eq('status', 'live').single();
      const { data: episodeData } = await supabase.from('podcast_episodes').select('*').eq('host_id', hostId).order('created_at', { ascending: false });
      if (episodeData && episodeData.length > 0) setEpisodes(episodeData);

      const { data: scheduleData } = await supabase.from('podcast_schedules').select('*').eq('user_id', hostId).gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true });
      if (scheduleData && scheduleData.length > 0) setSchedules(scheduleData);

      setHost({
        id: profile.id, user_id: profile.user_id, full_name: profile.full_name || 'Host',
        username: profile.username, avatar_url: profile.avatar_url, bio: profile.bio,
        follower_count: count || 0, is_live: !!liveSession, current_session_id: liveSession?.id || null
      });
    } else if (hostId && DEMO_HOSTS[hostId]) {
      setHost(DEMO_HOSTS[hostId]);
      setFollowerCount(DEMO_HOSTS[hostId].follower_count);
    }
    
    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) { toast.error('Please sign in to follow'); return; }
    if (!host) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', host.user_id);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
      toast.success('Unfollowed');
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: host.user_id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
      toast.success('Following');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const goToLiveSession = () => {
    if (host?.current_session_id) navigate(`/podcasts?session=${host.current_session_id}`);
  };

  const handlePlayEpisode = (episode: Episode) => {
    if (!episode.audio_url) { toast.error('This episode has no recorded audio'); return; }
    if (currentTrack?.id === episode.id) {
      isPlaying ? pauseTrack() : resumeTrack();
    } else {
      playTrack({ id: episode.id, title: episode.title, artist: host?.full_name || 'Host', coverUrl: episode.cover_image_url || '', audioUrl: episode.audio_url, type: 'podcast' });
      toast.success(`Playing: ${episode.title}`);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    if (!user) return;
    if (!window.confirm('Delete this episode?')) return;
    setEpisodes(prev => prev.filter(e => e.id !== episodeId));
    const { error } = await supabase.from('podcast_episodes').delete().eq('id', episodeId).eq('host_id', user.id);
    if (error) { toast.error('Failed to delete episode'); fetchHostData(); return; }
    toast.success('Episode deleted');
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user) return;
    if (!window.confirm('Delete this schedule?')) return;
    const { error } = await supabase.from('podcast_schedules').delete().eq('id', scheduleId).eq('user_id', user.id);
    if (error) { toast.error('Failed to delete schedule'); return; }
    toast.success('Schedule deleted');
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  // Post image upload
  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPostImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-post-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-uploads').upload(`posts/${fileName}`, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-uploads').getPublicUrl(`posts/${fileName}`);
      setNewPostImage(publicUrl);
    } catch (err) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingPostImage(false);
    }
  };

  // Submit post
  const handleSubmitPost = async () => {
    if (!user || !newPostContent.trim()) { toast.error('Please write something'); return; }
    setSubmittingPost(true);
    try {
      const { error } = await supabase.from('host_posts').insert({
        user_id: user.id,
        content: newPostContent.trim(),
        image_url: newPostImage
      } as any);
      if (error) throw error;
      toast.success('Post published!');
      setNewPostContent('');
      setNewPostImage(null);
      fetchPosts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish post');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!window.confirm('Delete this post?')) return;
    const { error } = await supabase.from('host_posts').delete().eq('id', postId).eq('user_id', user.id);
    if (error) { toast.error('Failed to delete post'); return; }
    setPosts(prev => prev.filter(p => p.id !== postId));
    toast.success('Post deleted');
  };

  const openEditEpisode = (episode: Episode) => { setSelectedEpisode(episode); setShowEditEpisode(true); };
  const openEditSchedule = (schedule: Schedule) => { setSelectedSchedule(schedule); setShowEditSchedule(true); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white flex items-center justify-center">
        <div className="text-white/50">Host not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#18181b] border-b border-white/5">
        <div className="flex items-center justify-between h-12 px-3">
          <button onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const fromSession = params.get('from');
            if (fromSession) navigate(`/podcasts?session=${fromSession}`);
            else navigate(-1);
          }} className="flex items-center gap-1 text-white/60 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-white font-bold">BARIO</span>
          <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 text-white/60 hover:text-white">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="pt-12 pb-20">
        {/* Banner */}
        <div className="relative h-32 sm:h-48 overflow-hidden">
          <img src={host?.avatar_url ? getCreatorCover(host.user_id) : getCreatorCover(hostId || 'default')} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-3 mb-4">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#0e0e10] bg-neutral-800">
                {host.avatar_url ? (
                  <img src={host.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                )}
              </div>
              {host.is_live && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              )}
            </div>
            {/* Edit Profile beside icon */}
            {isOwner && (
              <Button
                onClick={() => setShowEditProfile(true)}
                variant="outline"
                size="sm"
                className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8 px-2.5 mb-2"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Profile
              </Button>
            )}
          </div>

          <div className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">{host.full_name}</h1>
            {host.username && <p className="text-white/50 text-sm">@{host.username}</p>}
          </div>

          {host.bio && <p className="text-white/70 text-sm mb-4 max-w-xl">{host.bio}</p>}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-white/50" />
              <span className="font-semibold">{formatFollowers(followerCount)}</span>
              <span className="text-white/50 text-sm">Followers</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {host.is_live && (
              <Button onClick={goToLiveSession} size="sm" className="bg-black border border-white/20 text-white hover:bg-white/10 text-xs h-8 px-2.5">
                <Radio className="h-3 w-3 mr-1.5" />
                Live
              </Button>
            )}
            <Button onClick={handleFollow} variant={isFollowing ? "outline" : "default"} size="sm"
              className={`text-xs h-8 px-2.5 ${isFollowing ? "border-white/30 text-white/80" : "bg-white text-black hover:bg-white/90"}`}
            >
              <Heart className={`h-3 w-3 mr-1.5 ${isFollowing ? 'fill-white/80' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8 px-2.5">
              <UserPlus className="h-3 w-3 mr-1.5" />
              Subscribe
            </Button>
            <Button variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8 px-2.5"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                navigate(`/messages?to=${host?.user_id}`);
              }}
            >
              <MessageCircle className="h-3 w-3 mr-1.5" />
              Message
            </Button>
            {isOwner && (
              <Button onClick={() => { setSelectedSchedule(null); setShowEditSchedule(true); }}
                variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 text-xs h-8 px-2.5"
              >
                <Calendar className="h-3 w-3 mr-1.5" />
                Schedule
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="bg-white/5 w-full justify-start border-b border-white/10 rounded-none h-10 p-0">
            <TabsTrigger value="posts" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none h-full px-4 text-sm">
              Posts
            </TabsTrigger>
            <TabsTrigger value="episodes" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none h-full px-4 text-sm">
              Episodes
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-white rounded-none h-full px-4 text-sm">
              Schedule
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-4">
            {/* Create Post Form (owner only) */}
            {isOwner && (
              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-neutral-800">
                    {host.avatar_url ? (
                      <img src={host.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="What do you want to ask or share?"
                      rows={2}
                      className="w-full bg-transparent border-none text-white placeholder:text-white/30 text-sm resize-none focus:outline-none"
                    />
                    {newPostImage && (
                      <div className="relative mt-2 mb-2">
                        <img src={newPostImage} alt="" className="w-full max-h-48 object-cover rounded-lg" />
                        <button onClick={() => setNewPostImage(null)} className="absolute top-1 right-1 bg-black/60 rounded-full p-1">
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => postImageRef.current?.click()}
                        className="flex items-center gap-1.5 text-white/50 hover:text-white text-xs"
                        disabled={uploadingPostImage}
                      >
                        <ImageIcon className="h-4 w-4" />
                        {uploadingPostImage ? 'Uploading...' : 'Photo'}
                      </button>
                      <input ref={postImageRef} type="file" accept="image/*" className="hidden" onChange={handlePostImageUpload} />
                      <Button
                        onClick={handleSubmitPost}
                        disabled={submittingPost || !newPostContent.trim()}
                        size="sm"
                        className="bg-white text-black hover:bg-white/90 text-xs h-7 px-3"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        {submittingPost ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Posts list */}
            <div className="space-y-3">
              {posts.map(post => (
                <div key={post.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-neutral-800">
                      {host.avatar_url ? (
                        <img src={host.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{host.full_name}</span>
                        <span className="text-white/40 text-xs">{formatTimeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-white/80 mt-1 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="mt-2 rounded-lg max-h-64 w-full object-cover" />
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <button className="flex items-center gap-1 text-white/40 hover:text-white text-xs">
                          <Heart className="h-3.5 w-3.5" />
                          {post.like_count || 0}
                        </button>
                        <button className="flex items-center gap-1 text-white/40 hover:text-white text-xs">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Reply
                        </button>
                      </div>
                    </div>
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#18181b] border-white/10">
                          <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
              {posts.length === 0 && (
                <div className="text-center py-8 text-white/50">
                  No posts yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="episodes" className="mt-4">
            <div className="space-y-3">
              {episodes.map((episode) => {
                const isCurrentlyPlaying = currentTrack?.id === episode.id && isPlaying;
                return (
                  <div key={episode.id} className="flex gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800 relative cursor-pointer group"
                      onClick={() => handlePlayEpisode(episode)}>
                      {episode.cover_image_url ? (
                        <img src={episode.cover_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCurrentlyPlaying ? <Pause className="h-8 w-8 text-white" fill="white" /> : <Play className="h-8 w-8 text-white" fill="white" />}
                      </div>
                      {isCurrentlyPlaying && (
                        <div className="absolute bottom-1 left-1 bg-[#53fc18] text-black text-[8px] font-bold px-1.5 py-0.5 rounded">NOW PLAYING</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base line-clamp-2 mb-1">{episode.title}</h3>
                      {episode.description && <p className="text-white/50 text-xs sm:text-sm line-clamp-2 mb-2">{episode.description}</p>}
                      <div className="flex items-center gap-3 text-white/40 text-xs">
                        <span>{formatDate(episode.created_at)}</span>
                        <span>{formatDuration(episode.duration_ms)}</span>
                        <span className="flex items-center gap-1"><Play className="h-3 w-3" />{episode.play_count.toLocaleString()}</span>
                      </div>
                    </div>
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#18181b] border-white/10">
                          <DropdownMenuItem onClick={() => openEditEpisode(episode)} className="text-white hover:bg-white/10">
                            <Edit className="h-4 w-4 mr-2" />Edit Episode
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteEpisode(episode.id)} className="text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4 mr-2" />Delete Episode
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
              {episodes.length === 0 && <div className="text-center py-8 text-white/50">No episodes yet</div>}
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            {isOwner && (
              <Button
                onClick={() => { setSelectedSchedule(null); setShowEditSchedule(true); }}
                size="sm"
                className="bg-white text-black hover:bg-white/90 text-xs h-8 px-3 mb-4"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create Schedule
              </Button>
            )}
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex gap-3 p-3 bg-white/5 rounded-lg">
                  <div className="w-16 h-16 rounded-lg bg-white/5 flex flex-col items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-white/60 mb-1" />
                    <span className="text-[10px] text-white/60">{formatScheduleDate(schedule.scheduled_at)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base mb-1">{schedule.title}</h3>
                    {schedule.description && <p className="text-white/50 text-xs sm:text-sm line-clamp-2 mb-2">{schedule.description}</p>}
                    <div className="text-white/40 text-xs">{formatScheduleTime(schedule.scheduled_at)}</div>
                  </div>
                  {isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#18181b] border-white/10">
                        <DropdownMenuItem onClick={() => openEditSchedule(schedule)} className="text-white hover:bg-white/10">
                          <Edit className="h-4 w-4 mr-2" />Edit Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteSchedule(schedule.id)} className="text-red-400 hover:bg-red-500/10">
                          <Trash2 className="h-4 w-4 mr-2" />Delete Schedule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              {schedules.length === 0 && <div className="text-center py-8 text-white/50">No upcoming schedules</div>}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Profile Modal */}
      {host && (
        <EditProfileModal
          open={showEditProfile}
          onOpenChange={setShowEditProfile}
          profile={{ user_id: host.user_id, full_name: host.full_name, username: host.username, bio: host.bio, avatar_url: host.avatar_url }}
          onUpdate={fetchHostData}
        />
      )}

      {/* Edit Episode Modal */}
      {selectedEpisode && (
        <EditEpisodeModal open={showEditEpisode} onOpenChange={setShowEditEpisode} episode={selectedEpisode} userId={host?.user_id || ''} onUpdate={fetchHostData} />
      )}

      {/* Edit Schedule Modal */}
      <EditScheduleModal
        open={showEditSchedule}
        onOpenChange={setShowEditSchedule}
        schedule={selectedSchedule}
        userId={user?.id || host?.user_id || ''}
        onUpdate={() => { fetchHostData(); fetchPosts(); }}
      />

    </div>
  );
};

export default HostProfile;
