import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Menu, X, Globe, Zap, Play, Pause, ChevronLeft, Shuffle, Heart, Instagram, Twitter, Music } from 'lucide-react';
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

const Megashuffle = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [currentArtist, setCurrentArtist] = useState(mockArtists[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
    { icon: Globe, label: 'Heatmap', path: '/global-heatmap' },
    { icon: Zap, label: 'Alpha', path: '/music-alpha' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
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
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

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

          {/* Shuffle Content */}
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full border border-border mb-3">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-[9px] text-muted-foreground">Discovery Engine</span>
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Every Shuffle. A New Artist.
              </h2>
              <p className="text-xs text-muted-foreground mb-1">Discover new sounds every time you press play.</p>
              <p className="text-[10px] text-muted-foreground/60">Shuffles: {shuffleCount}</p>
            </div>

            {/* Shuffle Button */}
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-40 animate-pulse" />
              <Button
                onClick={startShuffle}
                disabled={isShuffling}
                className="relative h-14 px-8 text-sm font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-full shadow-xl transition-all transform hover:scale-105"
              >
                <Shuffle className={`h-4 w-4 mr-2 ${isShuffling ? 'animate-spin' : ''}`} />
                {isShuffling ? 'Shuffling...' : 'Shuffle'}
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">50K+</p>
                <p className="text-[8px] text-muted-foreground">Artists</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <p className="text-lg font-bold text-foreground">2M+</p>
                <p className="text-[8px] text-muted-foreground">Shuffles</p>
              </div>
              <div className="w-px h-6 bg-border" />
              <div>
                <p className="text-lg font-bold text-foreground">150+</p>
                <p className="text-[8px] text-muted-foreground">Countries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Artist Popup */}
        {showArtistPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
              
              <Card className="relative bg-card border border-border rounded-2xl p-4 overflow-hidden">
                <button
                  onClick={() => { setShowArtistPopup(false); setIsPlaying(false); }}
                  className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="relative w-20 h-20 mx-auto mb-3">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow opacity-40 blur-lg" />
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

        <style>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
        `}</style>
      </main>
    </div>
  );
};

export default Megashuffle;
