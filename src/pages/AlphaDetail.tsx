import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play, Pause,
  Users, Brain, Zap, Clock, Target, Check, X, Trophy, ChevronLeft, ChevronRight,
  Plus, Minus, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAlphaPredictions, PredictionMarket } from '@/hooks/useAlphaPredictions';
import { supabase } from '@/integrations/supabase/client';

// Platform Icons
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#1DB954">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FA243C">
    <path d="M23.994 6.124c0-.738-.065-1.47-.24-2.19a4.93 4.93 0 00-.75-1.69 3.57 3.57 0 00-1.3-1.123 4.77 4.77 0 00-1.71-.51C19.01.5 17.86.5 17.14.5H6.85c-.72 0-1.87 0-2.86.11a4.77 4.77 0 00-1.71.51 3.57 3.57 0 00-1.3 1.124 4.93 4.93 0 00-.75 1.69C.07 4.64.005 5.37.005 6.11v11.78c0 .74.065 1.47.24 2.19.175.72.43 1.24.75 1.69.32.45.77.86 1.3 1.12.53.27 1.1.44 1.71.51.99.11 2.14.11 2.86.11h10.29c.72 0 1.87 0 2.86-.11a4.77 4.77 0 001.71-.51c.53-.26.98-.67 1.3-1.12.32-.45.575-.97.75-1.69.175-.72.24-1.45.24-2.19V6.124z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#FEAA2D">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM0 12.59v3.027h5.188v-3.028H0zm6.27 0v3.027h5.189v-3.028h-5.19zm6.27 0v3.027h5.19v-3.028h-5.19zm6.27 0v3.027H24v-3.028h-5.19zM0 16.81v3.029h5.188v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

const AudiusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="#CC0FE0">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.656c-.164.238-.41.376-.688.376H6.794c-.278 0-.524-.138-.688-.376-.164-.238-.205-.537-.114-.815l2.55-6.967c.123-.336.447-.56.802-.56h5.312c.355 0 .679.224.802.56l2.55 6.967c.091.278.05.577-.114.815z"/>
  </svg>
);

