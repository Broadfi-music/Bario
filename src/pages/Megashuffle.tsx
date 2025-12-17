import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, Play, Pause, ChevronLeft, Shuffle, TrendingUp, TrendingDown, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { useMegashuffleMusic, MegashuffleArtist, MegashuffleTrack } from '@/hooks/useDashboardMusic';

const formatListeners = (num: number | string) => {
  if (typeof num === 'string') return num;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const Megashuffle = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { data: musicData, loading: musicLoading, shuffleArtist } = useMegashuffleMusic();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [currentArtist, setCurrentArtist] = useState<MegashuffleArtist | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<MegashuffleTrack | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => { setIsAudioPlaying(false); setProgress(0); });
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, [currentTrack]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  const startShuffle = async () => {
    if (musicData.artists.length === 0) {
      toast.error('Loading artists...');
      return;
    }
    setIsShuffling(true);
    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * musicData.artists.length);
      setCurrentArtist(musicData.artists[randomIndex]);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setIsShuffling(false);
        setShowArtistPopup(true);
        setShuffleCount(prev => prev + 1);
      }
    }, 100);
  };

  const closePopupAndShuffle = () => {
    setShowArtistPopup(false);
    startShuffle();
  };

  const handlePlayTrack = (track: MegashuffleTrack) => {
    if (!track.preview) {
      toast.error('No preview available');
      return;
    }
    if (currentTrack?.id === track.id && isAudioPlaying) {
      audioRef.current?.pause();
      setIsAudioPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview;
        audioRef.current.play().catch(() => toast.error('Unable to play'));
      }
      setCurrentTrack(track);
      setIsAudioPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isAudioPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsAudioPlaying(!isAudioPlaying);
    }
  };

  if (loading || !user) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-foreground">Loading...</div></div>;

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
            <Link key={item.label} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors mb-0.5 ${item.label === 'Megashuffle' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
              <item.icon className="h-4 w-4" /><span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className={`flex-1 overflow-y-auto w-full lg:w-auto relative ${currentTrack ? 'pb-20' : ''}`}>
        <div className="p-3 lg:p-6 relative z-10">
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8"><ChevronLeft className="h-5 w-5" /></Button>
              <h1 className="text-sm lg:text-lg font-bold text-foreground">Megashuffle</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><Avatar className="h-7 w-7"><AvatarImage src="/src/assets/track-1.jpeg" /><AvatarFallback>U</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/dashboard/profile" className="cursor-pointer text-xs">Edit Profile</Link></DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-xs">Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-col items-center justify-center py-6 mb-6">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-40 animate-pulse" />
              <Button onClick={startShuffle} disabled={isShuffling || musicLoading} className="relative h-10 px-5 text-xs font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-full shadow-xl transition-all transform hover:scale-105">
                <Shuffle className={`h-4 w-4 mr-2 ${isShuffling ? 'animate-spin' : ''}`} />
                {isShuffling ? 'Shuffling...' : musicLoading ? 'Loading...' : 'Shuffle'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Shuffles: {shuffleCount}</p>
          </div>

          {/* Trending Songs */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Trending Songs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {musicData.trendingSongs.slice(0, 12).map((song) => (
                <Card key={song.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2 group" onClick={() => handlePlayTrack(song)}>
                  <div className="relative aspect-square mb-2 rounded-md overflow-hidden">
                    <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        {currentTrack?.id === song.id && isAudioPlaying ? <Pause className="h-4 w-4 text-black" /> : <Play className="h-4 w-4 text-black ml-0.5" />}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-foreground truncate">{song.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* New Artists */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">New Artists</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {musicData.artists.slice(0, 12).map((artist) => (
                <div key={artist.id} className="text-center">
                  <Avatar className="w-14 h-14 mx-auto mb-2">
                    <AvatarImage src={artist.avatar} />
                    <AvatarFallback>{artist.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium text-foreground truncate">{artist.name}</p>
                  <p className="text-[10px] text-muted-foreground">{artist.monthlyListeners} listeners</p>
                </div>
              ))}
            </div>
          </section>

          {/* Top 50 */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Top 50 New Releases</h2>
            <div className="space-y-1">
              {musicData.top50Songs.slice(0, 20).map((song) => (
                <Card key={song.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2" onClick={() => handlePlayTrack(song)}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs font-bold text-muted-foreground">{song.rank}</span>
                    {song.trend === 'up' ? <TrendingUp className="h-3 w-3 text-green-500" /> : song.trend === 'down' ? <TrendingDown className="h-3 w-3 text-red-500" /> : <span className="w-3" />}
                    <img src={song.artwork} alt={song.title} className="w-8 h-8 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{typeof song.listeners === 'number' ? formatListeners(song.listeners) : song.listeners}</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Artist Popup */}
        {showArtistPopup && currentArtist && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-6 text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={currentArtist.avatar} />
                <AvatarFallback>{currentArtist.name?.[0]}</AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-foreground mb-1">{currentArtist.name}</h2>
              <p className="text-sm text-muted-foreground mb-2">{currentArtist.genre}</p>
              <p className="text-xs text-muted-foreground mb-4">{currentArtist.monthlyListeners} monthly listeners</p>
              <div className="flex gap-2">
                <Button onClick={() => setShowArtistPopup(false)} variant="outline" className="flex-1 text-xs">Close</Button>
                <Button onClick={closePopupAndShuffle} className="flex-1 text-xs bg-gradient-to-r from-blue-500 to-purple-500">Shuffle Again</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-40">
            <div className="flex items-center gap-3">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8"><SkipBack className="h-4 w-4" /></Button>
                <Button size="icon" className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90 rounded-full" onClick={togglePlayPause}>
                  {isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
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

export default Megashuffle;
