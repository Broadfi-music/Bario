import { Link, useNavigate, useParams } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, ChevronLeft, Play, Pause, Heart, ExternalLink, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ArtistData {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  genre: string;
  followers: number;
  monthlyListeners: string;
  socialLinks: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  tracks: {
    id: string;
    title: string;
    artwork: string;
    preview: string;
    plays: string;
    duration: string;
  }[];
}

const ArtistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [artistLoading, setArtistLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchArtist();
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => { setIsPlaying(false); setProgress(0); });
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, [currentTrack]);

  const fetchArtist = async () => {
    if (!id) return;
    setArtistLoading(true);
    
    try {
      // Fetch from Deezer API
      const response = await fetch(`https://api.deezer.com/artist/${id}`);
      const data = await response.json();
      
      // Fetch artist's tracks
      const tracksResponse = await fetch(`https://api.deezer.com/artist/${id}/top?limit=20`);
      const tracksData = await tracksResponse.json();
      
      const artistData: ArtistData = {
        id: data.id?.toString() || id,
        name: data.name || 'Unknown Artist',
        avatar: data.picture_xl || data.picture_big || data.picture_medium || '/src/assets/card-1.png',
        bio: `${data.name} is a talented artist with ${data.nb_album || 0} albums and ${data.nb_fan || 0} fans on Deezer.`,
        genre: 'Music',
        followers: data.nb_fan || 0,
        monthlyListeners: formatListeners(data.nb_fan || 0),
        socialLinks: {
          spotify: `https://open.spotify.com/search/${encodeURIComponent(data.name || '')}`,
          instagram: `https://instagram.com/${(data.name || '').replace(/\s+/g, '').toLowerCase()}`,
          twitter: `https://twitter.com/${(data.name || '').replace(/\s+/g, '').toLowerCase()}`,
          youtube: `https://youtube.com/results?search_query=${encodeURIComponent(data.name || '')}`,
        },
        tracks: (tracksData.data || []).map((track: any) => ({
          id: track.id?.toString(),
          title: track.title,
          artwork: track.album?.cover_medium || track.album?.cover || '/src/assets/card-1.png',
          preview: track.preview || '',
          plays: formatListeners(track.rank || Math.floor(Math.random() * 1000000)),
          duration: formatDuration(track.duration),
        })),
      };
      
      setArtist(artistData);
    } catch (error) {
      console.error('Error fetching artist:', error);
      toast.error('Failed to load artist');
    } finally {
      setArtistLoading(false);
    }
  };

  const formatListeners = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = (track: any) => {
    if (!track.preview) {
      toast.error('No preview available');
      return;
    }
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview;
        audioRef.current.play().catch(() => toast.error('Unable to play'));
      }
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleLike = async (trackId: string) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }
    
    const newLiked = new Set(likedTracks);
    if (newLiked.has(trackId)) {
      newLiked.delete(trackId);
      toast.success('Removed from favorites');
    } else {
      newLiked.add(trackId);
      toast.success('Added to favorites');
      
      // Save to database
      const track = artist?.tracks.find(t => t.id === trackId);
      if (track) {
        try {
          await supabase.from('user_favorites').insert({
            user_id: user.id,
            track_id: trackId,
            track_title: track.title,
            artist_name: artist?.name || '',
            cover_image_url: track.artwork,
            preview_url: track.preview,
            source: 'deezer',
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
    setLikedTracks(newLiked);
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>;
  }

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <audio ref={audioRef} />
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">BARIO</Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7" onClick={() => setSidebarOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        <nav className="flex-1 px-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link key={item.label} to={item.path} onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-0.5">
              <item.icon className="h-4 w-4" /><span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className={`flex-1 overflow-y-auto w-full lg:w-auto ${currentTrack ? 'pb-20' : ''}`}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8"><ChevronLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Artist Profile</h1>
          </div>

          {artistLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading artist...</div>
            </div>
          ) : artist ? (
            <div className="space-y-6">
              {/* Artist Header */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="w-24 h-24 lg:w-32 lg:h-32">
                  <AvatarImage src={artist.avatar} />
                  <AvatarFallback>{artist.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground">{artist.name}</h2>
                  <p className="text-sm text-muted-foreground">{artist.genre}</p>
                  <p className="text-xs text-muted-foreground mt-1">{artist.monthlyListeners} monthly listeners</p>
                  <div className="flex gap-2 mt-3 justify-center sm:justify-start">
                    {artist.socialLinks.spotify && (
                      <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Spotify</Button>
                      </a>
                    )}
                    {artist.socialLinks.youtube && (
                      <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />YouTube</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                <p className="text-xs text-muted-foreground">{artist.bio}</p>
              </Card>

              {/* Tracks */}
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Popular Tracks</h3>
                <div className="space-y-1">
                  {artist.tracks.map((track, index) => (
                    <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2" onClick={() => handlePlay(track)}>
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <img src={track.artwork} alt={track.title} className="w-full h-full object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded">
                            {currentTrack?.id === track.id && isPlaying ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                          <p className="text-[10px] text-muted-foreground">{track.plays} plays</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{track.duration}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleLike(track.id); }}
                          className={`h-7 w-7 ${likedTracks.has(track.id) ? 'text-red-500' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`h-3 w-3 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Artist not found</p>
            </div>
          )}
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-40">
            <div className="flex items-center gap-3">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{artist?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8"><SkipBack className="h-4 w-4" /></Button>
                <Button size="icon" className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90 rounded-full" onClick={togglePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8"><SkipForward className="h-4 w-4" /></Button>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-24">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
              </div>
            </div>
            <div className="mt-2"><Slider value={[progress]} max={100} step={0.1} className="w-full" /></div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtistProfile;