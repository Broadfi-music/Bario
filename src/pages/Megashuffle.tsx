import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, Play, Pause, ChevronLeft, Shuffle, Heart, TrendingUp, TrendingDown, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';

const mockArtists = [
  { id: 1, name: 'Nova Echo', genre: 'Synth-Pop', avatar: '/src/assets/card-1.png', tagline: 'Blending retro synths with modern beats', followers: '45.2K' },
  { id: 2, name: 'Synthwave Kid', genre: 'Electronic', avatar: '/src/assets/card-2.png', tagline: 'Your gateway to the neon future', followers: '38.7K' },
  { id: 3, name: 'Lagos Sound', genre: 'Afrobeats', avatar: '/src/assets/card-5.png', tagline: 'Bringing the heat from the streets of Lagos', followers: '67.3K' },
  { id: 4, name: 'Seoul Stars', genre: 'K-Pop', avatar: '/src/assets/track-3.jpeg', tagline: 'Global K-Pop sensations', followers: '124K' },
  { id: 5, name: 'Beach House', genre: 'Indie', avatar: '/src/assets/track-1.jpeg', tagline: 'Dreamy soundscapes for your soul', followers: '52.1K' },
  { id: 6, name: 'DJ Pulse', genre: 'House', avatar: '/src/assets/card-4.png', tagline: 'Making the world dance since 2018', followers: '89.4K' },
  { id: 7, name: 'Amber Waves', genre: 'Country', avatar: '/src/assets/card-3.png', tagline: 'Modern country with a twist', followers: '31.2K' },
  { id: 8, name: 'Yuki Beats', genre: 'J-Pop', avatar: '/src/assets/track-2.jpeg', tagline: 'Tokyo vibes, worldwide appeal', followers: '76.8K' },
];

