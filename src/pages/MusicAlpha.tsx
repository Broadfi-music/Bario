import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ChevronDown, 
  Zap, Users, Check, Trophy, Brain, Clock, Target, Flame, Sparkles, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
}

interface UserPrediction {
  id: number;
  market: PredictionMarket;
  prediction: 'will' | 'wont';
  confidence: 'low' | 'medium' | 'high';
  status: 'pending' | 'won' | 'lost';
  xpGained: number;
}

// Mock data
const mockMarkets: PredictionMarket[] = [
  {
    id: 1, songTitle: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', status: 'surging',
    outcome: 'Top 50 Spotify Global this week?',
    probability: 67, fanProbability: 72, aiProbability: 63,
    totalForecasts: 12540, fanAccuracy: 71, aiAccuracy: 78,
    horizon: 'This Week', isWatchlisted: false,
  },
  {
    id: 2, songTitle: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', status: 'surging',
    outcome: 'Double TikTok uses in 7 days?',
    probability: 82, fanProbability: 85, aiProbability: 79,
    totalForecasts: 8932, fanAccuracy: 68, aiAccuracy: 81,
    horizon: 'This Week', isWatchlisted: true,
  },
  {
    id: 3, songTitle: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', status: 'stable',
    outcome: '#1 US Country Radio in 30 days?',
    probability: 34, fanProbability: 42, aiProbability: 28,
    totalForecasts: 5678, fanAccuracy: 65, aiAccuracy: 74,
    horizon: '30 Days', isWatchlisted: false,
  },
  {
    id: 4, songTitle: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', status: 'underground',
    outcome: 'Break Top 10 UK charts?',
    probability: 23, fanProbability: 31, aiProbability: 18,
    totalForecasts: 3421, fanAccuracy: 58, aiAccuracy: 72,
    horizon: '30 Days', isWatchlisted: true,
  },
  {
    id: 5, songTitle: 'K-Pop Fire', artist: 'Seoul Stars',
    artwork: '/src/assets/track-3.jpeg', status: 'surging',
    outcome: '#1 YouTube Music globally?',
    probability: 56, fanProbability: 68, aiProbability: 48,
    totalForecasts: 18234, fanAccuracy: 73, aiAccuracy: 76,
    horizon: '24h', isWatchlisted: false,
  },
];

const mockUserPredictions: UserPrediction[] = [
  { id: 1, market: mockMarkets[0], prediction: 'will', confidence: 'high', status: 'pending', xpGained: 0 },
  { id: 2, market: mockMarkets[1], prediction: 'will', confidence: 'medium', status: 'won', xpGained: 150 },
  { id: 3, market: mockMarkets[2], prediction: 'wont', confidence: 'low', status: 'lost', xpGained: -50 },
];

const mockLeaderboard = {
  fans: [
    { name: 'ChartMaster99', avatar: '🎯', winRate: 78, predictions: 234, tags: ['K-Pop', 'Viral'] },
    { name: 'BeatProphet', avatar: '🔮', winRate: 75, predictions: 189, tags: ['Hip-Hop'] },
    { name: 'TrendHunter', avatar: '🎵', winRate: 72, predictions: 156, tags: ['Afrobeats'] },
  ],
  ais: [
    { name: 'Momentum AI', accuracy: 84, specialty: 'TikTok velocity' },
    { name: 'Underground Scout', accuracy: 79, specialty: 'Artist breakouts' },
    { name: 'Radio Oracle AI', accuracy: 77, specialty: 'Radio adds' },
  ],
};

const horizons = ['24h', 'This Week', '30 Days'];

