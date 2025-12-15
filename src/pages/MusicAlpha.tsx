import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ChevronRight, ChevronLeft,
  Zap, Users, Trophy, Brain, Clock, Target, Flame, Sparkles, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
interface PredictionMarket {
  id: number;
  songTitle: string;
  artist: string;
  artwork: string;
  status: 'surging' | 'stable' | 'underground';
  outcome: string;
  probability: number;
  fanProbability: number;
  aiProbability: number;
  totalForecasts: number;
  fanAccuracy: number;
  aiAccuracy: number;
  horizon: string;
  isWatchlisted: boolean;
  change24h: number;
  listeners: string;
  marketCap: string;
}

interface MarketEvent {
  id: number;
  market: PredictionMarket;
  event: string;
  change: number;
  time: string;
}

// Mock data
const mockMarkets: PredictionMarket[] = [
  {
    id: 1, songTitle: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', status: 'surging',
    outcome: 'Top 50 Spotify Global this week?',
    probability: 67, fanProbability: 72, aiProbability: 63,
    totalForecasts: 12540, fanAccuracy: 71, aiAccuracy: 78,
    horizon: 'This Week', isWatchlisted: false, change24h: 15.2,
    listeners: '2.4M', marketCap: '41.7M'
  },
  {
    id: 2, songTitle: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', status: 'surging',
    outcome: 'Double TikTok uses in 7 days?',
    probability: 82, fanProbability: 85, aiProbability: 79,
    totalForecasts: 8932, fanAccuracy: 68, aiAccuracy: 81,
    horizon: 'This Week', isWatchlisted: true, change24h: 12.8,
    listeners: '1.8M', marketCap: '35.2M'
  },
  {
    id: 3, songTitle: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', status: 'stable',
    outcome: '#1 US Country Radio in 30 days?',
    probability: 34, fanProbability: 42, aiProbability: 28,
    totalForecasts: 5678, fanAccuracy: 65, aiAccuracy: 74,
    horizon: '30 Days', isWatchlisted: false, change24h: -3.4,
    listeners: '1.5M', marketCap: '28.9M'
  },
  {
    id: 4, songTitle: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', status: 'underground',
    outcome: 'Break Top 10 UK charts?',
    probability: 23, fanProbability: 31, aiProbability: 18,
    totalForecasts: 3421, fanAccuracy: 58, aiAccuracy: 72,
    horizon: '30 Days', isWatchlisted: true, change24h: 28.5,
    listeners: '980K', marketCap: '18.4M'
  },
  {
    id: 5, songTitle: 'K-Pop Fire', artist: 'Seoul Stars',
    artwork: '/src/assets/track-3.jpeg', status: 'surging',
    outcome: '#1 YouTube Music globally?',
    probability: 56, fanProbability: 68, aiProbability: 48,
    totalForecasts: 18234, fanAccuracy: 73, aiAccuracy: 76,
    horizon: '24h', isWatchlisted: false, change24h: 18.3,
    listeners: '1.1M', marketCap: '24.5M'
  },
  {
    id: 6, songTitle: 'Summer Feels', artist: 'Beach House',
    artwork: '/src/assets/track-1.jpeg', status: 'stable',
    outcome: 'Top 20 Billboard Hot 100?',
    probability: 45, fanProbability: 52, aiProbability: 41,
    totalForecasts: 7890, fanAccuracy: 69, aiAccuracy: 75,
    horizon: 'This Week', isWatchlisted: false, change24h: 4.2,
    listeners: '890K', marketCap: '15.7M'
  },
];

const marketEvents: MarketEvent[] = [
  { id: 1, market: mockMarkets[0], event: 'AI Model predicts 78% chart probability after playlist add', change: 0.05, time: '12 min ago' },
  { id: 2, market: mockMarkets[1], event: 'Fan consensus rising rapidly - TikTok viral prediction', change: 0.08, time: '25 min ago' },
  { id: 3, market: mockMarkets[4], event: 'K-Pop Fire momentum detected by Underground Scout AI', change: 0.12, time: '1 hr ago' },
  { id: 4, market: mockMarkets[3], event: 'Afrobeats crossover probability increasing', change: 0.03, time: '2 hrs ago' },
];

const mockLeaderboard = {
  fans: [
    { name: 'ChartMaster99', avatar: '🎯', winRate: 78, predictions: 234, tags: ['K-Pop', 'Viral'], xp: 4520 },
    { name: 'BeatProphet', avatar: '🔮', winRate: 75, predictions: 189, tags: ['Hip-Hop'], xp: 3890 },
    { name: 'TrendHunter', avatar: '🎵', winRate: 72, predictions: 156, tags: ['Afrobeats'], xp: 3210 },
    { name: 'ViralQueen', avatar: '👑', winRate: 70, predictions: 201, tags: ['Pop'], xp: 2980 },
  ],
  ais: [
    { name: 'Momentum AI', accuracy: 84, specialty: 'TikTok velocity', predictions: 1250 },
    { name: 'Underground Scout', accuracy: 79, specialty: 'Artist breakouts', predictions: 890 },
    { name: 'Radio Oracle AI', accuracy: 77, specialty: 'Radio adds', predictions: 720 },
    { name: 'Chart Prophet', accuracy: 75, specialty: 'Billboard predictions', predictions: 1100 },
  ],
};

const horizons = ['24h', '7D', '30D'];

