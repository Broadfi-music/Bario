import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shuffle, Play, Pause, X, Music, 
  Sparkles, Heart, Instagram, Twitter
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
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main Content - Direct Shuffle */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full border border-white/10 mb-3">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span className="text-[9px] text-white/70">Discovery Engine</span>
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold mb-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            MEGASHUFFLE
          </h1>
          <p className="text-[10px] text-white/50">Shuffles: {shuffleCount}</p>
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
            <p className="text-lg font-bold text-white">50K+</p>
            <p className="text-[8px] text-white/40">Artists</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <p className="text-lg font-bold text-white">2M+</p>
            <p className="text-[8px] text-white/40">Shuffles</p>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <p className="text-lg font-bold text-white">150+</p>
            <p className="text-[8px] text-white/40">Countries</p>
          </div>
        </div>
      </div>

      {/* Artist Popup - Smaller Card */}
      {showArtistPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-xs">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl" />
            
            <Card className="relative bg-black/90 border border-white/10 rounded-2xl p-4 overflow-hidden">
              {/* Close button */}
              <button
                onClick={() => { setShowArtistPopup(false); setIsPlaying(false); }}
                className="absolute top-2 right-2 p-1.5 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Artist Avatar */}
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow opacity-40 blur-lg" />
                <img
                  src={currentArtist.avatar}
                  alt={currentArtist.name}
                  className="relative w-full h-full rounded-full object-cover border-2 border-white/20"
                />
              </div>

              {/* Artist Info */}
              <div className="text-center mb-3">
                <h3 className="text-sm font-bold text-white mb-0.5">{currentArtist.name}</h3>
                <p className="text-[10px] text-purple-400 mb-1">{currentArtist.genre}</p>
                <p className="text-[9px] text-white/50 leading-tight">{currentArtist.tagline}</p>
                <p className="text-[8px] text-white/30 mt-1">{currentArtist.followers} followers</p>
              </div>

              {/* Sample Track Player */}
              <div className="bg-white/5 rounded-lg p-2.5 mb-3">
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
                    <p className="text-[9px] text-white font-medium truncate">Sample Track</p>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all ${isPlaying ? 'w-1/3 animate-pulse' : 'w-0'}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <a href={currentArtist.spotify} className="p-2 bg-[#1DB954]/20 rounded-full hover:bg-[#1DB954]/30 transition-colors">
                  <Music className="h-3 w-3 text-[#1DB954]" />
                </a>
                <a href={currentArtist.instagram} className="p-2 bg-pink-500/20 rounded-full hover:bg-pink-500/30 transition-colors">
                  <Instagram className="h-3 w-3 text-pink-400" />
                </a>
                <a href={currentArtist.twitter} className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/30 transition-colors">
                  <Twitter className="h-3 w-3 text-blue-400" />
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleInteraction('follow artist', () => toast.success(`Following ${currentArtist.name}!`))}
                  className="flex-1 h-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-[10px] font-medium rounded-lg"
                >
                  <Heart className="h-3 w-3 mr-1" />
                  Follow
                </Button>
                <Button
                  onClick={closePopupAndShuffle}
                  variant="outline"
                  className="flex-1 h-8 border-white/20 text-white hover:bg-white/10 text-[10px] font-medium rounded-lg"
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
    </div>
  );
};

export default Megashuffle;