const trendingSongs = [
  { id: 1, title: 'Midnight Dreams', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', plays: '2.4M', duration: '3:24', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'Electric Soul', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', plays: '1.8M', duration: '3:52', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'Lagos Nights', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', plays: '1.5M', duration: '4:01', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 4, title: 'Seoul Sunset', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg', plays: '1.2M', duration: '3:33', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 5, title: 'Ocean Breeze', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg', plays: '980K', duration: '4:15', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 6, title: 'Club Anthem', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', plays: '876K', duration: '3:45', audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
];

const newArtists = [
  { id: 1, name: 'Nova Echo', genre: 'Synth-Pop', avatar: '/src/assets/card-1.png', monthlyListeners: '4.2M' },
  { id: 2, name: 'Lagos Sound', genre: 'Afrobeats', avatar: '/src/assets/card-5.png', monthlyListeners: '3.8M' },
  { id: 3, name: 'Seoul Stars', genre: 'K-Pop', avatar: '/src/assets/track-3.jpeg', monthlyListeners: '6.1M' },
  { id: 4, name: 'DJ Pulse', genre: 'House', avatar: '/src/assets/card-4.png', monthlyListeners: '2.9M' },
  { id: 5, name: 'Beach House', genre: 'Indie', avatar: '/src/assets/track-1.jpeg', monthlyListeners: '2.4M' },
  { id: 6, name: 'Synthwave Kid', genre: 'Electronic', avatar: '/src/assets/card-2.png', monthlyListeners: '1.9M' },
];

// Generate 50 songs for Top 50
const generateTop50Songs = () => {
  const baseSongs = [
    { title: 'Global Hit #1', artist: 'Nova Echo', artwork: '/src/assets/card-1.png' },
    { title: 'Chart Topper', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png' },
    { title: 'Platinum Dreams', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg' },
    { title: 'Gold Record', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png' },
    { title: 'Diamond Status', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg' },
    { title: 'Streaming King', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png' },
    { title: 'Radio Favorite', artist: 'Amber Waves', artwork: '/src/assets/card-3.png' },
    { title: 'Viral Moment', artist: 'Yuki Beats', artwork: '/src/assets/track-2.jpeg' },
  ];
  
  const additionalTitles = [
    'Summer Heat', 'Night Vibes', 'City Lights', 'Ocean Waves', 'Mountain High',
    'Desert Sun', 'Forest Rain', 'Electric Love', 'Neon Dreams', 'Moonlight Dance',
    'Starlight', 'Thunder Road', 'Crystal Clear', 'Velvet Sky', 'Golden Days',
    'Silver Lining', 'Bronze Age', 'Platinum Plus', 'Diamond Girl', 'Ruby Red',
    'Emerald City', 'Sapphire Blue', 'Pearl Harbor', 'Jade Garden', 'Amber Alert',
    'Coral Reef', 'Ivory Tower', 'Ebony Night', 'Crimson Tide', 'Azure Sky',
    'Lavender Fields', 'Violet Hour', 'Indigo Child', 'Scarlet Letter', 'Teal Time',
    'Magenta Magic', 'Turquoise Sea', 'Burgundy Wine', 'Chartreuse Dream', 'Mauve Mood',
    'Sepia Tone', 'Beige Beauty'
  ];
  
  const artworks = [
    '/src/assets/card-1.png', '/src/assets/card-2.png', '/src/assets/card-3.png',
    '/src/assets/card-4.png', '/src/assets/card-5.png', '/src/assets/track-1.jpeg',
    '/src/assets/track-2.jpeg', '/src/assets/track-3.jpeg', '/src/assets/track-4.jpeg',
    '/src/assets/track-5.jpeg'
  ];
  
  const artists = ['Nova Echo', 'Lagos Sound', 'Seoul Stars', 'DJ Pulse', 'Beach House', 'Synthwave Kid', 'Amber Waves', 'Yuki Beats', 'Rising Star', 'Fresh Beats'];
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    rank: i + 1,
    title: i < 8 ? baseSongs[i].title : additionalTitles[i - 8] || `Track ${i + 1}`,
    artist: i < 8 ? baseSongs[i].artist : artists[i % artists.length],
    artwork: i < 8 ? baseSongs[i].artwork : artworks[i % artworks.length],
    listeners: Math.floor(8765432 - (i * 150000) + Math.random() * 50000),
    change: Math.floor(Math.random() * 10) - 3,
    trend: Math.random() > 0.4 ? 'up' : Math.random() > 0.5 ? 'down' : 'same',
    audio: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(i % 16) + 1}.mp3`
  }));
};

const formatListeners = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

const Megashuffle = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [currentArtist, setCurrentArtist] = useState(mockArtists[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [top50Songs, setTop50Songs] = useState(generateTop50Songs());
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Realtime ranking updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTop50Songs(prev => {
        const updated = [...prev];
        updated.forEach(item => {
          const change = Math.floor(Math.random() * 10000) - 5000;
          item.listeners = Math.max(100000, item.listeners + change);
          item.change = Math.floor(Math.random() * 10) - 3;
          item.trend = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'same';
        });
        updated.sort((a, b) => b.listeners - a.listeners);
        updated.forEach((item, index) => item.rank = index + 1);
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
      setIsAudioPlaying(false);
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

  const startShuffle = () => {
    setIsShuffling(true);
    
    let count = 0;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * mockArtists.length);
      setCurrentArtist(mockArtists[randomIndex]);
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
    setIsPlaying(false);
    startShuffle();
  };

  const handlePlayTrack = (track: any) => {
    if (currentTrack?.id === track.id && isAudioPlaying) {
      audioRef.current?.pause();
      setIsAudioPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.audio;
        audioRef.current.play();
      }
      setCurrentTrack(track);
      setIsAudioPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isAudioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    }
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
                item.label === 'Megashuffle' 
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
      <main className={`flex-1 overflow-y-auto w-full lg:w-auto relative ${currentTrack ? 'pb-20' : ''}`}>
        <div className="p-3 lg:p-6 relative z-10">
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-sm lg:text-lg font-bold text-foreground">Megashuffle</h1>
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

          {/* Shuffle Section - Compact */}
          <div className="flex flex-col items-center justify-center py-6 mb-6">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-40 animate-pulse" />
              <Button
                onClick={startShuffle}
                disabled={isShuffling}
                className="relative h-10 px-5 text-xs font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-full shadow-xl transition-all transform hover:scale-105"
              >
                <Shuffle className={`h-4 w-4 mr-2 ${isShuffling ? 'animate-spin' : ''}`} />
                {isShuffling ? 'Shuffling...' : 'Shuffle'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Shuffles: {shuffleCount}</p>
          </div>

          {/* Trending Songs - Spotify Style */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Trending Songs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trendingSongs.map((song) => (
                <Card 
                  key={song.id} 
                  className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-2 group"
                  onClick={() => handlePlayTrack(song)}
                >
                  <div className="relative aspect-square mb-2 rounded-md overflow-hidden">
                    <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        {currentTrack?.id === song.id && isAudioPlaying ? (
                          <Pause className="h-4 w-4 text-black" />
                        ) : (
                          <Play className="h-4 w-4 text-black ml-0.5" />
                        )}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-foreground truncate">{song.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                  <p className="text-[9px] text-muted-foreground/60">{song.plays} plays</p>
                </Card>
              ))}
            </div>
          </section>

          {/* New Artists - Spotify Style */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">New Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {newArtists.map((artist) => (
                <Card 
                  key={artist.id} 
                  className="bg-card hover:bg-accent/50 transition-colors cursor-pointer p-3 text-center group"
                >
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <img 
                      src={artist.avatar} 
                      alt={artist.name} 
                      className="w-full h-full rounded-full object-cover shadow-lg"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xs font-medium text-foreground truncate">{artist.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{artist.genre}</p>
                  <p className="text-[9px] text-muted-foreground/60">{artist.monthlyListeners} listeners</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Hot Right Now - Realtime Ranking */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">🔥 Hot Right Now</h2>
                <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
              </div>
            </div>
            <div className="bg-card rounded-xl overflow-hidden border border-border">
              {top50Songs.slice(0, 10).map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => handlePlayTrack(song)}
                  className="flex items-center gap-3 p-2 hover:bg-accent/50 cursor-pointer transition-all border-b border-border/50 last:border-0"
                >
                  <span className={`w-6 text-center text-xs font-bold ${index < 3 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                    {song.rank}
                  </span>
                  <div className="w-4 flex justify-center">
                    {song.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
                    {song.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                    {song.trend === 'same' && <span className="text-[8px] text-muted-foreground">—</span>}
                  </div>
                  <img src={song.artwork} alt={song.title} className="w-8 h-8 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatListeners(song.listeners)}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                    {currentTrack?.id === song.id && isAudioPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Top 50 - Full List */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">🏆 Top 50</h2>
                <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
              </div>
            </div>
            <div className="bg-card rounded-xl overflow-hidden border border-border max-h-[600px] overflow-y-auto">
              {top50Songs.map((song, index) => (
                <div
                  key={song.id}
                  onClick={() => handlePlayTrack(song)}
                  className="flex items-center gap-3 p-2 hover:bg-accent/50 cursor-pointer transition-all border-b border-border/50 last:border-0"
                >
                  <span className={`w-6 text-center text-xs font-bold ${index < 3 ? 'text-yellow-400' : 'text-muted-foreground'}`}>
                    {song.rank}
                  </span>
                  <div className="w-4 flex justify-center">
                    {song.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
                    {song.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                    {song.trend === 'same' && <span className="text-[8px] text-muted-foreground">—</span>}
                  </div>
                  <img src={song.artwork} alt={song.title} className="w-8 h-8 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatListeners(song.listeners)}</span>
                  <span className={`text-[9px] ${song.change > 0 ? 'text-green-400' : song.change < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {song.change > 0 ? '+' : ''}{song.change}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-50">
            <div className="flex items-center gap-3">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-white text-black hover:bg-white/90 rounded-full"
                  onClick={togglePlayPause}
                >
                  {isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
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

      {/* Artist Popup */}
      {showArtistPopup && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900/90 via-black/90 to-blue-900/90 rounded-2xl p-6 max-w-sm w-full border border-white/10 backdrop-blur-xl">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <img 
                  src={currentArtist.avatar} 
                  alt={currentArtist.name}
                  className="w-full h-full rounded-full object-cover border-4 border-white/20"
                />
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-1.5">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-1">{currentArtist.name}</h3>
              <p className="text-purple-300 text-sm mb-2">{currentArtist.genre}</p>
              <p className="text-white/60 text-xs mb-4">{currentArtist.tagline}</p>
              
              <div className="flex items-center justify-center gap-4 mb-4 text-xs">
                <span className="text-white/70">{currentArtist.followers} followers</span>
              </div>
              
              <div className="flex gap-2 mb-4">
                <Button 
                  size="sm"
                  className="flex-1 bg-white text-black hover:bg-white/90 text-xs h-8"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10 text-xs h-8"
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Follow
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={closePopupAndShuffle}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xs h-8"
                >
                  <Shuffle className="h-3 w-3 mr-1" />
                  Shuffle Again
                </Button>
                <Button
                  onClick={() => setShowArtistPopup(false)}
                  variant="ghost"
                  className="text-white/60 hover:text-white text-xs h-8"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Megashuffle;