const MusicAlpha = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [horizon, setHorizon] = useState('7D');
  const [watchlist, setWatchlist] = useState<number[]>([2, 4]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllHotPredictions, setShowAllHotPredictions] = useState(false);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const toggleWatchlist = (id: number) => {
    handleInteraction('add to watchlist', () => {
      setWatchlist(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    });
  };

  const submitPrediction = (marketId: number, prediction: 'will' | 'wont') => {
    handleInteraction('make a prediction', () => {
      toast.success(`Prediction submitted: ${prediction === 'will' ? 'YES' : 'NO'}`);
    });
  };

  // Sentiment data - realtime
  const highProbability = mockMarkets.filter(m => m.probability >= 50).slice(0, 12);
  const lowProbability = mockMarkets.filter(m => m.probability < 50).slice(0, 12);

  return (
    <div className="min-h-screen bg-black text-white">
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
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-40 bg-white/5 border-white/10 text-xs placeholder:text-white/40 rounded-lg"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {['simple', 'pro'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as 'simple' | 'pro')}
                  className={`text-[8px] sm:text-[9px] px-2 py-1 rounded-md capitalize transition-colors ${
                    viewMode === mode ? 'bg-purple-500 text-white font-medium' : 'text-white/50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            
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
            <span className="font-semibold text-white">156</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/50">Predictions:</span>
            <span className="font-semibold text-white">45.2K</span>
            <span className="text-purple-400">▲12%</span>
          </div>
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
            {(showAllHotPredictions ? mockMarkets : mockMarkets.slice(0, 3)).map((market) => (
              <div
                key={market.id}
                onClick={() => navigate(`/music-alpha/${market.id}`)}
                className="flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all"
              >
                <img src={market.artwork} alt={market.songTitle} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{market.songTitle}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{market.outcome}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[10px] sm:text-xs font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {market.probability}%
                  </p>
                  <p className="text-[7px] sm:text-[8px] text-white/40">probability</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Market Events */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">Prediction signals</h3>
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
                  <img src={event.market.artwork} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-medium text-white truncate">{event.market.songTitle}</span>
                      <span className={`text-[8px] font-medium ${event.change >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                        +{(event.change * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40">{event.market.probability}% probability</p>
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

        {/* Probability Treemaps - Realtime */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* High Probability */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[10px] sm:text-xs font-medium text-white">High probability</span>
                <span className="text-[7px] text-[#4ade80] animate-pulse">● realtime</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[8px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {highProbability.map((market, i) => (
                <div
                  key={market.id}
                  onClick={() => navigate(`/music-alpha/${market.id}`)}
                  className={`bg-[#4ade80]/20 hover:bg-[#4ade80]/30 rounded-lg p-2 cursor-pointer transition-all ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '70px' : '35px' }}
                >
                  <p className="text-[8px] sm:text-[9px] font-semibold text-white truncate">{market.songTitle.slice(0, 8)}</p>
                  <p className="text-[7px] sm:text-[8px] text-[#4ade80]">{market.probability}%</p>
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
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[8px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {lowProbability.map((market, i) => (
                <div
                  key={market.id}
                  onClick={() => navigate(`/music-alpha/${market.id}`)}
                  className={`bg-red-500/20 hover:bg-red-500/30 rounded-lg p-2 cursor-pointer transition-all ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '70px' : '35px' }}
                >
                  <p className="text-[8px] sm:text-[9px] font-semibold text-white truncate">{market.songTitle.slice(0, 8)}</p>
                  <p className="text-[7px] sm:text-[8px] text-red-400">{market.probability}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Prediction Markets */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">🎯 Prediction Markets</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockMarkets.map((market) => (
              <Card
                key={market.id}
                onClick={() => navigate(`/music-alpha/${market.id}`)}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 cursor-pointer transition-all"
              >
                <div className="flex items-start gap-3 mb-3">
                  <img src={market.artwork} alt={market.songTitle} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] sm:text-xs font-medium text-white truncate">{market.songTitle}</h4>
                      <span className={`text-[7px] px-1.5 py-0.5 rounded-full ${
                        market.status === 'surging' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 
                        market.status === 'underground' ? 'bg-purple-500/20 text-purple-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <p className="text-[8px] text-white/50">{market.artist}</p>
                  </div>
                </div>

                <p className="text-[9px] text-white/70 mb-3">{market.outcome}</p>

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3 text-white/40" />
                    <span className="text-[8px] text-white/50">{market.fanProbability}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-3 w-3 text-purple-400" />
                    <span className="text-[8px] text-purple-400">{market.aiProbability}%</span>
                  </div>
                  <span className={`text-[10px] font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {market.probability}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-white/40">{(market.totalForecasts / 1000).toFixed(1)}k forecasts</span>
                  <span className="text-[8px] text-white/40">{market.horizon}</span>
                </div>
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
              </div>
              <div className="space-y-2">
                {mockLeaderboard.fans.map((fan, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                    <span className="text-[9px] text-white/40 w-4">{i + 1}</span>
                    <span className="text-lg">{fan.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-white">{fan.name}</p>
                      <p className="text-[8px] text-white/40">{fan.predictions} predictions</p>
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
              </div>
              <div className="space-y-2">
                {mockLeaderboard.ais.map((ai, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-lg">
                    <span className="text-[9px] text-white/40 w-4">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium text-white">{ai.name}</p>
                      <p className="text-[8px] text-white/40">{ai.specialty}</p>
                    </div>
                    <span className="text-[9px] font-bold text-purple-400">{ai.accuracy}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default MusicAlpha;
