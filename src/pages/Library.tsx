import { Link, useNavigate } from 'react-router-dom';
import { Home, Library as LibraryIcon, Sparkles, User, Settings, Menu, X, Gift, Play, Pause, Download, Share2, MoreVertical, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

const Library = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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

  const generatedTracks = [
    { id: 1, title: 'Summer Vibes Remix', genre: 'Amapiano', date: '2024-01-15', duration: '3:24', artwork: '/src/assets/track-1.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 2, title: 'Night Drive Trap', genre: 'Trap', date: '2024-01-14', duration: '2:58', artwork: '/src/assets/track-2.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 3, title: 'Country Soul', genre: 'Country', date: '2024-01-13', duration: '4:12', artwork: '/src/assets/track-3.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 4, title: 'Jazz Fusion', genre: 'Jazz', date: '2024-01-12', duration: '5:03', artwork: '/src/assets/track-4.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 5, title: 'Gospel Energy', genre: 'Gospel', date: '2024-01-11', duration: '3:58', artwork: '/src/assets/track-5.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 6, title: 'City Lights Jazz', genre: 'Jazz', date: '2024-01-10', duration: '4:22', artwork: '/src/assets/track-6.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { id: 7, title: 'Ocean Wave Soul', genre: 'Soul', date: '2024-01-09', duration: '3:41', artwork: '/src/assets/track-7.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { id: 8, title: 'Desert Rose 80s', genre: '80s', date: '2024-01-08', duration: '4:15', artwork: '/src/assets/track-8.jpeg', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  ];

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.audio;
        audioRef.current.play();
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
                <p className="text-xs text-muted-foreground">All your generated music</p>
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
              <p className="text-lg lg:text-xl font-bold text-foreground">{generatedTracks.length}</p>
            </Card>
            <Card className="p-3 lg:p-4">
              <h3 className="text-[10px] text-muted-foreground mb-0.5">This Week</h3>
              <p className="text-lg lg:text-xl font-bold text-foreground">4</p>
            </Card>
            <Card className="p-3 lg:p-4">
              <h3 className="text-[10px] text-muted-foreground mb-0.5">Total Duration</h3>
              <p className="text-lg lg:text-xl font-bold text-foreground">32:53</p>
            </Card>
          </div>

          {/* Tracks Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
            {generatedTracks.map((track) => (
              <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors overflow-hidden group">
                <div className="aspect-square bg-muted relative">
                  <img 
                    src={track.artwork} 
                    alt={track.title}
                    className="absolute inset-0 w-full h-full object-cover"
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
                          Get Stem
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-2 lg:p-3">
                  <h3 className="font-medium text-foreground mb-0.5 text-xs truncate">{track.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{track.genre}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[9px] text-muted-foreground">{track.duration}</p>
                    <p className="text-[9px] text-muted-foreground">{track.date}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-50">
            <div className="flex items-center gap-3">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" />
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
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Library;