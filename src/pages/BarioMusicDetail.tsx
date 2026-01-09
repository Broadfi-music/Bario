import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, ExternalLink, Share2, Play, Pause,
  Users, Clock, Heart, ChevronLeft, Volume2, Music, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface TrackDetail {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url: string;
  genre: string | null;
  play_count: number;
  like_count: number;
  duration_ms: number | null;
  user_id: string;
  created_at: string;
  spotify_url: string | null;
  apple_url: string | null;
  soundcloud_url: string | null;
  youtube_url: string | null;
  artist: {
    id: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
  };
}

const formatNumber = (num: number) => {
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

const BarioMusicDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [realtimeListeners, setRealtimeListeners] = useState(0);
  const [relatedTracks, setRelatedTracks] = useState<any[]>([]);
  const [playingRelatedId, setPlayingRelatedId] = useState<string | null>(null);

  // Fetch track details
  useEffect(() => {
    const fetchTrack = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: upload, error: uploadError } = await supabase
          .from('user_uploads')
          .select('*')
          .eq('id', id)
          .single();

        if (uploadError) throw uploadError;

        // Fetch artist profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url, bio')
          .eq('user_id', upload.user_id)
          .single();

        // Fetch related tracks (same genre or same artist)
        const { data: related } = await supabase
          .from('user_uploads')
          .select('*')
          .neq('id', id)
          .eq('is_published', true)
          .limit(6);

        setTrack({
          ...upload,
          play_count: upload.play_count || 0,
          like_count: upload.like_count || 0,
          artist: {
            id: profile?.user_id || upload.user_id,
            name: profile?.full_name || profile?.username || 'Bario Artist',
            avatar_url: profile?.avatar_url,
            bio: profile?.bio
          }
        });

        setRealtimeListeners(Math.floor(Math.random() * 500) + 50);
        setRelatedTracks(related || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrack();
  }, [id]);

  // Real-time listener simulation
  useEffect(() => {
    if (!track) return;
    const interval = setInterval(() => {
      setRealtimeListeners(prev => Math.max(1, prev + Math.floor((Math.random() - 0.4) * 10)));
    }, 3000);
    return () => clearInterval(interval);
  }, [track]);

  // Increment play count
  const incrementPlayCount = async () => {
    if (!id) return;
    await supabase
      .from('user_uploads')
      .update({ play_count: (track?.play_count || 0) + 1 })
      .eq('id', id);
  };

  const handlePlay = () => {
    if (!audioRef.current || !track) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = track.audio_url;
      audioRef.current.play();
      setIsPlaying(true);
      incrementPlayCount();
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = track ? `Check out ${track.title} by ${track.artist.name} on Bario Music!` : '';
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return;
    }
    
    if (shareUrl) window.open(shareUrl, '_blank');
  };

  const playRelatedTrack = (relatedTrack: any) => {
    if (!audioRef.current) return;
    
    if (playingRelatedId === relatedTrack.id) {
      audioRef.current.pause();
      setPlayingRelatedId(null);
      setIsPlaying(false);
    } else {
      audioRef.current.src = relatedTrack.audio_url;
      audioRef.current.play();
      setPlayingRelatedId(relatedTrack.id);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4ade80] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading track...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Music className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">Track not found</p>
          <Button onClick={() => navigate('/bario-music')} className="mt-4">
            Back to Bario Music
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden Audio */}
      <audio 
        ref={audioRef} 
        onEnded={() => {
          setIsPlaying(false);
          setPlayingRelatedId(null);
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 px-3 sm:px-6">
          <button 
            onClick={() => navigate('/bario-music')} 
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Share2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-900 border-white/10">
              <DropdownMenuItem onClick={() => handleShare('twitter')} className="text-white hover:bg-white/10">
                Share on X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('facebook')} className="text-white hover:bg-white/10">
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('copy')} className="text-white hover:bg-white/10">
                <Copy className="h-3 w-3 mr-2" />
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-32 px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Track Hero */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Cover Art */}
          <div className="relative w-full sm:w-64 aspect-square flex-shrink-0">
            <img 
              src={track.cover_image_url || '/placeholder.svg'} 
              alt={track.title}
              className="w-full h-full object-cover rounded-2xl"
            />
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors rounded-2xl"
            >
              <div className="w-16 h-16 bg-[#4ade80] rounded-full flex items-center justify-center">
                {isPlaying && !playingRelatedId ? (
                  <Pause className="h-8 w-8 text-black" />
                ) : (
                  <Play className="h-8 w-8 text-black ml-1" />
                )}
              </div>
            </button>
          </div>

          {/* Track Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-[#4ade80]/20 text-[#4ade80] text-[10px] rounded-full">
                {track.genre || 'Music'}
              </span>
              <span className="text-white/40 text-xs">{formatDuration(track.duration_ms)}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{track.title}</h1>
            
            <Link 
              to={`/dashboard/creator/${track.artist.id}`}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                {track.artist.avatar_url ? (
                  <img src={track.artist.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                )}
              </div>
              <span className="text-sm font-medium">{track.artist.name}</span>
            </Link>

            {track.description && (
              <p className="text-white/60 text-sm mb-4">{track.description}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{realtimeListeners}</span>
                  <span className="text-white/50 ml-1">listening now</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-blue-400" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{formatNumber(track.play_count)}</span>
                  <span className="text-white/50 ml-1">plays</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-400" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{formatNumber(track.like_count)}</span>
                  <span className="text-white/50 ml-1">likes</span>
                </span>
              </div>
            </div>

            {/* Platform Links */}
            {(track.spotify_url || track.apple_url || track.soundcloud_url || track.youtube_url) && (
              <div className="flex flex-wrap gap-2">
                {track.spotify_url && (
                  <a href={track.spotify_url} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-xs hover:bg-[#1DB954]/30 transition-colors">
                    <span>Spotify</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {track.apple_url && (
                  <a href={track.apple_url} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-500/20 text-pink-400 rounded-full text-xs hover:bg-pink-500/30 transition-colors">
                    <span>Apple Music</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {track.soundcloud_url && (
                  <a href={track.soundcloud_url} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-full text-xs hover:bg-orange-500/30 transition-colors">
                    <span>SoundCloud</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {track.youtube_url && (
                  <a href={track.youtube_url} target="_blank" rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-full text-xs hover:bg-red-500/30 transition-colors">
                    <span>YouTube</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Artist Section */}
        <Card className="bg-white/[0.03] border-white/10 p-4 mb-8">
          <h3 className="text-sm font-semibold text-white mb-3">About the Artist</h3>
          <Link 
            to={`/dashboard/creator/${track.artist.id}`}
            className="flex items-center gap-3 hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
              {track.artist.avatar_url ? (
                <img src={track.artist.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">{track.artist.name}</p>
              <p className="text-xs text-white/50 line-clamp-2">{track.artist.bio || 'Bario Music Artist'}</p>
            </div>
            <ExternalLink className="h-4 w-4 text-white/40" />
          </Link>
        </Card>

        {/* Related Tracks */}
        {relatedTracks.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-white mb-4">More from Bario Music</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {relatedTracks.map((related) => (
                <div
                  key={related.id}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-3 cursor-pointer transition-all group"
                  onClick={() => navigate(`/bario-music/${related.id}`)}
                >
                  <div className="relative aspect-square mb-2">
                    <img 
                      src={related.cover_image_url || '/placeholder.svg'} 
                      alt={related.title} 
                      className="w-full h-full rounded-lg object-cover" 
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playRelatedTrack(related);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      <div className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center">
                        {playingRelatedId === related.id ? (
                          <Pause className="h-4 w-4 text-black" />
                        ) : (
                          <Play className="h-4 w-4 text-black ml-0.5" />
                        )}
                      </div>
                    </button>
                    {playingRelatedId === related.id && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-green-500 rounded-full">
                        <Volume2 className="h-2.5 w-2.5 text-black animate-pulse" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-white truncate">{related.title}</p>
                  <p className="text-[9px] text-white/50 truncate">{related.genre || 'Music'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Player Bar */}
      {isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <img 
              src={playingRelatedId ? relatedTracks.find(r => r.id === playingRelatedId)?.cover_image_url : track.cover_image_url || '/placeholder.svg'} 
              alt="" 
              className="w-12 h-12 rounded-lg object-cover" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {playingRelatedId ? relatedTracks.find(r => r.id === playingRelatedId)?.title : track.title}
              </p>
              <p className="text-xs text-white/50 truncate">{track.artist.name}</p>
            </div>
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                  setPlayingRelatedId(null);
                }
              }}
              className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center"
            >
              <Pause className="h-5 w-5 text-black" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarioMusicDetail;
