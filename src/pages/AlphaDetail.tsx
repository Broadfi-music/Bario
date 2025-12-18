import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play, Pause,
  Users, Brain, Zap, Clock, Target, Check, X, Trophy, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAlphaPredictions, PredictionMarket } from '@/hooks/useAlphaPredictions';

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

const topVoices = Array.from({ length: 50 }, (_, i) => ({
  name: ['ChartMaster99', 'BeatProphet', 'TrendHunter', 'ViralQueen', 'MusicOracle', 'HitMaker'][i % 6] + (i > 5 ? ` ${i}` : ''),
  avatar: ['🎯', '🔮', '🎵', '👑', '🎸', '🎹'][i % 6],
  score: 78 - (i * 0.5),
  predictions: 234 - (i * 3),
}));

const AlphaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState('forecast');
  const [userPrediction, setUserPrediction] = useState<'will' | 'wont' | null>(null);
  const [confidence, setConfidence] = useState<number>(50);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { markets, submitPrediction, loading } = useAlphaPredictions();
  
  // Find the market by ID
  const market = markets.find(m => m.id === id) || markets[0];
  const [chartData, setChartData] = useState<number[]>([45, 52, 58, 55, 61, 64, 67]);

  // Real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setChartData(prev => {
        const newData = [...prev.slice(1), Math.max(10, Math.min(90, prev[prev.length - 1] + (Math.random() - 0.5) * 8))];
        return newData;
      });
    }, 2500);
    return () => clearInterval(interval);
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
        await submitPrediction(market.id, userPrediction, confidence, user?.id);
        toast.success(`Prediction submitted: ${userPrediction === 'will' ? 'YES' : 'NO'} with ${confidence}% confidence`);
      } catch (err) {
        toast.error('Failed to submit prediction');
      }
    });
  };

  const playTrack = () => {
    if (!market?.previewUrl) {
      toast.error('No preview available for this track');
      return;
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = market.previewUrl;
        audioRef.current.play();
        setIsPlaying(true);
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
          <button onClick={() => navigate('/music-alpha')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
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
                        onClick={playTrack}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-xl"
                      >
                        {isPlaying ? (
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

            {/* Center - Prediction */}
            <div className="lg:col-span-6 space-y-4">
              {/* Main Probability Display */}
              <Card className="bg-white/[0.02] border-white/5 p-4 sm:p-6">
                <p className="text-[10px] text-white/50 mb-2 text-center">{market.outcome}</p>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className={`text-4xl sm:text-5xl font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {Math.round(market.probability)}%
                  </div>
                </div>
                <p className="text-[9px] text-white/40 text-center mb-4">Future Hit Probability</p>
                
                {/* Fan vs AI */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/50" />
                    <span className="text-[10px] text-white/70">Fan: {Math.round(market.fanProbability)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="text-[10px] text-purple-400">AI: {Math.round(market.aiProbability)}%</span>
                  </div>
                </div>

                {/* Prediction Actions */}
                <div className="space-y-4">
                  <p className="text-[9px] text-white/50 text-center">Make your prediction</p>
                  <div className="flex gap-3">
                    <Button
                      className={`flex-1 h-10 text-[10px] font-medium transition-all ${
                        userPrediction === 'will' 
                          ? 'bg-[#4ade80] text-black' 
                          : 'bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30'
                      }`}
                      onClick={() => setUserPrediction('will')}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      It WILL happen
                    </Button>
                    <Button
                      className={`flex-1 h-10 text-[10px] font-medium transition-all ${
                        userPrediction === 'wont' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                      onClick={() => setUserPrediction('wont')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      It WON'T happen
                    </Button>
                  </div>

                  {userPrediction && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-white/50">Confidence level</p>
                          <span className="text-[9px] text-purple-400 font-medium">{confidence}%</span>
                        </div>
                        <Slider
                          value={[confidence]}
                          onValueChange={(v) => setConfidence(v[0])}
                          max={100}
                          min={10}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <Button
                        onClick={handleSubmitPrediction}
                        className="w-full h-10 bg-purple-500 text-white hover:bg-purple-600 text-[10px]"
                      >
                        Submit Prediction
                      </Button>
                    </>
                  )}
                </div>

                {/* Probability Chart (Simple) */}
                <div className="mt-6 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-white/50">Probability trend (7 days)</span>
                    <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
                  </div>
                  <div className="h-16 flex items-end gap-1">
                    {chartData.map((value, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-purple-500/30 rounded-t transition-all duration-500"
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>
                </div>
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
            </div>

            {/* Right Sidebar - Leaderboard */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-[10px] font-medium text-white">Top Voices</span>
                  </div>
                  <button 
                    onClick={() => setShowAllVoices(!showAllVoices)}
                    className="text-[8px] text-white/50 hover:text-white"
                  >
                    {showAllVoices ? 'Show less' : 'View all'}
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(showAllVoices ? topVoices : topVoices.slice(0, 5)).map((voice, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                      <span className="text-[9px] text-white/40 w-4">{i + 1}</span>
                      <span className="text-sm">{voice.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-white truncate">{voice.name}</p>
                        <p className="text-[8px] text-white/40">{voice.predictions} predictions</p>
                      </div>
                      <span className="text-[9px] font-medium text-[#4ade80]">{voice.score}%</span>
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

export default AlphaDetail;
