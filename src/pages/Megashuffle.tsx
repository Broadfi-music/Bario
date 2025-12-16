import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Gift, Play, Pause, ChevronLeft, Shuffle, Heart, Instagram, Twitter, Music, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  { id: 1, title: 'Midnight Dreams', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', plays: '2.4M', duration: '3:24' },
  { id: 2, title: 'Electric Soul', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', plays: '1.8M', duration: '3:52' },
  { id: 3, title: 'Lagos Nights', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', plays: '1.5M', duration: '4:01' },
  { id: 4, title: 'Seoul Sunset', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg', plays: '1.2M', duration: '3:33' },
  { id: 5, title: 'Ocean Breeze', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg', plays: '980K', duration: '4:15' },
  { id: 6, title: 'Club Anthem', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', plays: '876K', duration: '3:45' },
];

const popularArtists = [
  { id: 1, name: 'Nova Echo', genre: 'Synth-Pop', avatar: '/src/assets/card-1.png', monthlyListeners: '4.2M' },
  { id: 2, name: 'Lagos Sound', genre: 'Afrobeats', avatar: '/src/assets/card-5.png', monthlyListeners: '3.8M' },
  { id: 3, name: 'Seoul Stars', genre: 'K-Pop', avatar: '/src/assets/track-3.jpeg', monthlyListeners: '6.1M' },
  { id: 4, name: 'DJ Pulse', genre: 'House', avatar: '/src/assets/card-4.png', monthlyListeners: '2.9M' },
  { id: 5, name: 'Beach House', genre: 'Indie', avatar: '/src/assets/track-1.jpeg', monthlyListeners: '2.4M' },
  { id: 6, name: 'Synthwave Kid', genre: 'Electronic', avatar: '/src/assets/card-2.png', monthlyListeners: '1.9M' },
];

const generateRankingData = () => [
  { id: 1, rank: 1, title: 'Viral Sensation', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', listeners: 2456789, change: 12, trend: 'up' },
  { id: 2, rank: 2, title: 'Summer Anthem', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', listeners: 2234567, change: 8, trend: 'up' },
  { id: 3, rank: 3, title: 'Night Drive', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', listeners: 1987654, change: -3, trend: 'down' },
  { id: 4, rank: 4, title: 'K-Pop Dreams', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg', listeners: 1876543, change: 15, trend: 'up' },
  { id: 5, rank: 5, title: 'Beach Vibes', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg', listeners: 1654321, change: -2, trend: 'down' },
  { id: 6, rank: 6, title: 'Club Banger', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', listeners: 1543210, change: 5, trend: 'up' },
  { id: 7, rank: 7, title: 'Country Roads', artist: 'Amber Waves', artwork: '/src/assets/card-3.png', listeners: 1432109, change: -1, trend: 'down' },
  { id: 8, rank: 8, title: 'Tokyo Lights', artist: 'Yuki Beats', artwork: '/src/assets/track-2.jpeg', listeners: 1321098, change: 9, trend: 'up' },
];

const newArtistsRanking = [
  { id: 1, rank: 1, name: 'Rising Star', genre: 'Pop', avatar: '/src/assets/card-1.png', listeners: 567890, change: 45, trend: 'up' },
  { id: 2, rank: 2, name: 'Fresh Beats', genre: 'Hip Hop', avatar: '/src/assets/card-2.png', listeners: 456789, change: 32, trend: 'up' },
  { id: 3, rank: 3, name: 'Indie Dreams', genre: 'Indie', avatar: '/src/assets/track-1.jpeg', listeners: 345678, change: 18, trend: 'up' },
  { id: 4, rank: 4, name: 'EDM King', genre: 'EDM', avatar: '/src/assets/card-4.png', listeners: 234567, change: -5, trend: 'down' },
  { id: 5, rank: 5, name: 'Soul Sister', genre: 'R&B', avatar: '/src/assets/card-5.png', listeners: 198765, change: 22, trend: 'up' },
];

const top50Songs = [
  { id: 1, rank: 1, title: 'Global Hit #1', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', listeners: 8765432, change: 0, trend: 'same' },
  { id: 2, rank: 2, title: 'Chart Topper', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', listeners: 7654321, change: 2, trend: 'up' },
  { id: 3, rank: 3, title: 'Platinum Dreams', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg', listeners: 6543210, change: -1, trend: 'down' },
  { id: 4, rank: 4, title: 'Gold Record', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', listeners: 5432109, change: 3, trend: 'up' },
  { id: 5, rank: 5, title: 'Diamond Status', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg', listeners: 4321098, change: -2, trend: 'down' },
  { id: 6, rank: 6, title: 'Streaming King', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', listeners: 3210987, change: 1, trend: 'up' },
  { id: 7, rank: 7, title: 'Radio Favorite', artist: 'Amber Waves', artwork: '/src/assets/card-3.png', listeners: 2109876, change: 4, trend: 'up' },
  { id: 8, rank: 8, title: 'Viral Moment', artist: 'Yuki Beats', artwork: '/src/assets/track-2.jpeg', listeners: 1098765, change: -3, trend: 'down' },
];

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
  const [rankingData, setRankingData] = useState(generateRankingData());
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Realtime ranking updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setRankingData(prev => {
        const updated = [...prev];
        // Randomly adjust listeners and rankings
        updated.forEach(item => {
          const change = Math.floor(Math.random() * 10000) - 5000;
          item.listeners = Math.max(100000, item.listeners + change);
          item.change = Math.floor(Math.random() * 20) - 5;
          item.trend = item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'same';
        });
        // Re-sort by listeners
        updated.sort((a, b) => b.listeners - a.listeners);
        updated.forEach((item, index) => item.rank = index + 1);
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const handlePlayTrack = (trackId: number) => {
    setPlayingTrackId(playingTrackId === trackId ? null : trackId);
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
      <main className="flex-1 overflow-y-auto w-full lg:w-auto relative">
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
                  onClick={() => handlePlayTrack(song.id)}
                >
                  <div className="relative aspect-square mb-2 rounded-md overflow-hidden">
                    <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        {playingTrackId === song.id ? (
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

          {/* Popular Artists - Spotify Style */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">Popular Artists</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {popularArtists.map((artist) => (
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
                  <p className="text-[9px] text-muted-foreground/60">{artist.monthlyListeners} monthly</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Realtime Rankings - Audiomack Style */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">🔥 Hot Right Now</h2>
              <span className="text-[9px] text-green-500 animate-pulse">● LIVE</span>
            </div>
            <Card className="bg-card border border-border overflow-hidden">
              {rankingData.map((item, index) => (
                <div 
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 hover:bg-accent/50 transition-colors cursor-pointer ${index !== rankingData.length - 1 ? 'border-b border-border' : ''}`}
                  onClick={() => handlePlayTrack(item.id + 100)}
                >
                  <div className="w-6 text-center">
                    <span className={`text-xs font-bold ${item.rank <= 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {item.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-8">
                    {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {item.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    <span className={`text-[9px] ${item.trend === 'up' ? 'text-green-500' : item.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {item.change > 0 ? `+${item.change}` : item.change}
                    </span>
                  </div>
                  <div className="relative w-10 h-10 flex-shrink-0 group">
                    <img src={item.artwork} alt={item.title} className="w-full h-full rounded object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                      {playingTrackId === item.id + 100 ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground truncate">{item.title}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{item.artist}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-foreground">{formatListeners(item.listeners)}</p>
                    <p className="text-[8px] text-muted-foreground">listeners</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {/* New Artists - Audiomack Style */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">🌟 Rising New Artists</h2>
            <Card className="bg-card border border-border overflow-hidden">
              {newArtistsRanking.map((artist, index) => (
                <div 
                  key={artist.id}
                  className={`flex items-center gap-3 p-2.5 hover:bg-accent/50 transition-colors cursor-pointer ${index !== newArtistsRanking.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="w-6 text-center">
                    <span className={`text-xs font-bold ${artist.rank <= 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {artist.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-8">
                    {artist.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {artist.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    <span className={`text-[9px] ${artist.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {artist.change > 0 ? `+${artist.change}` : artist.change}
                    </span>
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={artist.avatar} />
                    <AvatarFallback>{artist.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground truncate">{artist.name}</h4>
                    <p className="text-[10px] text-muted-foreground">{artist.genre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-foreground">{formatListeners(artist.listeners)}</p>
                    <p className="text-[8px] text-muted-foreground">listeners</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {/* Top 50 - Audiomack Style */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-foreground mb-3">🏆 Top 50</h2>
            <Card className="bg-card border border-border overflow-hidden">
              {top50Songs.map((song, index) => (
                <div 
                  key={song.id}
                  className={`flex items-center gap-3 p-2.5 hover:bg-accent/50 transition-colors cursor-pointer ${index !== top50Songs.length - 1 ? 'border-b border-border' : ''}`}
                  onClick={() => handlePlayTrack(song.id + 200)}
                >
                  <div className="w-6 text-center">
                    <span className={`text-xs font-bold ${song.rank <= 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                      {song.rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-8">
                    {song.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                    {song.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {song.trend === 'same' && <span className="text-[9px] text-muted-foreground">—</span>}
                    {song.trend !== 'same' && (
                      <span className={`text-[9px] ${song.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {song.change > 0 ? `+${song.change}` : song.change}
                      </span>
                    )}
                  </div>
                  <div className="relative w-10 h-10 flex-shrink-0 group">
                    <img src={song.artwork} alt={song.title} className="w-full h-full rounded object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                      {playingTrackId === song.id + 200 ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-medium text-foreground truncate">{song.title}</h4>
                    <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-foreground">{formatListeners(song.listeners)}</p>
                    <p className="text-[8px] text-muted-foreground">listeners</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </div>

        {/* Artist Popup */}
        {showArtistPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-xs">
              <Card className="relative bg-card border border-border rounded-2xl p-4 overflow-hidden">
                <button
                  onClick={() => { setShowArtistPopup(false); setIsPlaying(false); }}
                  className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative w-16 h-16 mx-auto mb-3">
                  <img
                    src={currentArtist.avatar}
                    alt={currentArtist.name}
                    className="relative w-full h-full rounded-full object-cover border-2 border-border"
                  />
                </div>

                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold text-foreground mb-0.5">{currentArtist.name}</h3>
                  <p className="text-[10px] text-purple-400 mb-1">{currentArtist.genre}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{currentArtist.tagline}</p>
                  <p className="text-[8px] text-muted-foreground/60 mt-1">{currentArtist.followers} followers</p>
                </div>

                <div className="bg-accent/50 rounded-lg p-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center hover:scale-105 transition-transform flex-shrink-0"
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3 text-white" />
                      ) : (
                        <Play className="h-3 w-3 text-white ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-foreground font-medium truncate">Sample Track</p>
                      <div className="h-1 bg-border rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all ${isPlaying ? 'w-1/3 animate-pulse' : 'w-0'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <button className="p-2 bg-[#1DB954]/20 rounded-full hover:bg-[#1DB954]/30 transition-colors">
                    <Music className="h-3 w-3 text-[#1DB954]" />
                  </button>
                  <button className="p-2 bg-pink-500/20 rounded-full hover:bg-pink-500/30 transition-colors">
                    <Instagram className="h-3 w-3 text-pink-400" />
                  </button>
                  <button className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/30 transition-colors">
                    <Twitter className="h-3 w-3 text-blue-400" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => toast.success(`Following ${currentArtist.name}!`)}
                    className="flex-1 h-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-[10px] font-medium rounded-lg"
                  >
                    <Heart className="h-3 w-3 mr-1" />
                    Follow
                  </Button>
                  <Button
                    onClick={closePopupAndShuffle}
                    variant="outline"
                    className="flex-1 h-8 text-[10px] font-medium rounded-lg"
                  >
                    <Shuffle className="h-3 w-3 mr-1" />
                    Again
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Megashuffle;