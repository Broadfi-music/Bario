import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Share2, Heart, Music, ExternalLink, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ArtistProfile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  cover_image_url: string | null;
  spotify_url: string | null;
  soundcloud_url: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
}

interface ArtistTrack {
  id: string;
  title: string;
  genre: string | null;
  duration_ms: number | null;
  play_count: number | null;
  like_count: number | null;
  cover_image_url: string | null;
  audio_url: string;
}

const formatNumber = (num: number | null) => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const formatDuration = (ms: number | null) => {
  if (!ms) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<ArtistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<ArtistTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchArtistData();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    checkFollowStatus();
  }, [id, user]);

  const fetchArtistData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (profileData) setProfile(profileData);

      // Fetch tracks
      const { data: tracksData } = await supabase
        .from('user_uploads')
        .select('id, title, genre, duration_ms, play_count, like_count, cover_image_url, audio_url')
        .eq('user_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      setTracks(tracksData || []);

      // Fetch follower/following counts
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
      ]);

      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);
    } catch (err) {
      console.error('Error fetching artist:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow artists');
      return;
    }
    if (!id || id === user.id) return;

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', id);
      setIsFollowing(false);
      setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
      setFollowerCount(prev => prev + 1);
    }
  };

  const handlePlay = (track: ArtistTrack) => {
    if (!audioRef.current) return;
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = track.audio_url;
      audioRef.current.play();
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${artistName} on Bario!`;
    switch (platform) {
      case 'x':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
        break;
      default:
        navigator.clipboard.writeText(url);
        toast.success('Link copied!');
    }
  };

  const artistName = profile?.full_name || profile?.username || 'Bario Artist';

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Artist not found</p>
          <Button onClick={() => navigate('/bario-music')} className="mt-4">Back to Bario Music</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 px-3 sm:px-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/60 hover:text-white">
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10">
              <DropdownMenuItem onClick={() => handleShare('x')} className="text-white hover:bg-white/10">Share on X</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="text-white hover:bg-white/10">Share on WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('copy')} className="text-white hover:bg-white/10">
                <Copy className="h-3 w-3 mr-2" /> Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="pt-16 pb-28 px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Cover */}
        {profile.cover_image_url && (
          <div className="w-full h-32 sm:h-48 rounded-xl overflow-hidden mb-4">
            <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Artist Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-white/10">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl">
              {artistName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">{artistName}</h1>
            {profile.username && <p className="text-white/50 text-sm mb-2">@{profile.username}</p>}
            {profile.bio && <p className="text-white/60 text-sm mb-4 max-w-md">{profile.bio}</p>}

            <div className="flex justify-center sm:justify-start gap-6 mb-4">
              <div className="text-center">
                <p className="font-bold">{formatNumber(followerCount)}</p>
                <p className="text-[10px] text-white/50">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{formatNumber(followingCount)}</p>
                <p className="text-[10px] text-white/50">Following</p>
              </div>
              <div className="text-center">
                <p className="font-bold">{tracks.length}</p>
                <p className="text-[10px] text-white/50">Tracks</p>
              </div>
            </div>

            {user?.id !== id && (
              <Button
                onClick={handleFollow}
                className={isFollowing
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-[#4ade80] text-black hover:bg-[#4ade80]/90"
                }
                size="sm"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}

            {/* Social links */}
            {(profile.spotify_url || profile.soundcloud_url || profile.instagram_url || profile.twitter_url || profile.youtube_url) && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                {profile.spotify_url && (
                  <a href={profile.spotify_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs hover:bg-[#1DB954]/30 flex items-center gap-1">
                    Spotify <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.soundcloud_url && (
                  <a href={profile.soundcloud_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs hover:bg-orange-500/30 flex items-center gap-1">
                    SoundCloud <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.instagram_url && (
                  <a href={profile.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs hover:bg-pink-500/30 flex items-center gap-1">
                    Instagram <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs hover:bg-blue-500/30 flex items-center gap-1">
                    X <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {profile.youtube_url && (
                  <a href={profile.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs hover:bg-red-500/30 flex items-center gap-1">
                    YouTube <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tracks */}
        <div>
          <h2 className="text-sm font-semibold mb-4">Tracks ({tracks.length})</h2>
          {tracks.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">No published tracks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tracks.map((track) => (
                <Card
                  key={track.id}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border-white/5 cursor-pointer transition-colors overflow-hidden"
                  onClick={() => navigate(`/bario-music/${track.id}`)}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="relative w-10 h-10 flex-shrink-0 rounded overflow-hidden">
                      <img src={track.cover_image_url || '/placeholder.svg'} alt={track.title} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlay(track); }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {isPlaying && currentTrack?.id === track.id
                          ? <Pause className="h-4 w-4 text-white" />
                          : <Play className="h-4 w-4 text-white" />
                        }
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate text-sm">{track.title}</h3>
                      <p className="text-[10px] text-white/50">{track.genre || 'Music'}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-white/40">
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" /> {formatNumber(track.play_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {formatNumber(track.like_count)}
                      </span>
                      <span className="hidden sm:inline">{formatDuration(track.duration_ms)}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Player Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 z-50">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <img src={currentTrack.cover_image_url || '/placeholder.svg'} alt="" className="w-10 h-10 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentTrack.title}</p>
              <p className="text-xs text-white/50">{artistName}</p>
            </div>
            <button
              onClick={() => handlePlay(currentTrack)}
              className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center"
            >
              {isPlaying ? <Pause className="h-5 w-5 text-black" /> : <Play className="h-5 w-5 text-black ml-0.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorProfile;
