import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  Zap, Users, Trophy, Brain, Clock, Target, Flame, Sparkles, Filter,
  Play, Pause, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAlphaPredictions, PredictionMarket } from '@/hooks/useAlphaPredictions';

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

  const { markets, aiModels, fanForecasters, stats, loading, error, submitPrediction } = useAlphaPredictions();

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

  // Filter markets
  const highProbability = markets.filter(m => m.probability >= 50).slice(0, 12);
  const lowProbability = markets.filter(m => m.probability < 50).slice(0, 12);
  const filteredMarkets = horizon === '24h' 
    ? markets.filter(m => m.horizon === '24h')
    : horizon === '7D' 
    ? markets.filter(m => m.horizon === '7D' || m.horizon === '24h')
    : markets;

  // Generate market events from top markets
  const marketEvents = markets.slice(0, 4).map((market, i) => ({
    id: i + 1,
    market,
    event: i === 0 ? 'AI Model predicts surge after viral TikTok detection' :
           i === 1 ? 'Fan consensus rising rapidly - streaming velocity up' :
           i === 2 ? 'Underground Scout AI detects breakout potential' :
           'Cross-platform momentum building',
    change: market.change24h / 100,
    time: `${Math.floor(Math.random() * 60) + 5} min ago`
  }));

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
        {/* Hot Predictions */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] sm:text-sm font-semibold text-white">🔥 Hot Predictions</h2>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full">
                <span className="text-[9px] text-purple-400">AI + Crowd signals</span>
              </div>
            </div>
            <button 
              onClick={() => setShowAllHotPredictions(!showAllHotPredictions)}
              className="text-[9px] sm:text-[10px] text-white/50 hover:text-white flex items-center gap-1"
            >
              {showAllHotPredictions ? 'Show less' : 'View all'} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 ${!showAllHotPredictions ? 'max-h-[200px] overflow-hidden' : ''}`}>
            {(showAllHotPredictions ? markets : markets.slice(0, 6)).map((market) => (
              <div
                key={market.id}
                onClick={() => navigate(`/music-alpha/${market.id}`)}
                className="flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all group"
              >
                <div className="relative">
                  <img src={market.artwork} alt={market.songTitle} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                  {market.previewUrl && (
                    <button
                      onClick={(e) => playTrack(market, e)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      {currentTrack?.id === market.id && isPlaying ? (
                        <Pause className="h-4 w-4 text-white" />
                      ) : (
                        <Play className="h-4 w-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{market.songTitle}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{market.outcome}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {market.source === 'deezer' && <DeezerIcon />}
                    {market.source === 'audius' && <AudiusIcon />}
                    <span className="text-[7px] text-white/30">{market.listeners} listeners</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] sm:text-xs font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {Math.round(market.probability)}%
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-white/40">probability</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Prediction Signals */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">⚡ Prediction Signals</h3>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {horizons.map(t => (
                <button
                  key={t}
                  onClick={() => setHorizon(t)}
                  className={`text-[8px] sm:text-[9px] px-2 py-1 rounded-md transition-colors ${
                    horizon === t ? 'bg-purple-500 text-white font-medium' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {marketEvents.map((event) => (
              <Card
                key={event.id}
                onClick={() => navigate(`/music-alpha/${event.market.id}`)}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <div className="relative">
                    <img src={event.market.artwork} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    {event.market.previewUrl && (
                      <button
                        onClick={(e) => playTrack(event.market, e)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        <Play className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-medium text-white truncate">{event.market.songTitle}</span>
                      <span className={`text-[8px] font-medium ${event.change >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                        {event.change >= 0 ? '+' : ''}{(event.change * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40">{Math.round(event.market.probability)}% probability</p>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-white/70 line-clamp-2 mb-2">{event.event}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span className="text-[8px] text-purple-400">AI Signal</span>
                  </div>
                  <span className="text-[8px] text-white/30">{event.time}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Probability Treemaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* High Probability */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[10px] sm:text-xs font-medium text-white">High probability</span>
                <span className="text-[7px] text-[#4ade80] animate-pulse">● realtime</span>
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {highProbability.map((market, i) => (
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
                <span className="text-[10px] sm:text-xs font-medium text-white">Low probability</span>
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

        {/* Prediction Markets */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">🎯 Prediction Markets</h3>
            <span className="text-[8px] text-white/40">{filteredMarkets.length} active markets</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMarkets.slice(0, 9).map((market) => (
              <Card
                key={market.id}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="relative group">
                    <img src={market.artwork} alt={market.songTitle} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover" />
                    {market.previewUrl && (
                      <button
                        onClick={(e) => playTrack(market, e)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        {currentTrack?.id === market.id && isPlaying ? (
                          <Pause className="h-5 w-5 text-white" />
                        ) : (
                          <Play className="h-5 w-5 text-white" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] sm:text-xs font-medium text-white truncate">{market.songTitle}</h4>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${
                        market.status === 'surging' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 
                        market.status === 'underground' ? 'bg-purple-500/20 text-purple-400' : 
                        market.status === 'cooling' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/50">{market.artist}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {market.source === 'deezer' && <DeezerIcon />}
                      {market.source === 'audius' && <AudiusIcon />}
                      <span className="text-[7px] text-white/30">{market.listeners}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-white/70 mb-3">{market.outcome}</p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-white/40" />
                    <span className="text-[8px] text-white/50">Fans: {Math.round(market.fanProbability)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span className="text-[8px] text-purple-400">AI: {Math.round(market.aiProbability)}%</span>
                  </div>
                  <span className={`text-[11px] font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {Math.round(market.probability)}%
                  </span>
                </div>

                {/* Prediction Form */}
                {showPredictionForm === market.id ? (
                  <div className="space-y-2 p-2 bg-white/5 rounded-lg">
                    <p className="text-[8px] text-white/60">Your confidence: {predictionConfidence}%</p>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={predictionConfidence}
                      onChange={(e) => setPredictionConfidence(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleSubmitPrediction(market.id, 'will')}
                        className="flex-1 h-6 text-[8px] bg-[#4ade80] hover:bg-[#4ade80]/80 text-black"
                      >
                        YES (+{Math.floor(predictionConfidence / 10)} pts)
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSubmitPrediction(market.id, 'wont')}
                        className="flex-1 h-6 text-[8px] bg-red-500 hover:bg-red-500/80 text-white"
                      >
                        NO (+{Math.floor(predictionConfidence / 10)} pts)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-white/40">{(market.totalForecasts / 1000).toFixed(1)}k forecasts</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-white/40">{market.horizon}</span>
                      <Button 
                        size="sm"
                        onClick={() => setShowPredictionForm(market.id)}
                        className="h-5 text-[8px] px-2 bg-purple-500 hover:bg-purple-500/80"
                      >
                        Predict
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Leaderboard */}
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

            {/* AI Leaderboard */}
            <Card className="bg-white/[0.02] border-white/5 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4 text-purple-400" />
                <h3 className="text-[10px] sm:text-xs font-medium text-white">AI Models</h3>
                <span className="text-[8px] text-white/40 ml-auto">Powered by Lovable AI</span>
              </div>
              <div className="space-y-2">
                {aiModels.map((ai, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg hover:bg-white/[0.04] transition-colors">
                    <span className={`text-[9px] w-4 font-bold ${i === 0 ? 'text-purple-400' : 'text-white/40'}`}>
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-sm">
                      {ai.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-white">{ai.name}</p>
                      <p className="text-[8px] text-white/40">{ai.specialty}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-purple-400">{ai.accuracy}%</span>
                      <p className="text-[7px] text-white/30">{ai.predictions} calls</p>
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
