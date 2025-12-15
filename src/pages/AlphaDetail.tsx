import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play,
  Users, Brain, Zap, Clock, Target, Check, X, Trophy, ChevronLeft, ChevronRight, Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock data
const mockMarkets = [
  {
    id: 1, songTitle: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', status: 'surging' as const,
    outcome: 'Will enter Top 50 Spotify Global this week?',
    outcomeDefinition: 'Hit if it reaches Top 50 Spotify Global by Sunday 23:59 UTC',
    probability: 67, fanProbability: 72, aiProbability: 63,
    totalForecasts: 12540, fanAccuracy: 71, aiAccuracy: 78,
    horizon: 'This Week', isWatchlisted: false, change24h: 15.2,
    listeners: '2.4M',
    description: 'Major playlist addition driving massive streams. Strong momentum across all platforms.',
    historyData: [45, 52, 58, 55, 61, 64, 67],
    twitterHandle: '@novaecho',
    latestBuzz: 'Major playlist addition driving massive streams, TikTok trend gaining momentum',
    reach24h: '113.78K', volume24h: '$3.63M',
    change7D: -8.48, change30D: -15.08,
  },
  {
    id: 2, songTitle: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', status: 'surging' as const,
    outcome: 'Will double TikTok uses in 7 days?',
    outcomeDefinition: 'Hit if TikTok sound uses reach 2x current count by end of week',
    probability: 82, fanProbability: 85, aiProbability: 79,
    totalForecasts: 8932, fanAccuracy: 68, aiAccuracy: 81,
    horizon: 'This Week', isWatchlisted: true, change24h: 12.8,
    listeners: '1.8M',
    description: 'Viral TikTok trend with multiple dance challenges. Momentum accelerating.',
    historyData: [60, 65, 70, 75, 78, 80, 82],
    twitterHandle: '@synthwavekid',
    latestBuzz: 'Viral TikTok trend challenging streaming records',
    reach24h: '98.5K', volume24h: '$2.89M',
    change7D: 5.67, change30D: 22.34,
  },
];

const topVoices = Array.from({ length: 50 }, (_, i) => ({
  name: ['ChartMaster99', 'BeatProphet', 'TrendHunter', 'ViralQueen', 'MusicOracle', 'HitMaker'][i % 6] + (i > 5 ? ` ${i}` : ''),
  avatar: ['🎯', '🔮', '🎵', '👑', '🎸', '🎹'][i % 6],
  score: 78 - (i * 0.5),
  predictions: 234 - (i * 3),
}));

const forecastHistory = [
  { outcome: 'Top 100 Spotify', prediction: 'YES', result: 'won', probability: 78, date: '3 days ago' },
  { outcome: 'TikTok viral', prediction: 'YES', result: 'won', probability: 65, date: '1 week ago' },
  { outcome: '#1 in Nigeria', prediction: 'NO', result: 'lost', probability: 34, date: '2 weeks ago' },
];

const AlphaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('forecast');
  const [userPrediction, setUserPrediction] = useState<'will' | 'wont' | null>(null);
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium');
  const [showAllVoices, setShowAllVoices] = useState(false);
  
  const market = mockMarkets.find(m => m.id === Number(id)) || mockMarkets[0];

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const submitPrediction = () => {
    handleInteraction('make a prediction', () => {
      toast.success(`Prediction submitted: ${userPrediction === 'will' ? 'YES' : 'NO'} with ${confidence} confidence`);
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
                  <img src={market.artwork} alt={market.songTitle} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-sm sm:text-base font-bold text-white truncate">{market.songTitle}</h1>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${
                        market.status === 'surging' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/50">{market.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-white/40">{market.twitterHandle}</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/60 mb-4">{market.description}</p>

                {/* Streaming Platforms */}
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                  <a href="#" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 transition-colors">
                    <Music className="h-4 w-4 text-[#1DB954]" />
                  </a>
                  <a href="#" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FA243C]/20 hover:bg-[#FA243C]/30 transition-colors">
                    <Music className="h-4 w-4 text-[#FA243C]" />
                  </a>
                  <a href="#" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF0000]/20 hover:bg-[#FF0000]/30 transition-colors">
                    <Play className="h-4 w-4 text-[#FF0000]" />
                  </a>
                </div>
                
                {/* Outcome Definition */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-3 w-3 text-purple-400" />
                    <span className="text-[9px] text-white/50">Outcome definition</span>
                  </div>
                  <p className="text-[9px] text-white/70 leading-relaxed">{market.outcomeDefinition}</p>
                  <div className="flex items-center gap-2 mt-2 text-[8px] text-white/40">
                    <Clock className="h-3 w-3" />
                    <span>Closes: {market.horizon}</span>
                  </div>
                </div>

                {/* Latest Buzz */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-[9px] text-white/50">Latest buzz</span>
                  </div>
                  <p className="text-[9px] text-white/70">{market.latestBuzz}</p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Listeners</span>
                    <span className="text-[9px] font-medium text-white">{market.listeners}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 24h</span>
                    <span className={`text-[9px] ${market.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 7D</span>
                    <span className={`text-[9px] ${market.change7D >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {market.change7D >= 0 ? '+' : ''}{market.change7D}%
                    </span>
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
                    {market.probability}%
                  </div>
                </div>
                <p className="text-[9px] text-white/40 text-center mb-4">Future Hit Probability</p>
                
                {/* Fan vs AI */}
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/50" />
                    <span className="text-[10px] text-white/70">Fan: {market.fanProbability}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="text-[10px] text-purple-400">AI: {market.aiProbability}%</span>
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
                        <p className="text-[9px] text-white/50">Confidence level</p>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => setConfidence(level)}
                              className={`flex-1 py-2 rounded-lg text-[9px] font-medium capitalize transition-all ${
                                confidence === level 
                                  ? 'bg-purple-500 text-white' 
                                  : 'bg-white/5 text-white/50 hover:bg-white/10'
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full h-9 bg-purple-500 hover:bg-purple-600 text-white text-[10px]"
                        onClick={submitPrediction}
                      >
                        Submit Prediction
                      </Button>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/5">
                  <div className="text-center">
                    <p className="text-base font-bold text-white">{(market.totalForecasts / 1000).toFixed(1)}k</p>
                    <p className="text-[8px] text-white/40">Total forecasts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-[#4ade80]">{market.fanAccuracy}%</p>
                    <p className="text-[8px] text-white/40">Fan accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-purple-400">{market.aiAccuracy}%</p>
                    <p className="text-[8px] text-white/40">AI accuracy</p>
                  </div>
                </div>
              </Card>

              {/* Charts */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-4">Probability over time</h3>
                <div className="h-40 bg-white/[0.02] rounded-xl flex items-end justify-around p-4">
                  {market.historyData.map((value, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div 
                        className="w-5 sm:w-6 bg-gradient-to-t from-purple-500/50 to-purple-500 rounded-t transition-all"
                        style={{ height: `${value}%` }}
                      />
                      <span className="text-[7px] text-white/30">{i + 1}d</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[9px] text-white/40 mb-1">24h reach</p>
                  <p className="text-sm font-bold text-white">{market.reach24h}</p>
                  <p className="text-[8px] text-purple-400">▲ realtime</p>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[9px] text-white/40 mb-1">24h Volume</p>
                  <p className="text-sm font-bold text-white">{market.volume24h}</p>
                  <p className="text-[8px] text-purple-400">▲ realtime</p>
                </Card>
              </div>
            </div>

            {/* Right Sidebar - Top Voices */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <h3 className="text-[10px] font-medium text-white">Top Voices</h3>
                  </div>
                  <button 
                    onClick={() => setShowAllVoices(!showAllVoices)}
                    className="text-[8px] text-white/50 hover:text-white flex items-center gap-1"
                  >
                    {showAllVoices ? 'Show less' : 'View all 50'} <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {(showAllVoices ? topVoices : topVoices.slice(0, 8)).map((voice, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                      <span className="text-[8px] text-white/40 w-4">{i + 1}</span>
                      <span className="text-base">{voice.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-white truncate">{voice.name}</p>
                        <p className="text-[7px] text-white/40">{voice.predictions} predictions</p>
                      </div>
                      <span className="text-[9px] font-bold text-[#4ade80]">{voice.score.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Forecast History */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-3">Forecast History</h3>
                <div className="space-y-2">
                  {forecastHistory.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        item.result === 'won' ? 'bg-[#4ade80]/20' : 'bg-red-500/20'
                      }`}>
                        {item.result === 'won' ? (
                          <Check className="h-3 w-3 text-[#4ade80]" />
                        ) : (
                          <X className="h-3 w-3 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-medium text-white">{item.outcome}</p>
                        <p className="text-[7px] text-white/40">{item.prediction} at {item.probability}%</p>
                      </div>
                      <span className="text-[7px] text-white/30">{item.date}</span>
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
