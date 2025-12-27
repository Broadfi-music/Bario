import { Link, useNavigate, useParams } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, ChevronLeft, Play, Pause, Heart, ExternalLink, SkipBack, SkipForward, Volume2, Users, Music, Disc, Calendar, MapPin, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  albums: number;
  socialLinks: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  tracks: TrackData[];
  albums_list: AlbumData[];
  relatedArtists: RelatedArtist[];
}

interface TrackData {
  id: string;
  title: string;
  artwork: string;
  preview: string;
  plays: string;
  duration: string;
  album?: string;
}

interface AlbumData {
  id: string;
  title: string;
  cover: string;
  releaseDate: string;
  trackCount: number;
}

interface RelatedArtist {
  id: string;
  name: string;
  avatar: string;
  followers: string;
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
  const [activeTab, setActiveTab] = useState('tracks');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get all tracks as flat list for skip functionality
  const allTracks = artist?.tracks.filter(t => t.preview) || [];

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

    const handleEnded = () => {
      skipToNextTrack();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, allTracks]);

  const skipToNextTrack = () => {
    if (!currentTrack || allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % allTracks.length;
    handlePlay(allTracks[nextIndex]);
  };

  const skipToPrevTrack = () => {
    if (!currentTrack || allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex <= 0 ? allTracks.length - 1 : currentIndex - 1;
    handlePlay(allTracks[prevIndex]);
  };

  const fetchArtist = async () => {
    if (!id) return;
    setArtistLoading(true);
    
    try {
      // First, try to fetch directly by ID (if it's a valid Deezer ID)
      const response = await fetch(`https://api.deezer.com/artist/${id}`);
      const data = await response.json();
      
      if (!data.error && data.id) {
        // Successfully found by ID
        await fetchArtistById(data.id);
        return;
      }
      
      // If not found by ID, search by name (decode URI component for encoded names)
      const searchName = decodeURIComponent(id);
      const searchResponse = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(searchName)}&limit=5`);
      const searchData = await searchResponse.json();
      
      if (searchData.data && searchData.data.length > 0) {
        // Find exact match or closest match
        const exactMatch = searchData.data.find((a: any) => 
          a.name.toLowerCase() === searchName.toLowerCase()
        );
        const artistToUse = exactMatch || searchData.data[0];
        await fetchArtistById(artistToUse.id);
      } else {
        // Last resort: try a broader search
        const broaderSearch = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(searchName)}&limit=10`);
        const broaderData = await broaderSearch.json();
        
        if (broaderData.data && broaderData.data.length > 0) {
          const artistId = broaderData.data[0].artist?.id;
          if (artistId) {
            await fetchArtistById(artistId);
          } else {
            setArtist(null);
          }
        } else {
          setArtist(null);
        }
      }
    } catch (error) {
      console.error('Error fetching artist:', error);
      setArtist(null);
    } finally {
      setArtistLoading(false);
    }
  };

  const fetchArtistById = async (artistId: string | number) => {
    try {
      // Fetch artist info
      const [artistRes, tracksRes, albumsRes, relatedRes] = await Promise.all([
        fetch(`https://api.deezer.com/artist/${artistId}`),
        fetch(`https://api.deezer.com/artist/${artistId}/top?limit=50`),
        fetch(`https://api.deezer.com/artist/${artistId}/albums?limit=20`),
        fetch(`https://api.deezer.com/artist/${artistId}/related?limit=10`),
      ]);

      const [artistData, tracksData, albumsData, relatedData] = await Promise.all([
        artistRes.json(),
        tracksRes.json(),
        albumsRes.json(),
        relatedRes.json(),
      ]);

      const artistInfo: ArtistData = {
        id: artistData.id?.toString() || id!,
        name: artistData.name || 'Unknown Artist',
        avatar: artistData.picture_xl || artistData.picture_big || artistData.picture_medium || '/src/assets/card-1.png',
        bio: generateArtistBio(artistData),
        genre: 'Music',
        followers: artistData.nb_fan || 0,
        albums: artistData.nb_album || 0,
        monthlyListeners: formatListeners(artistData.nb_fan || 0),
        socialLinks: {
          spotify: `https://open.spotify.com/search/${encodeURIComponent(artistData.name || '')}`,
          instagram: `https://instagram.com/${(artistData.name || '').replace(/\s+/g, '').toLowerCase()}`,
          twitter: `https://twitter.com/${(artistData.name || '').replace(/\s+/g, '').toLowerCase()}`,
          youtube: `https://youtube.com/results?search_query=${encodeURIComponent(artistData.name || '')}`,
        },
        tracks: (tracksData.data || []).map((track: any) => ({
          id: track.id?.toString(),
          title: track.title,
          artwork: track.album?.cover_medium || track.album?.cover || '/src/assets/card-1.png',
          preview: track.preview || '',
          plays: formatListeners(track.rank || Math.floor(Math.random() * 1000000)),
          duration: formatDuration(track.duration),
          album: track.album?.title,
        })),
        albums_list: (albumsData.data || []).map((album: any) => ({
          id: album.id?.toString(),
          title: album.title,
          cover: album.cover_medium || album.cover || '/src/assets/card-1.png',
          releaseDate: album.release_date || 'Unknown',
          trackCount: album.nb_tracks || 0,
        })),
        relatedArtists: (relatedData.data || []).map((artist: any) => ({
          id: artist.id?.toString(),
          name: artist.name,
          avatar: artist.picture_medium || artist.picture || '/src/assets/card-1.png',
          followers: formatListeners(artist.nb_fan || 0),
        })),
      };
      
      setArtist(artistInfo);
    } catch (error) {
      console.error('Error fetching artist details:', error);
      setArtist(null);
    }
  };

  const generateArtistBio = (data: any) => {
    const name = data.name || 'This artist';
    const albums = data.nb_album || 0;
    const fans = data.nb_fan || 0;
    
    return `${name} is a talented musician with ${albums} albums and over ${formatListeners(fans)} fans worldwide. Known for their unique sound and captivating performances, ${name} continues to push boundaries and inspire listeners across the globe. Their music spans various genres and has earned them a dedicated following on streaming platforms.`;
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

  const handleLike = async (track: TrackData) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }
    
    const trackId = track.id.toString();
    const newLiked = new Set(likedTracks);
    
    if (newLiked.has(trackId)) {
      newLiked.delete(trackId);
      toast.success('Removed from favorites');
    } else {
      newLiked.add(trackId);
      toast.success('Added to favorites');
      
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
    setLikedTracks(newLiked);
  };

  const playAllTracks = () => {
    const tracksWithPreview = artist?.tracks.filter(t => t.preview) || [];
    if (tracksWithPreview.length > 0) {
      handlePlay(tracksWithPreview[0]);
    } else {
      toast.error('No playable tracks available');
    }
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
    { icon: Upload, label: 'Upload', path: '/dashboard/upload' },
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

      <main className={`flex-1 overflow-y-auto w-full lg:w-auto ${currentTrack ? 'pb-24' : ''}`}>
        <div className="p-3 lg:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8"><ChevronLeft className="h-5 w-5" /></Button>
            <h1 className="text-lg font-bold text-foreground">Artist Profile</h1>
          </div>

          {artistLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading artist...</div>
            </div>
          ) : artist ? (
            <div className="space-y-6">
              {/* Artist Header with Cover */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-background rounded-xl" />
                <div className="relative p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <Avatar className="w-32 h-32 lg:w-40 lg:h-40 ring-4 ring-primary/30 shadow-2xl">
                      <AvatarImage src={artist.avatar} />
                      <AvatarFallback className="text-4xl">{artist.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left flex-1">
                      <p className="text-xs text-primary font-medium mb-1">VERIFIED ARTIST</p>
                      <h2 className="text-2xl lg:text-4xl font-bold text-foreground mb-2">{artist.name}</h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {artist.monthlyListeners} monthly listeners
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {formatListeners(artist.followers)} followers
                        </span>
                        <span className="flex items-center gap-1">
                          <Disc className="h-4 w-4" />
                          {artist.albums} albums
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        <Button onClick={playAllTracks} className="bg-primary text-primary-foreground hover:bg-primary/90">
                          <Play className="h-4 w-4 mr-2" />
                          Play All
                        </Button>
                        {artist.socialLinks.spotify && (
                          <a href={artist.socialLinks.spotify} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Spotify</Button>
                          </a>
                        )}
                        {artist.socialLinks.youtube && (
                          <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />YouTube</Button>
                          </a>
                        )}
                        {artist.socialLinks.instagram && (
                          <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Instagram</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{artist.bio}</p>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="tracks" className="text-xs">Popular ({artist.tracks.length})</TabsTrigger>
                  <TabsTrigger value="albums" className="text-xs">Albums ({artist.albums_list.length})</TabsTrigger>
                  <TabsTrigger value="related" className="text-xs">Similar Artists</TabsTrigger>
                </TabsList>

                {/* Popular Tracks */}
                <TabsContent value="tracks">
                  <div className="space-y-1">
                    {artist.tracks.map((track, index) => (
                      <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2" onClick={() => handlePlay(track)}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
                          <div className="relative w-10 h-10 flex-shrink-0 group">
                            <img src={track.artwork} alt={track.title} className="w-full h-full object-cover rounded" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded">
                              {currentTrack?.id === track.id && isPlaying ? (
                                <Pause className="h-4 w-4 text-white" />
                              ) : (
                                <Play className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{track.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{track.album}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{track.plays} plays</span>
                          <span className="text-[10px] text-muted-foreground">{track.duration}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-6 w-6 ${likedTracks.has(track.id) ? 'text-red-500' : 'text-muted-foreground'}`}
                            onClick={(e) => { e.stopPropagation(); handleLike(track); }}
                          >
                            <Heart className={`h-3 w-3 ${likedTracks.has(track.id) ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Albums */}
                <TabsContent value="albums">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {artist.albums_list.map((album) => (
                      <Card key={album.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2">
                        <img src={album.cover} alt={album.title} className="w-full aspect-square object-cover rounded mb-2" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                        <p className="text-xs font-medium text-foreground truncate">{album.title}</p>
                        <p className="text-[10px] text-muted-foreground">{album.releaseDate} • {album.trackCount} tracks</p>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Related Artists */}
                <TabsContent value="related">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {artist.relatedArtists.map((relatedArtist) => (
                      <Link key={relatedArtist.id} to={`/dashboard/artist/${relatedArtist.id}`} className="text-center group">
                        <Avatar className="w-16 h-16 mx-auto mb-2 ring-2 ring-transparent group-hover:ring-primary transition-all">
                          <AvatarImage src={relatedArtist.avatar} />
                          <AvatarFallback>{relatedArtist.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium text-foreground truncate">{relatedArtist.name}</p>
                        <p className="text-[10px] text-muted-foreground">{relatedArtist.followers} fans</p>
                      </Link>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">Artist not found</div>
              <Button onClick={() => navigate('/dashboard/megashuffle')}>Back to Megashuffle</Button>
            </div>
          )}
        </div>

        {/* Now Playing Bar */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-2 z-40">
            <div className="flex items-center gap-3 max-w-4xl mx-auto">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{artist?.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={skipToPrevTrack}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full" onClick={togglePlayPause}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={skipToNextTrack}>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-24">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  defaultValue={[100]}
                  max={100}
                  step={1}
                  className="w-16"
                  onValueChange={(v) => {
                    if (audioRef.current) audioRef.current.volume = v[0] / 100;
                  }}
                />
              </div>
            </div>
            <div className="w-full bg-muted h-1 rounded-full mt-2">
              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ArtistProfile;