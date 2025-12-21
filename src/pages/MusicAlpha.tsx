import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  Zap, Users, Trophy, Brain, Clock, Target, Flame, Sparkles, Filter,
  Play, Pause, Volume2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAlphaPredictions, PredictionMarket } from '@/hooks/useAlphaPredictions';
import { supabase } from '@/integrations/supabase/client';

// Platform Icons
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#1DB954">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#FEAA2D">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM0 12.59v3.027h5.188v-3.028H0zm6.27 0v3.027h5.189v-3.028h-5.19zm6.27 0v3.027h5.19v-3.028h-5.19zm6.27 0v3.027H24v-3.028h-5.19zM0 16.81v3.029h5.188v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

const AudiusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#CC0FE0">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.656c-.164.238-.41.376-.688.376H6.794c-.278 0-.524-.138-.688-.376-.164-.238-.205-.537-.114-.815l2.55-6.967c.123-.336.447-.56.802-.56h5.312c.355 0 .679.224.802.56l2.55 6.967c.091.278.05.577-.114.815z"/>
  </svg>
);

const horizons = ['24h', '7D', '30D'];

interface UserPrediction {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  song_title: string | null;
  artist_name: string | null;
  song_artwork: string | null;
  yes_votes: number;
  no_votes: number;
  total_votes: number;
  created_at: string;
}

