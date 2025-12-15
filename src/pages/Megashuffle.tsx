import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shuffle, Play, Pause, X, ExternalLink, Music, Users, 
  Sparkles, ChevronLeft, Heart, Share2, Instagram, Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock artists data
const mockArtists = [
  { id: 1, name: 'Nova Echo', genre: 'Synth-Pop', avatar: '/src/assets/card-1.png', tagline: 'Blending retro synths with modern beats', followers: '45.2K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 2, name: 'Synthwave Kid', genre: 'Electronic', avatar: '/src/assets/card-2.png', tagline: 'Your gateway to the neon future', followers: '38.7K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 3, name: 'Lagos Sound', genre: 'Afrobeats', avatar: '/src/assets/card-5.png', tagline: 'Bringing the heat from the streets of Lagos', followers: '67.3K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 4, name: 'Seoul Stars', genre: 'K-Pop', avatar: '/src/assets/track-3.jpeg', tagline: 'Global K-Pop sensations', followers: '124K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 5, name: 'Beach House', genre: 'Indie', avatar: '/src/assets/track-1.jpeg', tagline: 'Dreamy soundscapes for your soul', followers: '52.1K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 6, name: 'DJ Pulse', genre: 'House', avatar: '/src/assets/card-4.png', tagline: 'Making the world dance since 2018', followers: '89.4K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 7, name: 'Amber Waves', genre: 'Country', avatar: '/src/assets/card-3.png', tagline: 'Modern country with a twist', followers: '31.2K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
  { id: 8, name: 'Yuki Beats', genre: 'J-Pop', avatar: '/src/assets/track-2.jpeg', tagline: 'Tokyo vibes, worldwide appeal', followers: '76.8K', trackUrl: '#', spotify: '#', instagram: '#', twitter: '#' },
];

const Megashuffle = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isShuffling, setIsShuffling] = useState(false);
  const [showArtistPopup, setShowArtistPopup] = useState(false);
  const [currentArtist, setCurrentArtist] = useState(mockArtists[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const startShuffle = () => {
    handleInteraction('start shuffling', () => {
      setIsShuffling(true);
      
      // Simulate shuffle animation
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
    });
  };

  const closePopupAndShuffle = () => {
    setShowArtistPopup(false);
    setIsPlaying(false);
    startShuffle();
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Particle effects */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-ping"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-6">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">Shuffles: {shuffleCount}</span>
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-3 rounded-lg font-medium">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-3 rounded-lg font-medium">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 min-h-screen flex flex-col items-center justify-center">
        {/* Hero Section */}
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full border border-white/10 mb-6">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-white/70">World's Largest Music Discovery Engine</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Every Shuffle.
          </h1>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
            A New Artist.
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-8 max-w-md mx-auto">
            Discover new sounds every time you press play. Experience the world's largest randomized music discovery engine.
          </p>

          {/* Shuffle Button */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <Button
              onClick={startShuffle}
              disabled={isShuffling}
              className="relative h-16 sm:h-20 px-8 sm:px-12 text-base sm:text-lg font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-full shadow-2xl transition-all transform hover:scale-105"
            >
              <Shuffle className={`h-5 w-5 sm:h-6 sm:w-6 mr-2 ${isShuffling ? 'animate-spin' : ''}`} />
              {isShuffling ? 'Shuffling...' : 'Start Shuffling'}
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-12">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">50K+</p>
              <p className="text-[10px] sm:text-xs text-white/50">Artists</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">2M+</p>
              <p className="text-[10px] sm:text-xs text-white/50">Shuffles</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white">150+</p>
              <p className="text-[10px] sm:text-xs text-white/50">Countries</p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => handleInteraction('submit your music')}
            className="h-12 px-6 text-sm border-white/20 text-white hover:bg-white/10 rounded-full"
          >
            <Music className="h-4 w-4 mr-2" />
            Submit Your Music
          </Button>
          <Button
            variant="outline"
            onClick={() => handleInteraction('join the movement')}
            className="h-12 px-6 text-sm border-purple-500/50 text-purple-400 hover:bg-purple-500/10 rounded-full"
          >
            <Users className="h-4 w-4 mr-2" />
            Join the Discovery Movement
          </Button>
        </div>
      </main>

      {/* Artist Popup */}
      {showArtistPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-2xl" />
            
            <Card className="relative bg-black/90 border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden">
              {/* Close button */}
              <button
                onClick={() => { setShowArtistPopup(false); setIsPlaying(false); }}
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Artist Avatar */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow opacity-50 blur-xl" />
                <img
                  src={currentArtist.avatar}
                  alt={currentArtist.name}
                  className="relative w-full h-full rounded-full object-cover border-4 border-white/20"
                />
              </div>

              {/* Artist Info */}
              <div className="text-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{currentArtist.name}</h3>
                <p className="text-sm text-purple-400 mb-2">{currentArtist.genre}</p>
                <p className="text-xs text-white/60">{currentArtist.tagline}</p>
                <p className="text-[10px] text-white/40 mt-2">{currentArtist.followers} followers</p>
              </div>

              {/* Sample Track Player */}
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white ml-1" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs text-white font-medium">Sample Track</p>
                    <p className="text-[10px] text-white/50">3:24</p>
                  </div>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all ${isPlaying ? 'w-1/3 animate-pulse' : 'w-0'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <a href={currentArtist.spotify} className="p-3 bg-[#1DB954]/20 rounded-full hover:bg-[#1DB954]/30 transition-colors">
                  <Music className="h-4 w-4 text-[#1DB954]" />
                </a>
                <a href={currentArtist.instagram} className="p-3 bg-pink-500/20 rounded-full hover:bg-pink-500/30 transition-colors">
                  <Instagram className="h-4 w-4 text-pink-400" />
                </a>
                <a href={currentArtist.twitter} className="p-3 bg-blue-500/20 rounded-full hover:bg-blue-500/30 transition-colors">
                  <Twitter className="h-4 w-4 text-blue-400" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleInteraction('follow artist', () => toast.success(`Following ${currentArtist.name}!`))}
                  className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-sm font-medium rounded-xl"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Follow Artist
                </Button>
                <Button
                  onClick={closePopupAndShuffle}
                  variant="outline"
                  className="flex-1 h-11 border-white/20 text-white hover:bg-white/10 text-sm font-medium rounded-xl"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle Again
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
    </div>
  );
};

export default Megashuffle;
