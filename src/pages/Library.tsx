import { Link, useNavigate } from 'react-router-dom';
import { Home, Library as LibraryIcon, Sparkles, User, Settings, Menu, X, Gift, Play, Pause, Download, Share2, MoreVertical, SkipBack, SkipForward, Volume2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UserRemix {
  id: string;
  title: string;
  genre: string;
  created_at: string;
  album_art_url: string | null;
  remix_file_url: string | null;
  play_count: number;
  like_count: number;
  is_published: boolean;
}

const Library = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [userRemixes, setUserRemixes] = useState<UserRemix[]>([]);
  const [loadingRemixes, setLoadingRemixes] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch user's remixes and liked tracks
  useEffect(() => {
    const fetchUserRemixes = async () => {
      if (!user) return;
      
      try {
        setLoadingRemixes(true);
        
        // Fetch user's published remixes
        const { data: remixes, error } = await supabase
          .from('remixes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching remixes:', error);
        } else {
          setUserRemixes(remixes || []);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoadingRemixes(false);
      }
    };

    if (user) {
      fetchUserRemixes();
    }
  }, [user]);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [currentTrack]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: LibraryIcon, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
  ];

  const handlePlayTrack = (track: any) => {
    if (!track.remix_file_url) {
      toast.error('No audio file available');
      return;
    }
    
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.remix_file_url;
        audioRef.current.play().catch(() => {
          toast.error('Unable to play this track');
        });
      }
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = (format: 'mp3' | 'wav', trackTitle: string) => {
    toast.success(`Downloading ${trackTitle} as ${format.toUpperCase()}`);
  };

  const handleShare = (platform: string, trackTitle: string) => {
    toast.success(`Sharing ${trackTitle} to ${platform}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <audio ref={audioRef} />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">
            BARIO
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-7 w-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mb-0.5 ${
                item.label === 'Library' 
                  ? 'text-foreground bg-accent' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
          <Link
            to="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <User className="h-4 w-4" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-y-auto w-full lg:w-auto ${currentTrack ? 'pb-24' : ''}`}>
        <div className="p-3 lg:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden h-8 w-8"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">My Library</h1>
                <p className="text-xs text-muted-foreground">Your remixes and favorites</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src="/src/assets/track-1.jpeg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="cursor-pointer text-xs">
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings" className="cursor-pointer text-xs">
                    Manage Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-xs">
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-4 lg:mb-6">
            <Card className="p-3 lg:p-4">
              <h3 className="text-[10px] text-muted-foreground mb-0.5">Total Tracks</h3>
              <p className="text-lg lg:text-xl font-bold text-foreground">{userRemixes.length}</p>
            </Card>
            <Card className="p-3 lg:p-4">
              <h3 className="text-[10px] text-muted-foreground mb-0.5">Published</h3>
              <p className="text-lg lg:text-xl font-bold text-foreground">
                {userRemixes.filter(r => r.is_published).length}
              </p>
            </Card>
            <Card className="p-3 lg:p-4">
              <h3 className="text-[10px] text-muted-foreground mb-0.5">Total Plays</h3>
              <p className="text-lg lg:text-xl font-bold text-foreground">
                {userRemixes.reduce((acc, r) => acc + (r.play_count || 0), 0)}
              </p>
            </Card>
          </div>

          {/* Loading State */}
          {loadingRemixes && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground text-sm">Loading your library...</div>
            </div>
          )}

          {/* Empty State */}
          {!loadingRemixes && userRemixes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Your library is empty</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                Start creating remixes or add songs to your favorites to see them here.
              </p>
              <Link to="/dashboard/create">
                <Button className="bg-black text-white hover:bg-black/90">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Your First Remix
                </Button>
              </Link>
            </div>
          )}

          {/* Tracks Grid */}
          {!loadingRemixes && userRemixes.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
              {userRemixes.map((track) => (
                <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors overflow-hidden group">
                  <div className="aspect-square bg-muted relative">
                    <img 
                      src={track.album_art_url || '/src/assets/card-1.png'} 
                      alt={track.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/src/assets/card-1.png';
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="rounded-full h-10 w-10"
                        onClick={() => handlePlayTrack(track)}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Published Badge */}
                    {track.is_published && (
                      <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded">
                        Published
                      </div>
                    )}
                    
                    {/* Action Menu */}
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="secondary" className="h-6 w-6 rounded-full">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs">
                                <Download className="h-3 w-3 mr-2" />
                                Download
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="text-sm">Download Format</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 mt-4">
                                <Button 
                                  onClick={() => handleDownload('mp3', track.title)}
                                  className="w-full text-xs h-8"
                                >
                                  Download as MP3
                                </Button>
                                <Button 
                                  onClick={() => handleDownload('wav', track.title)}
                                  className="w-full text-xs h-8"
                                >
                                  Download as WAV
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs">
                                <Share2 className="h-3 w-3 mr-2" />
                                Share
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="text-sm">Share Your Track</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-2 mt-4">
                                <Button 
                                  onClick={() => handleShare('link', track.title)}
                                  variant="outline"
                                  className="w-full text-xs h-8"
                                >
                                  Copy Link
                                </Button>
                                <Button 
                                  onClick={() => handleShare('tiktok', track.title)}
                                  variant="outline"
                                  className="w-full text-xs h-8"
                                >
                                  Share to TikTok
                                </Button>
                                <Button 
                                  onClick={() => handleShare('whatsapp', track.title)}
                                  variant="outline"
                                  className="w-full text-xs h-8"
                                >
                                  Share to WhatsApp
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <DropdownMenuItem className="text-xs">
                            Get Stems
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="p-2 lg:p-3">
                    <h3 className="font-medium text-foreground mb-0.5 text-xs truncate">{track.title}</h3>
                    <p className="text-[10px] text-muted-foreground">{track.genre}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[9px] text-muted-foreground">{track.play_count || 0} plays</p>
                      <p className="text-[9px] text-muted-foreground">{formatDate(track.created_at)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-50">
            <div className="flex items-center gap-3">
              <img 
                src={currentTrack.album_art_url || '/src/assets/card-1.png'} 
                alt={currentTrack.title} 
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/card-1.png';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.genre}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90 rounded-full"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-32">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
              </div>
            </div>
            <div className="mt-2">
              <Slider value={[progress]} max={100} step={0.1} className="w-full" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;