const MusicAlpha = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState('projects');
  
  const [horizon, setHorizon] = useState('7D');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllHotPredictions, setShowAllHotPredictions] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<PredictionMarket | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [showPredictionForm, setShowPredictionForm] = useState<string | null>(null);
  const [predictionConfidence, setPredictionConfidence] = useState(50);
  const [userPredictions, setUserPredictions] = useState<UserPrediction[]>([]);

  const { markets, aiModels, fanForecasters, stats, loading, error, submitPrediction } = useAlphaPredictions();

  // Fetch user predictions from database
  useEffect(() => {
    const fetchUserPredictions = async () => {
      const { data } = await supabase
        .from('user_predictions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setUserPredictions(data);
      }
    };
    fetchUserPredictions();
  }, []);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const toggleWatchlist = (id: string) => {
    handleInteraction('add to watchlist', () => {
      setWatchlist(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      toast.success(watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist');
    });
  };

  const handleSubmitPrediction = async (marketId: string, prediction: 'will' | 'wont') => {
    handleInteraction('make a prediction', async () => {
      try {
        const result = await submitPrediction(marketId, prediction, predictionConfidence, user?.id);
        setUserPoints(prev => prev + (result.prediction?.points || 0));
        toast.success(`Prediction submitted! +${result.prediction?.points || 10} points`);
        setShowPredictionForm(null);
      } catch (err) {
        toast.error('Failed to submit prediction');
      }
    });
  };

  const playTrack = (market: PredictionMarket, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (currentTrack?.id === market.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    
    if (!market.previewUrl) {
      toast.error('No preview available for this track');
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.src = market.previewUrl;
      audioRef.current.play();
      setCurrentTrack(market);
      setIsPlaying(true);
    }
  };

  // Filter markets - get different songs for high probability section
  const highProbabilitySongs = markets.filter(m => m.probability >= 60).slice(0, 12);
  const lowProbability = markets.filter(m => m.probability < 40).slice(0, 12);
  const filteredMarkets = horizon === '24h' 
    ? markets.filter(m => m.horizon === '24h')
    : horizon === '7D' 
    ? markets.filter(m => m.horizon === '7D' || m.horizon === '24h')
    : markets;

  // Hot predictions - 8 cards
  const hotPredictions = markets.slice(0, 8);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          toast.error('Failed to play preview');
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                placeholder="Search predictions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-40 bg-white/5 border-white/10 text-xs placeholder:text-white/40 rounded-lg"
              />
            </div>
            
            <Button
              size="sm"
              onClick={() => navigate('/music-alpha/create')}
              className="text-[9px] h-7 px-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create Prediction
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/music-alpha/head-to-head')}
              className="text-[9px] h-7 px-2 border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
            >
              <Users className="h-3 w-3 mr-1" />
              Head to Head
            </Button>
            
            {user && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-lg">
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="text-[9px] text-purple-400 font-medium">{userPoints} pts</span>
              </div>
            )}
            
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg font-medium">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg font-medium">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="border-t border-white/5 px-3 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] overflow-x-auto">
          <div className="flex items-center gap-1">
            <span className="text-white/50">Active markets:</span>
            <span className="font-semibold text-white">{stats?.activeMarkets || markets.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/50">Predictions:</span>
            <span className="font-semibold text-white">{stats?.totalPredictions ? `${(stats.totalPredictions / 1000).toFixed(1)}K` : '45.2K'}</span>
            <span className="text-purple-400">▲12%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/50">Avg accuracy:</span>
            <span className="font-semibold text-purple-400">{stats?.avgAccuracy || 74}%</span>
          </div>
          <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24 sm:pt-28 pb-6 px-3 sm:px-6">
        {/* Hot Predictions - Cookie.fun Market Events Style */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <h2 className="text-sm sm:text-base font-bold text-white">Hot Predictions</h2>
              <span className="text-[9px] text-green-400 animate-pulse">● LIVE</span>
            </div>
            <button 
              onClick={() => setShowAllHotPredictions(!showAllHotPredictions)}
              className="text-[9px] sm:text-[10px] text-white/50 hover:text-white flex items-center gap-1"
            >
              {showAllHotPredictions ? 'Show less' : 'View all'} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          {/* Big Cards Grid - Market Events Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {hotPredictions.map((market, i) => (
              <Card
                key={market.id}
                onClick={() => navigate(`/music-alpha/${market.id}`)}
                className="relative overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-white/[0.12] hover:to-white/[0.05] border-white/10 cursor-pointer transition-all group"
              >
                {/* Background Image with Gradient Overlay */}
                <div className="absolute inset-0">
                  <img 
                    src={market.artwork} 
                    alt="" 
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>
                
                {/* Content */}
                <div className="relative z-10 p-4 h-[180px] flex flex-col justify-between">
                  {/* Top - Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${
                      market.status === 'surging' ? 'bg-green-500/30 text-green-400' : 
                      market.status === 'underground' ? 'bg-purple-500/30 text-purple-400' : 
                      market.status === 'cooling' ? 'bg-red-500/30 text-red-400' :
                      'bg-yellow-500/30 text-yellow-400'
                    }`}>
                      {market.status.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-bold ${market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Middle - Song Info */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white line-clamp-2">{market.songTitle}</h3>
                    <p className="text-[10px] text-white/60">{market.artist}</p>
                    <p className="text-[9px] text-white/40 line-clamp-1">{market.outcome}</p>
                  </div>
                  
                  {/* Bottom - Probability Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="text-white/50">{(market.totalForecasts / 1000).toFixed(1)}k votes</span>
                      <span className={`font-bold text-base ${market.probability >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.round(market.probability)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${market.probability >= 50 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                        style={{ width: `${market.probability}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Play Button */}
                  {market.previewUrl && (
                    <button
                      onClick={(e) => playTrack(market, e)}
                      className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {currentTrack?.id === market.id && isPlaying ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white ml-0.5" />
                      )}
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Prediction Markets - 10 active */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <h3 className="text-[10px] sm:text-xs font-medium text-white">Prediction Markets</h3>
            </div>
            <span className="text-[8px] text-white/40">{filteredMarkets.length} active markets</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {filteredMarkets.slice(0, 10).map((market) => (
              <Card
                key={market.id}
                onClick={() => navigate(`/music-alpha/${market.id}`)}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="relative">
                    <img src={market.artwork} alt={market.songTitle} className="w-10 h-10 rounded-lg object-cover" />
                    {market.previewUrl && (
                      <button
                        onClick={(e) => playTrack(market, e)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        {currentTrack?.id === market.id && isPlaying ? (
                          <Pause className="h-3 w-3 text-white" />
                        ) : (
                          <Play className="h-3 w-3 text-white" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[9px] font-medium text-white truncate">{market.songTitle}</h4>
                    <p className="text-[8px] text-white/50 truncate">{market.artist}</p>
                  </div>
                </div>
                
                <p className="text-[8px] text-white/60 line-clamp-2 mb-2">{market.outcome}</p>
                
                {/* Vote Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[8px]">
                    <span className="text-green-400">Yes {Math.round(market.fanProbability)}%</span>
                    <span className="text-red-400">No {Math.round(100 - market.fanProbability)}%</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${market.fanProbability}%` }}
                    />
                    <div 
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${100 - market.fanProbability}%` }}
                    />
                  </div>
                  <p className="text-[7px] text-white/40 text-center">{(market.totalForecasts / 1000).toFixed(1)}k votes</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Probability Treemaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* High Probability - Different Songs */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[10px] sm:text-xs font-medium text-white">High Probability Songs</span>
                <span className="text-[7px] text-[#4ade80] animate-pulse">● realtime</span>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {highProbabilitySongs.map((market, i) => (
                <div
                  key={market.id}
                  onClick={() => navigate(`/music-alpha/${market.id}`)}
                  className={`bg-[#4ade80]/20 hover:bg-[#4ade80]/30 rounded-lg p-2 cursor-pointer transition-all relative overflow-hidden ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '80px' : '40px' }}
                >
                  {i < 4 && (
                    <img 
                      src={market.artwork} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10">
                    <p className="text-[8px] sm:text-[9px] font-semibold text-white truncate">{market.songTitle.slice(0, 12)}</p>
                    <p className="text-[7px] sm:text-[8px] text-[#4ade80] font-bold">{Math.round(market.probability)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Probability */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-[10px] sm:text-xs font-medium text-white">Low Probability Songs</span>
                <span className="text-[7px] text-red-400 animate-pulse">● realtime</span>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {lowProbability.map((market, i) => (
                <div
                  key={market.id}
                  onClick={() => navigate(`/music-alpha/${market.id}`)}
                  className={`bg-red-500/20 hover:bg-red-500/30 rounded-lg p-2 cursor-pointer transition-all relative overflow-hidden ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '80px' : '40px' }}
                >
                  {i < 4 && (
                    <img 
                      src={market.artwork} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10">
                    <p className="text-[8px] sm:text-[9px] font-semibold text-white truncate">{market.songTitle.slice(0, 12)}</p>
                    <p className="text-[7px] sm:text-[8px] text-red-400 font-bold">{Math.round(market.probability)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboards - Top Song Predictions instead of AI Models */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fan Leaderboard */}
            <Card className="bg-white/[0.02] border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h3 className="text-[10px] sm:text-xs font-medium text-white">Fan Forecasters</h3>
                <span className="text-[8px] text-white/40 ml-auto">Live rankings</span>
              </div>
              <div className="space-y-2">
                {fanForecasters.map((fan, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors">
                    <span className={`text-[9px] w-4 font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-white/40'}`}>
                      {i + 1}
                    </span>
                    <span className="text-lg">{fan.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-white">{fan.name}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-[8px] text-white/40">{fan.predictions} predictions</p>
                        <span className="text-[7px] text-purple-400">• {fan.xp} XP</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-[#4ade80]">{fan.winRate}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Song Predictions */}
            <Card className="bg-white/[0.02] border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-purple-400" />
                <h3 className="text-[10px] sm:text-xs font-medium text-white">Top Song Predictions</h3>
                <span className="text-[8px] text-white/40 ml-auto">By vote %</span>
              </div>
              <div className="space-y-2">
                {markets.slice(0, 5).map((market, i) => (
                  <div 
                    key={market.id} 
                    onClick={() => navigate(`/music-alpha/${market.id}`)}
                    className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <span className={`text-[9px] w-4 font-bold ${i === 0 ? 'text-purple-400' : 'text-white/40'}`}>
                      {i + 1}
                    </span>
                    <img src={market.artwork} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-white truncate">{market.songTitle}</p>
                      <p className="text-[8px] text-white/40 truncate">{market.outcome}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold ${market.probability >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {Math.round(market.probability)}%
                      </span>
                      <p className="text-[7px] text-white/30">{(market.totalForecasts / 1000).toFixed(1)}k votes</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/10 px-4 py-2 flex items-center gap-3">
          <img src={currentTrack.artwork} alt="" className="w-10 h-10 rounded" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{currentTrack.songTitle}</p>
            <p className="text-[10px] text-white/50">{currentTrack.artist}</p>
          </div>
          <button
            onClick={(e) => playTrack(currentTrack, e)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {isPlaying ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default MusicAlpha;