// 15 Real songs with links
const realSongs = [
  { id: '1', title: 'Shakira', artist: 'Rema', spotifyUrl: 'https://open.spotify.com/track/0fSAknRnRsFhq2xKL9J79k', deezerUrl: 'https://www.deezer.com/track/1743527187', artwork: 'https://i.scdn.co/image/ab67616d0000b2732177d85546c8a06ffbbdac86', isAIPick: false },
  { id: '2', title: 'Unavailable', artist: 'Davido ft. Musa Keys', spotifyUrl: 'https://open.spotify.com/track/0wMchz69c0ISYjLDXKmyuP', deezerUrl: 'https://www.deezer.com/track/2181127777', artwork: 'https://i.scdn.co/image/ab67616d0000b2731d0d1d67f7c9a79d3e30ec8e', isAIPick: false },
  { id: '3', title: 'Water', artist: 'Tyla', spotifyUrl: 'https://open.spotify.com/track/2fSH0YPiT0GDMNNg0A93kS', deezerUrl: 'https://www.deezer.com/track/2410259555', artwork: 'https://i.scdn.co/image/ab67616d0000b2732d47b7fc7e1c4eebd9dee8bc', isAIPick: true },
  { id: '4', title: 'Bahamas', artist: 'Afrobeats Stars', spotifyUrl: 'https://open.spotify.com/track/5Xkao99ZQlNg4j3zOqBZMB', deezerUrl: 'https://www.deezer.com/track/2425678123', artwork: 'https://i.scdn.co/image/ab67616d0000b273456abc789def012345678901', isAIPick: false },
  { id: '5', title: 'Essence', artist: 'Wizkid ft. Tems', spotifyUrl: 'https://open.spotify.com/track/47EbNezNmZhvgqcZZKLCQ2', deezerUrl: 'https://www.deezer.com/track/1287654890', artwork: 'https://i.scdn.co/image/ab67616d0000b2732d4cf01a8f8c2e3a4b5c6d7e', isAIPick: false },
  { id: '6', title: 'Last Last', artist: 'Burna Boy', spotifyUrl: 'https://open.spotify.com/track/0LD8sZzzFPaP0hADPXpQv1', deezerUrl: 'https://www.deezer.com/track/1845672345', artwork: 'https://i.scdn.co/image/ab67616d0000b2739012345678abcdef01234567', isAIPick: false },
  { id: '7', title: 'Calm Down', artist: 'Rema ft. Selena Gomez', spotifyUrl: 'https://open.spotify.com/track/0WtM2NBVQNNwLSAZaHMh6h', deezerUrl: 'https://www.deezer.com/track/1923456789', artwork: 'https://i.scdn.co/image/ab67616d0000b273fedcba0987654321abcdef09', isAIPick: true },
  { id: '8', title: 'Rush', artist: 'Ayra Starr', spotifyUrl: 'https://open.spotify.com/track/1QvZ3lJePNkfBcZ8yqzYmT', deezerUrl: 'https://www.deezer.com/track/2056789012', artwork: 'https://i.scdn.co/image/ab67616d0000b2730123456789abcdef01234567', isAIPick: false },
  { id: '9', title: 'Infinity', artist: 'Olamide ft. Omah Lay', spotifyUrl: 'https://open.spotify.com/track/3n8LfRf4vH5q9x2K8m1J0L', deezerUrl: 'https://www.deezer.com/track/1678901234', artwork: 'https://i.scdn.co/image/ab67616d0000b273789abcdef0123456789abcde', isAIPick: false },
  { id: '10', title: 'Bloody Samaritan', artist: 'Ayra Starr', spotifyUrl: 'https://open.spotify.com/track/6Qy0tNPnHxNGr8VVz0R2x5', deezerUrl: 'https://www.deezer.com/track/1567890123', artwork: 'https://i.scdn.co/image/ab67616d0000b2730987654321fedcba09876543', isAIPick: false },
  { id: '11', title: 'Ke Star', artist: 'Focalistic ft. Davido', spotifyUrl: 'https://open.spotify.com/track/4F5nWTJL7v8H2q9K1m3N0P', deezerUrl: 'https://www.deezer.com/track/1789012345', artwork: 'https://i.scdn.co/image/ab67616d0000b273dcba0987654321fedcba0987', isAIPick: false },
  { id: '12', title: 'Joha', artist: 'Adekunle Gold', spotifyUrl: 'https://open.spotify.com/track/5G6nWTKL8v9I3r0L2n4O1Q', deezerUrl: 'https://www.deezer.com/track/1890123456', artwork: 'https://i.scdn.co/image/ab67616d0000b273ba0987654321fedcba098765', isAIPick: true },
  { id: '13', title: 'Peru', artist: 'Fireboy DML', spotifyUrl: 'https://open.spotify.com/track/2HEfI5x7L9w0J4s1M3n5O2', deezerUrl: 'https://www.deezer.com/track/1456789012', artwork: 'https://i.scdn.co/image/ab67616d0000b2730987654321dcba0987654321', isAIPick: false },
  { id: '14', title: 'Mavin All Stars', artist: 'Mavin Records', spotifyUrl: 'https://open.spotify.com/track/7J7nWUMM9v0K5t2N4o6P3R', deezerUrl: 'https://www.deezer.com/track/1234567890', artwork: 'https://i.scdn.co/image/ab67616d0000b273654321dcba0987654321dcba', isAIPick: false },
  { id: '15', title: 'Monalisa', artist: 'Lojay ft. Sarz', spotifyUrl: 'https://open.spotify.com/track/8K8nWVNN0w1L6u3O5p7Q4S', deezerUrl: 'https://www.deezer.com/track/1345678901', artwork: 'https://i.scdn.co/image/ab67616d0000b27321dcba0987654321dcba0987', isAIPick: false },
];

// Top voters for leaderboard
const topVoters = [
  { name: 'ChartMaster99', avatar: '🎯', score: 2450, winRate: 78 },
  { name: 'BeatProphet', avatar: '🔮', score: 2180, winRate: 75 },
  { name: 'TrendHunter', avatar: '🎵', score: 1920, winRate: 72 },
  { name: 'ViralQueen', avatar: '👑', score: 1780, winRate: 69 },
  { name: 'MusicOracle', avatar: '🎸', score: 1650, winRate: 67 },
];

const AlphaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState('forecast');
  const [userPrediction, setUserPrediction] = useState<'will' | 'wont' | null>(null);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPoints, setUserPoints] = useState(1000);
  const [allocatedPoints, setAllocatedPoints] = useState(100);
  const [leverage, setLeverage] = useState(1);
  const [songVotes, setSongVotes] = useState<Record<string, { vote: 'yes' | 'no', leverage: number, points: number }>>({});
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  
  const { markets, submitPrediction, loading } = useAlphaPredictions();
  
  // Find the market by ID
  const market = markets.find(m => m.id === id) || markets[0];
  
  // Realtime trading chart data
  const [chartData, setChartData] = useState<{ time: string; price: number; volume: number }[]>([]);
  const [currentPrice, setCurrentPrice] = useState(65);
  const [priceChange, setPriceChange] = useState(0);

  // Initialize chart data
  useEffect(() => {
    const now = new Date();
    const initialData = Array.from({ length: 50 }, (_, i) => {
      const time = new Date(now.getTime() - (49 - i) * 60000);
      return {
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: 60 + Math.random() * 20,
        volume: Math.floor(Math.random() * 1000) + 100,
      };
    });
    setChartData(initialData);
    setCurrentPrice(initialData[initialData.length - 1].price);
  }, []);

  // Real-time price updates with Supabase Realtime subscription for votes
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const lastPrice = prev[prev.length - 1]?.price || 65;
        const change = (Math.random() - 0.48) * 3;
        const newPrice = Math.max(10, Math.min(95, lastPrice + change));
        const now = new Date();
        
        const newPoint = {
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: newPrice,
          volume: Math.floor(Math.random() * 1000) + 100,
        };
        
        setCurrentPrice(newPrice);
        setPriceChange(change);
        
        return [...prev.slice(1), newPoint];
      });
    }, 2000);

    // Subscribe to realtime vote updates
    const channel = supabase
      .channel('prediction-votes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_votes'
        },
        (payload) => {
          console.log('Vote update:', payload);
          // Trigger chart update on new votes
          setChartData(prev => {
            const lastPrice = prev[prev.length - 1]?.price || 65;
            const change = payload.eventType === 'INSERT' ? 
              (payload.new.vote === 'yes' ? 1.5 : -1.5) : 0;
            const newPrice = Math.max(10, Math.min(95, lastPrice + change));
            
            return [...prev.slice(1), {
              time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              price: newPrice,
              volume: Math.floor(Math.random() * 1000) + 500,
            }];
          });
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const handleSubmitPrediction = async () => {
    if (!userPrediction || !market) return;
    
    handleInteraction('make a prediction', async () => {
      try {
        const totalPoints = allocatedPoints * leverage;
        if (totalPoints > userPoints) {
          toast.error('Not enough points!');
          return;
        }
        await submitPrediction(market.id, userPrediction, Math.round(currentPrice), user?.id);
        setUserPoints(prev => prev - allocatedPoints);
        toast.success(`Prediction submitted! ${allocatedPoints} pts × ${leverage}x = ${totalPoints} pts at risk`);
      } catch (err) {
        toast.error('Failed to submit prediction');
      }
    });
  };

  const handleSongVote = (songId: string, vote: 'yes' | 'no', songLeverage: number, points: number) => {
    handleInteraction('vote on this song', () => {
      if (points > userPoints) {
        toast.error('Not enough points!');
        return;
      }
      setSongVotes(prev => ({ ...prev, [songId]: { vote, leverage: songLeverage, points } }));
      setUserPoints(prev => prev - points);
      toast.success(`Vote placed! ${points} pts × ${songLeverage}x leverage`);
    });
  };

  const playTrack = (previewUrl?: string, songId?: string) => {
    if (!previewUrl) {
      toast.error('No preview available');
      return;
    }
    
    if (audioRef.current) {
      if (playingSongId === songId && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setPlayingSongId(null);
      } else {
        audioRef.current.src = previewUrl;
        audioRef.current.play();
        setIsPlaying(true);
        setPlayingSongId(songId || null);
      }
    }
  };

  if (loading || !market) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/50">Loading...</div>
      </div>
    );
  }

  // Calculate chart min/max for visualization
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={() => { setIsPlaying(false); setPlayingSongId(null); }}
        onError={() => {
          setIsPlaying(false);
          setPlayingSongId(null);
          toast.error('Failed to play preview');
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-6">
          <button onClick={() => navigate('/music-alpha')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            {/* Points Display */}
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg">
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span className="text-[9px] text-purple-400 font-medium">{userPoints.toLocaleString()} pts</span>
            </div>
            
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

      <main className="pt-16 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Sidebar - Song Info */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <img src={market.artwork} alt={market.songTitle} className="w-14 h-14 rounded-xl object-cover" />
                    {market.previewUrl && (
                      <button
                        onClick={() => playTrack(market.previewUrl || undefined, market.id)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                      >
                        {playingSongId === market.id && isPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-sm sm:text-base font-bold text-white truncate">{market.songTitle}</h1>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                        market.status === 'surging' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 
                        market.status === 'underground' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50">{market.artist}</p>
                  </div>
                </div>

                {/* Streaming Platforms */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                  {market.deezerUrl && (
                    <a href={market.deezerUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEAA2D]/20 hover:bg-[#FEAA2D]/30 transition-colors">
                      <DeezerIcon />
                    </a>
                  )}
                  {market.audiusUrl && (
                    <a href={market.audiusUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#CC0FE0]/20 hover:bg-[#CC0FE0]/30 transition-colors">
                      <AudiusIcon />
                    </a>
                  )}
                  <a href="#" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 transition-colors">
                    <SpotifyIcon />
                  </a>
                </div>
                
                {/* Outcome Definition */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3 w-3 text-purple-400" />
                    <span className="text-[9px] text-white/50">Prediction outcome</span>
                  </div>
                  <p className="text-[9px] text-white/70 leading-relaxed">{market.outcome}</p>
                  <div className="flex items-center gap-2 mt-2 text-[8px] text-white/40">
                    <Clock className="h-3 w-3" />
                    <span>Closes: {market.horizon}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Monthly Listeners</span>
                    <span className="text-[9px] font-medium text-white">{market.listeners}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 24h</span>
                    <span className={`text-[9px] ${market.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Total Forecasts</span>
                    <span className="text-[9px] font-medium text-white">{market.totalForecasts.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 h-8 text-[9px] bg-purple-500 text-white hover:bg-purple-600"
                    onClick={() => handleInteraction('add to watchlist')}
                  >
                    <Star className="h-3 w-3 mr-1" /> Watch
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-[9px] border-white/10 text-white hover:bg-white/5"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                  >
                    <Share2 className="h-3 w-3 mr-1" /> Share
                  </Button>
                </div>
              </Card>
            </div>

            {/* Center - Trading Interface */}
            <div className="lg:col-span-6 space-y-4">
              {/* Realtime Trading Chart */}
              <Card className="bg-white/[0.02] border-white/5 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/50">Live Chart</span>
                    <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xl font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {currentPrice.toFixed(1)}%
                    </span>
                    <span className={`text-[10px] ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Trading Chart */}
                <div className="h-40 flex items-end gap-[2px] bg-black/20 rounded-lg p-2 relative overflow-hidden">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
                    {[90, 70, 50, 30, 10].map(level => (
                      <div key={level} className="flex items-center w-full">
                        <span className="text-[7px] text-white/20 w-6">{level}</span>
                        <div className="flex-1 border-t border-white/5" />
                      </div>
                    ))}
                  </div>
                  
                  {/* Candlestick-style bars */}
                  {chartData.map((point, i) => {
                    const prevPrice = chartData[i - 1]?.price || point.price;
                    const isUp = point.price >= prevPrice;
                    const height = ((point.price - minPrice) / priceRange) * 100;
                    
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-all duration-300 ${isUp ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ 
                          height: `${Math.max(5, height)}%`,
                          opacity: i > chartData.length - 10 ? 1 : 0.5 + (i / chartData.length) * 0.5
                        }}
                      />
                    );
                  })}
                </div>
                
                {/* Time labels */}
                <div className="flex justify-between mt-1 text-[7px] text-white/30">
                  <span>{chartData[0]?.time}</span>
                  <span>{chartData[Math.floor(chartData.length / 2)]?.time}</span>
                  <span>{chartData[chartData.length - 1]?.time}</span>
                </div>
              </Card>

              {/* Voting Interface - Futures Trading Style */}
              <Card className="bg-white/[0.02] border-white/5 p-4 sm:p-6">
                <p className="text-[10px] text-white/50 mb-2 text-center">{market.outcome}</p>
                
                {/* YES/NO Buttons */}
                <div className="flex gap-3 mb-4">
                  <Button
                    className={`flex-1 h-14 text-sm font-bold transition-all ${
                      userPrediction === 'will' 
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                    }`}
                    onClick={() => setUserPrediction('will')}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg">YES</span>
                      <span className="text-[9px] opacity-70">It WILL happen</span>
                    </div>
                  </Button>
                  <Button
                    className={`flex-1 h-14 text-sm font-bold transition-all ${
                      userPrediction === 'wont' 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' 
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    }`}
                    onClick={() => setUserPrediction('wont')}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-lg">NO</span>
                      <span className="text-[9px] opacity-70">It WON'T happen</span>
                    </div>
                  </Button>
                </div>

                {userPrediction && (
                  <div className="space-y-4">
                    {/* Leverage Selection */}
                    <div className="bg-white/[0.03] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-white/50">Leverage</span>
                        <span className="text-sm font-bold text-purple-400">{leverage}x</span>
                      </div>
                      <div className="flex gap-2">
                        {[2, 4, 6, 8, 10, 12].map(lev => (
                          <button
                            key={lev}
                            onClick={() => setLeverage(lev)}
                            className={`flex-1 py-2 rounded-lg text-[10px] font-medium transition-all ${
                              leverage === lev 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {lev}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Points Allocation */}
                    <div className="bg-white/[0.03] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] text-white/50">Points to allocate</span>
                        <span className="text-sm font-bold text-white">{allocatedPoints} pts</span>
                      </div>
                      <Slider
                        value={[allocatedPoints]}
                        onValueChange={(v) => setAllocatedPoints(v[0])}
                        max={Math.min(1000, userPoints)}
                        min={10}
                        step={10}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-1 text-[8px] text-white/30">
                        <span>10</span>
                        <span>{Math.min(1000, userPoints)}</span>
                      </div>
                    </div>

                    {/* Potential Returns */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-3 border border-purple-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/60">Risk</span>
                        <span className="text-[10px] font-medium text-white">{allocatedPoints} pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/60">Potential Return</span>
                        <span className="text-sm font-bold text-green-400">+{(allocatedPoints * leverage * 0.9).toFixed(0)} pts</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleSubmitPrediction}
                      className={`w-full h-12 font-bold text-sm ${
                        userPrediction === 'will' 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-red-500 hover:bg-red-600'
                      } text-white`}
                    >
                      Place {userPrediction === 'will' ? 'YES' : 'NO'} @ {leverage}x Leverage
                    </Button>
                  </div>
                )}
              </Card>
              
              {/* Accuracy Stats */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-3">Prediction Accuracy</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3 w-3 text-white/50" />
                      <span className="text-[9px] text-white/50">Fan Accuracy</span>
                    </div>
                    <p className="text-lg font-bold text-white">{market.fanAccuracy}%</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Brain className="h-3 w-3 text-purple-400" />
                      <span className="text-[9px] text-white/50">AI Accuracy</span>
                    </div>
                    <p className="text-lg font-bold text-purple-400">{market.aiAccuracy}%</p>
                  </div>
                </div>
              </Card>

              {/* 15 Real Songs with Voting */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-medium text-white">Vote on Songs (15 tracks + 3 AI picks)</h3>
                  <span className="text-[8px] text-purple-400">🤖 = AI Pick</span>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {realSongs.map((song) => (
                    <SongVoteCard
                      key={song.id}
                      song={song}
                      userVote={songVotes[song.id]}
                      onVote={(vote, lev, pts) => handleSongVote(song.id, vote, lev, pts)}
                      isPlaying={playingSongId === song.id && isPlaying}
                      onPlay={() => playTrack(song.spotifyUrl, song.id)}
                      userPoints={userPoints}
                    />
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Leaderboard */}
            <div className="lg:col-span-3 space-y-4">
              {/* Rank Winner Leaderboard */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <span className="text-[10px] font-medium text-white">Rank Winner Leaderboard</span>
                </div>
                <div className="space-y-2">
                  {topVoters.map((voter, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                      <span className={`text-[10px] w-5 font-bold ${
                        i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-white/40'
                      }`}>
                        #{i + 1}
                      </span>
                      <span className="text-lg">{voter.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-white truncate">{voter.name}</p>
                        <p className="text-[8px] text-white/40">{voter.score.toLocaleString()} pts</p>
                      </div>
                      <span className="text-[9px] font-medium text-[#4ade80]">{voter.winRate}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Related Markets */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-3">Related Markets</h3>
                <div className="space-y-2">
                  {markets.filter(m => m.id !== market.id).slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/music-alpha/${m.id}`)}
                      className="flex items-center gap-2 p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-lg cursor-pointer transition-colors"
                    >
                      <img src={m.artwork} alt="" className="w-8 h-8 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-white truncate">{m.songTitle}</p>
                        <p className="text-[8px] text-white/40 truncate">{m.artist}</p>
                      </div>
                      <span className={`text-[9px] font-medium ${m.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {Math.round(m.probability)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Song Vote Card Component
interface SongVoteCardProps {
  song: typeof realSongs[0];
  userVote?: { vote: 'yes' | 'no', leverage: number, points: number };
  onVote: (vote: 'yes' | 'no', leverage: number, points: number) => void;
  isPlaying: boolean;
  onPlay: () => void;
  userPoints: number;
}

const SongVoteCard = ({ song, userVote, onVote, isPlaying, onPlay, userPoints }: SongVoteCardProps) => {
  const [showVotePanel, setShowVotePanel] = useState(false);
  const [selectedVote, setSelectedVote] = useState<'yes' | 'no' | null>(null);
  const [leverage, setLeverage] = useState(2);
  const [points, setPoints] = useState(50);

  const handleSubmitVote = () => {
    if (!selectedVote) return;
    onVote(selectedVote, leverage, points);
    setShowVotePanel(false);
  };

  return (
    <div className={`bg-white/[0.02] rounded-lg p-2 border ${song.isAIPick ? 'border-purple-500/30' : 'border-white/5'}`}>
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10 flex-shrink-0">
          <img src={song.artwork} alt={song.title} className="w-full h-full rounded object-cover" />
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded"
          >
            {isPlaying ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white" />}
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[9px] font-medium text-white truncate">{song.title}</p>
            {song.isAIPick && <span className="text-[8px]">🤖</span>}
          </div>
          <p className="text-[8px] text-white/50 truncate">{song.artist}</p>
        </div>
        
        <div className="flex items-center gap-1">
          <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 flex items-center justify-center rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30">
            <SpotifyIcon />
          </a>
          <a href={song.deezerUrl} target="_blank" rel="noopener noreferrer" className="w-5 h-5 flex items-center justify-center rounded-full bg-[#FEAA2D]/20 hover:bg-[#FEAA2D]/30">
            <DeezerIcon />
          </a>
        </div>

        {userVote ? (
          <div className={`px-2 py-1 rounded text-[8px] font-medium ${userVote.vote === 'yes' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {userVote.vote.toUpperCase()} @ {userVote.leverage}x
          </div>
        ) : (
          <Button
            size="sm"
            onClick={() => setShowVotePanel(!showVotePanel)}
            className="h-6 px-2 text-[8px] bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
          >
            Vote
          </Button>
        )}
      </div>

      {/* Vote Panel */}
      {showVotePanel && !userVote && (
        <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedVote('yes')}
              className={`flex-1 py-1.5 rounded text-[9px] font-medium ${
                selectedVote === 'yes' ? 'bg-green-500 text-white' : 'bg-green-500/20 text-green-400'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSelectedVote('no')}
              className={`flex-1 py-1.5 rounded text-[9px] font-medium ${
                selectedVote === 'no' ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400'
              }`}
            >
              NO
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white/50">Leverage:</span>
            <div className="flex gap-1">
              {[2, 4, 6, 8, 10, 12].map(lev => (
                <button
                  key={lev}
                  onClick={() => setLeverage(lev)}
                  className={`px-1.5 py-0.5 rounded text-[8px] ${
                    leverage === lev ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white/50">Points:</span>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Math.min(userPoints, Math.max(10, parseInt(e.target.value) || 10)))}
              className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-[9px] text-white"
              min={10}
              max={userPoints}
            />
            <span className="text-[8px] text-white/40">/ {userPoints}</span>
          </div>
          
          <Button
            onClick={handleSubmitVote}
            disabled={!selectedVote || points > userPoints}
            className={`w-full h-7 text-[9px] ${
              selectedVote === 'yes' ? 'bg-green-500 hover:bg-green-600' :
              selectedVote === 'no' ? 'bg-red-500 hover:bg-red-600' :
              'bg-white/10 text-white/50'
            } text-white`}
          >
            Confirm Vote ({points} pts × {leverage}x)
          </Button>
        </div>
      )}
    </div>
  );
};

export default AlphaDetail;