const MusicAlpha = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('hot-predictions');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [horizon, setHorizon] = useState('This Week');
  const [gameMode, setGameMode] = useState('blended');
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 4]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [userPredictions, setUserPredictions] = useState<{[key: number]: { prediction: 'will' | 'wont'; confidence: string } | null}>({});

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

  const submitPrediction = (marketId: number, prediction: 'will' | 'wont', confidence: string) => {
    handleInteraction('make a prediction', () => {
      setUserPredictions(prev => ({
        ...prev,
        [marketId]: { prediction, confidence }
      }));
      toast.success('Prediction submitted!');
    });
  };

  const filteredMarkets = mockMarkets.filter(market => 
    market.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatusBadge = ({ status }: { status: 'surging' | 'stable' | 'underground' }) => {
    const styles = {
      surging: 'bg-[#4ade80]/20 text-[#4ade80]',
      stable: 'bg-yellow-500/20 text-yellow-400',
      underground: 'bg-purple-500/20 text-purple-400',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium capitalize ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const ProbabilityRing = ({ probability, size = 'normal' }: { probability: number; size?: 'small' | 'normal' }) => {
    const color = probability >= 60 ? '#4ade80' : probability >= 40 ? '#eab308' : '#ef4444';
    const dimensions = size === 'small' ? 'w-14 h-14' : 'w-20 h-20 sm:w-24 sm:h-24';
    const fontSize = size === 'small' ? 'text-sm' : 'text-lg sm:text-xl';
    
    return (
      <div className={`relative ${dimensions}`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="50%" cy="50%" r="40%" fill="none" stroke="#27272a" strokeWidth="6" />
          <circle
            cx="50%" cy="50%" r="40%" fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${probability * 2.51} 251`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${fontSize} font-bold text-white`}>{probability}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-base sm:text-lg font-bold text-white">
              BARIO
            </Link>
            <span className="text-purple-400 text-[10px] sm:text-xs font-medium">Alpha</span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-36 sm:w-48 bg-white/5 border-white/10 text-xs placeholder:text-white/40"
              />
            </div>
            
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-purple-500 text-white hover:bg-purple-500/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-purple-500 text-white hover:bg-purple-500/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-full">
                  Sign In
                </Button>
              </Link>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-8 w-8 text-white/60"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-t border-white/5 px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[
                { id: 'hot-predictions', label: 'Hot', icon: Flame },
                { id: 'your-plays', label: 'Plays', icon: Target },
                { id: 'leaders', label: 'Leaders', icon: Trophy }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if ((tab.id === 'your-plays' || tab.id === 'leaders') && !user) {
                      toast.error('Please sign in to view ' + tab.label.toLowerCase());
                      navigate('/auth');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`text-[10px] sm:text-xs h-7 px-2 sm:px-3 rounded-full gap-1 ${
                    activeTab === tab.id ? 'bg-purple-500/20 text-purple-400' : 'text-white/60'
                  }`}
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Button>
              ))}
            </div>
            
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
              {['simple', 'pro'].map(mode => (
                <Button
                  key={mode}
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(mode as 'simple' | 'pro')}
                  className={`text-[10px] h-6 px-2 rounded-full capitalize ${
                    viewMode === mode ? 'bg-white/10 text-white' : 'text-white/50'
                  }`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Filters Row */}
        <div className={`border-t border-white/5 px-3 sm:px-4 py-2 overflow-x-auto ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center gap-2 min-w-max">
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
              {horizons.map(h => (
                <Button
                  key={h}
                  variant="ghost"
                  size="sm"
                  onClick={() => setHorizon(h)}
                  className={`text-[10px] h-6 px-2 rounded-full ${
                    horizon === h ? 'bg-purple-500/20 text-purple-400' : 'text-white/50'
                  }`}
                >
                  {h}
                </Button>
              ))}
            </div>
            
            <div className="w-px h-4 bg-white/10" />
            
            <div className="flex items-center gap-1">
              {[
                { id: 'fan', label: 'Fans', icon: Users },
                { id: 'ai', label: 'AI', icon: Brain },
                { id: 'blended', label: 'Both', icon: Sparkles },
              ].map(mode => (
                <Button
                  key={mode.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => setGameMode(mode.id)}
                  className={`text-[10px] h-6 px-2 rounded-full gap-1 ${
                    gameMode === mode.id ? 'bg-purple-500/20 text-purple-400' : 'text-white/50'
                  }`}
                >
                  <mode.icon className="h-3 w-3" />
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="sm:hidden border-t border-white/5 px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-full bg-white/5 border-white/10 text-xs placeholder:text-white/40"
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-[160px] sm:pt-[140px] pb-6 px-3 sm:px-4">
        {activeTab === 'hot-predictions' && (
          <div className="space-y-3">
            {filteredMarkets.map((market) => (
              <Card
                key={market.id}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 transition-all cursor-pointer group overflow-hidden"
                onClick={() => setSelectedMarket(market)}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Artwork */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                      <img src={market.artwork} alt={market.songTitle} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate">{market.songTitle}</h3>
                        <StatusBadge status={market.status} />
                      </div>
                      <p className="text-white/50 text-[10px] sm:text-xs mb-2">{market.artist} • {market.horizon}</p>
                      <p className="text-white/80 text-[11px] sm:text-xs font-medium">{market.outcome}</p>
                    </div>
                    
                    {/* Probability */}
                    <div className="flex-shrink-0">
                      <ProbabilityRing probability={market.probability} size="small" />
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] text-white/50">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {(market.totalForecasts / 1000).toFixed(1)}k
                      </span>
                      {viewMode === 'pro' && (
                        <>
                          <span>Fan: {market.fanAccuracy}%</span>
                          <span>AI: {market.aiAccuracy}%</span>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 ${watchlist.includes(market.id) ? 'text-yellow-400' : 'text-white/30'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(market.id);
                      }}
                    >
                      <Star className={`h-3.5 w-3.5 ${watchlist.includes(market.id) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'your-plays' && (
          <div className="space-y-3">
            {/* Stats Summary */}
            <Card className="bg-purple-500/10 border-purple-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/60 text-[10px] sm:text-xs">Active Predictions</div>
                  <div className="text-lg sm:text-xl font-bold text-white">3</div>
                </div>
                <div className="text-center">
                  <div className="text-white/60 text-[10px] sm:text-xs">Win Rate</div>
                  <div className="text-lg sm:text-xl font-bold text-[#4ade80]">67%</div>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-[10px] sm:text-xs">XP Level</div>
                  <div className="text-lg sm:text-xl font-bold text-purple-400">12</div>
                </div>
              </div>
            </Card>
            
            {mockUserPredictions.map((up) => (
              <Card key={up.id} className="bg-white/[0.02] border-white/5 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <img src={up.market.artwork} alt={up.market.songTitle} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white text-xs sm:text-sm truncate">{up.market.songTitle}</h4>
                    <p className="text-white/50 text-[10px] sm:text-xs truncate">{up.market.outcome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[9px] ${up.prediction === 'will' ? 'border-[#4ade80]/30 text-[#4ade80]' : 'border-red-500/30 text-red-400'}`}>
                        {up.prediction === 'will' ? 'Will' : "Won't"}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-white/20 text-white/60 capitalize">
                        {up.confidence}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-[9px] ${
                      up.status === 'won' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 
                      up.status === 'lost' ? 'bg-red-500/20 text-red-400' : 
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {up.status}
                    </Badge>
                    {up.xpGained !== 0 && (
                      <div className={`text-[10px] mt-1 ${up.xpGained > 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {up.xpGained > 0 ? '+' : ''}{up.xpGained} XP
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'leaders' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Fans */}
            <Card className="bg-white/[0.02] border-white/5 p-3 sm:p-4">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#4ade80]" /> Top Fans
              </h3>
              <div className="space-y-2">
                {mockLeaderboard.fans.map((fan, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <div className="text-lg">{fan.avatar}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-xs truncate">{fan.name}</div>
                      <div className="text-white/50 text-[10px]">{fan.predictions} predictions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#4ade80] font-bold text-sm">{fan.winRate}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            {/* Top AIs */}
            <Card className="bg-white/[0.02] border-white/5 p-3 sm:p-4">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" /> Top AIs
              </h3>
              <div className="space-y-2">
                {mockLeaderboard.ais.map((ai, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Brain className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-xs truncate">{ai.name}</div>
                      <div className="text-white/50 text-[10px] truncate">{ai.specialty}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-purple-400 font-bold text-sm">{ai.accuracy}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Market Detail Sheet */}
      <Sheet open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
        <SheetContent className="bg-zinc-950 border-white/10 w-full sm:max-w-md overflow-y-auto">
          {selectedMarket && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedMarket.artwork} alt={selectedMarket.songTitle} className="w-16 h-16 rounded-lg" />
                  <div>
                    <SheetTitle className="text-white text-base">{selectedMarket.songTitle}</SheetTitle>
                    <p className="text-white/60 text-sm">{selectedMarket.artist}</p>
                    <StatusBadge status={selectedMarket.status} />
                  </div>
                </div>
              </SheetHeader>
              
              <div className="space-y-4">
                {/* Outcome */}
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-white/80 text-sm mb-4">{selectedMarket.outcome}</p>
                  <ProbabilityRing probability={selectedMarket.probability} />
                  <p className="text-white/40 text-xs mt-2">Closes: {selectedMarket.horizon}</p>
                </div>
                
                {/* Fan vs AI */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <Users className="h-4 w-4 text-white/40 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{selectedMarket.fanProbability}%</div>
                    <div className="text-[10px] text-white/40">Fan Crowd</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <Brain className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{selectedMarket.aiProbability}%</div>
                    <div className="text-[10px] text-white/40">AI Model</div>
                  </div>
                </div>
                
                {/* Prediction Actions */}
                {!userPredictions[selectedMarket.id] ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 h-12"
                        onClick={() => submitPrediction(selectedMarket.id, 'will', 'medium')}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        It WILL
                      </Button>
                      <Button 
                        variant="outline" 
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-12"
                        onClick={() => submitPrediction(selectedMarket.id, 'wont', 'medium')}
                      >
                        It WON'T
                      </Button>
                    </div>
                    <p className="text-white/40 text-[10px] text-center">Tap to make your prediction</p>
                  </div>
                ) : (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                    <Check className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-medium text-sm">Prediction Submitted!</p>
                    <p className="text-white/50 text-xs">
                      You predicted: {userPredictions[selectedMarket.id]?.prediction === 'will' ? 'It WILL' : "It WON'T"}
                    </p>
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center justify-between text-[10px] text-white/40 pt-2">
                  <span>Total forecasts: {selectedMarket.totalForecasts.toLocaleString()}</span>
                  <span>Fan accuracy: {selectedMarket.fanAccuracy}%</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      {/* User Profile Badge */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40">
          <Link to="/dashboard">
            <div className="flex items-center gap-2 bg-purple-500/20 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 border border-purple-500/20 hover:bg-purple-500/30 transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/src/assets/track-1.jpeg" />
                <AvatarFallback className="bg-purple-500 text-white text-xs">
                  {user.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white text-xs">Dashboard</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MusicAlpha;