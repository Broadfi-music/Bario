import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ChevronDown, 
  Zap, BarChart3, Users, Share2, Check, Trophy, Brain,
  Clock, Target, Flame, Sparkles, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Navbar } from '@/components/Navbar';

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
  probabilityHistory: number[];
  events: { time: string; event: string }[];
}

interface UserPrediction {
  id: number;
  market: PredictionMarket;
  prediction: 'will' | 'wont';
  confidence: 'low' | 'medium' | 'high';
  status: 'pending' | 'won' | 'lost';
  xpGained: number;
}

interface Leaderboard {
  fans: { name: string; avatar: string; winRate: number; predictions: number; tags: string[] }[];
  ais: { name: string; accuracy: number; specialty: string }[];
}

// Mock data
const mockMarkets: PredictionMarket[] = [
  {
    id: 1, songTitle: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', status: 'surging',
    outcome: 'Will enter Top 50 Spotify Global this week?',
    probability: 67, fanProbability: 72, aiProbability: 63,
    totalForecasts: 12540, fanAccuracy: 71, aiAccuracy: 78,
    horizon: 'This Week', isWatchlisted: false,
    probabilityHistory: [45, 52, 58, 62, 67, 65, 67],
    events: [
      { time: '2h ago', event: 'Added to major playlist' },
      { time: '6h ago', event: '+132% TikTok uses' },
    ],
  },
  {
    id: 2, songTitle: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', status: 'surging',
    outcome: 'Will double TikTok uses in 7 days?',
    probability: 82, fanProbability: 85, aiProbability: 79,
    totalForecasts: 8932, fanAccuracy: 68, aiAccuracy: 81,
    horizon: 'This Week', isWatchlisted: true,
    probabilityHistory: [60, 65, 72, 78, 80, 81, 82],
    events: [
      { time: '1h ago', event: 'Influencer posted dance video' },
      { time: '4h ago', event: 'Trending on TikTok sounds' },
    ],
  },
  {
    id: 3, songTitle: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', status: 'stable',
    outcome: 'Will reach #1 on US Country Radio within 30 days?',
    probability: 34, fanProbability: 42, aiProbability: 28,
    totalForecasts: 5678, fanAccuracy: 65, aiAccuracy: 74,
    horizon: 'Next 30 Days', isWatchlisted: false,
    probabilityHistory: [28, 30, 32, 35, 33, 34, 34],
    events: [
      { time: '3h ago', event: 'Radio add in Nashville' },
    ],
  },
  {
    id: 4, songTitle: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', status: 'underground',
    outcome: 'Will break Top 10 in UK charts within 30 days?',
    probability: 23, fanProbability: 31, aiProbability: 18,
    totalForecasts: 3421, fanAccuracy: 58, aiAccuracy: 72,
    horizon: 'Next 30 Days', isWatchlisted: true,
    probabilityHistory: [12, 15, 18, 20, 22, 21, 23],
    events: [
      { time: '30m ago', event: 'Viral dance trend starting' },
      { time: '2h ago', event: '+245% TikTok uses in 24h' },
    ],
  },
  {
    id: 5, songTitle: 'K-Pop Fire', artist: 'Seoul Stars',
    artwork: '/src/assets/track-3.jpeg', status: 'surging',
    outcome: 'Will trend #1 on YouTube Music globally?',
    probability: 56, fanProbability: 68, aiProbability: 48,
    totalForecasts: 18234, fanAccuracy: 73, aiAccuracy: 76,
    horizon: 'Next 24h', isWatchlisted: false,
    probabilityHistory: [35, 42, 48, 52, 54, 55, 56],
    events: [
      { time: '1h ago', event: 'Fan accounts trending worldwide' },
    ],
  },
  {
    id: 6, songTitle: 'Neon Nights', artist: 'DJ Pulse',
    artwork: '/src/assets/card-4.png', status: 'stable',
    outcome: 'Will get 1M+ Shazam searches this week?',
    probability: 45, fanProbability: 48, aiProbability: 42,
    totalForecasts: 6543, fanAccuracy: 62, aiAccuracy: 69,
    horizon: 'This Week', isWatchlisted: false,
    probabilityHistory: [38, 40, 42, 44, 45, 44, 45],
    events: [
      { time: '5h ago', event: 'Shazam searches up 45%' },
    ],
  },
];

const mockUserPredictions: UserPrediction[] = [
  { id: 1, market: mockMarkets[0], prediction: 'will', confidence: 'high', status: 'pending', xpGained: 0 },
  { id: 2, market: mockMarkets[1], prediction: 'will', confidence: 'medium', status: 'won', xpGained: 150 },
  { id: 3, market: mockMarkets[2], prediction: 'wont', confidence: 'low', status: 'lost', xpGained: -50 },
];

const mockLeaderboard: Leaderboard = {
  fans: [
    { name: 'ChartMaster99', avatar: '🎯', winRate: 78, predictions: 234, tags: ['K-Pop', 'Viral'] },
    { name: 'BeatProphet', avatar: '🔮', winRate: 75, predictions: 189, tags: ['Hip-Hop', 'TikTok'] },
    { name: 'TrendHunter', avatar: '🎵', winRate: 72, predictions: 156, tags: ['Afrobeats', 'Global'] },
    { name: 'RadioOracle', avatar: '📻', winRate: 71, predictions: 312, tags: ['Country', 'Radio'] },
    { name: 'ViralVision', avatar: '✨', winRate: 69, predictions: 98, tags: ['Pop', 'Dance'] },
  ],
  ais: [
    { name: 'Momentum AI', accuracy: 84, specialty: 'Short-term TikTok velocity' },
    { name: 'Underground Scout', accuracy: 79, specialty: 'Emerging artist breakouts' },
    { name: 'Radio Oracle AI', accuracy: 77, specialty: 'Radio adds prediction' },
    { name: 'Global Trend AI', accuracy: 75, specialty: 'Cross-market virality' },
  ],
};

// Probability Ring Component
const ProbabilityRing = ({ probability }: { probability: number }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (probability / 100) * circumference;
  const color = probability >= 60 ? '#22c55e' : probability >= 40 ? '#eab308' : '#ef4444';
  
  return (
    <div className="relative w-28 h-28 sm:w-32 sm:h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="50%" cy="50%" r="45" fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-white">{probability}%</span>
        <span className="text-[10px] text-muted-foreground">Probability</span>
      </div>
    </div>
  );
};

// Status Badge Component
const StatusBadge = ({ status }: { status: 'surging' | 'stable' | 'underground' }) => {
  const styles = {
    surging: 'bg-green-500/20 text-green-400 border-green-500/30',
    stable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    underground: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  
  return (
    <Badge variant="outline" className={`${styles[status]} text-[10px] font-medium capitalize`}>
      {status}
    </Badge>
  );
};

// Mini Chart Component
const MiniChart = ({ data }: { data: number[] }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-0.5 h-8 w-full">
      {data.map((value, i) => (
        <div
          key={i}
          className="flex-1 bg-green-500/60 rounded-t"
          style={{ height: `${((value - min) / range) * 100}%`, minHeight: '2px' }}
        />
      ))}
    </div>
  );
};

const MusicAlpha = () => {
  const [activeTab, setActiveTab] = useState('hot-predictions');
  const [viewMode, setViewMode] = useState<'simple' | 'pro'>('simple');
  const [horizon, setHorizon] = useState('This Week');
  const [outcomeTypes, setOutcomeTypes] = useState<string[]>(['Spotify Chart Moves', 'TikTok Sound Uses']);
  const [gameMode, setGameMode] = useState('blended');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedMarket, setSelectedMarket] = useState<PredictionMarket | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 4]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userPredictions, setUserPredictions] = useState<{[key: number]: { prediction: 'will' | 'wont'; confidence: string } | null}>({});

  const horizons = ['Next 24h', 'This Week', 'Next 30 Days'];
  const outcomes = ['Spotify Chart Moves', 'TikTok Sound Uses', 'Shazam Searches', 'Radio Adds', 'Regional Breakouts'];
  
  const toggleOutcome = (outcome: string) => {
    setOutcomeTypes(prev => 
      prev.includes(outcome) 
        ? prev.filter(o => o !== outcome)
        : [...prev, outcome]
    );
  };

  const toggleWatchlist = (id: number) => {
    setWatchlist(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const submitPrediction = (marketId: number, prediction: 'will' | 'wont', confidence: string) => {
    setUserPredictions(prev => ({
      ...prev,
      [marketId]: { prediction, confidence }
    }));
  };

  const filteredMarkets = mockMarkets.filter(market => 
    market.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    market.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Top Navigation */}
      <header className="fixed top-16 left-0 right-0 z-40 bg-black/95 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between h-12 px-2 sm:px-4">
          {/* Left: Title */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
            <span className="font-bold text-xs sm:text-sm">Prediction Superlayer</span>
          </div>
          
          {/* Center: Tabs - Hidden on mobile, shown in bottom nav */}
          <div className="hidden md:flex items-center gap-1">
            {['hot-predictions', 'your-plays', 'leaders'].map(tab => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={`text-xs ${activeTab === tab ? 'bg-white/10' : ''}`}
              >
                {tab === 'hot-predictions' ? 'Hot Predictions' : 
                 tab === 'your-plays' ? 'Your Plays' : 'Leaders & AIs'}
              </Button>
            ))}
          </div>
          
          {/* Right: Search & View */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-32 sm:w-48 bg-white/5 border-white/10 text-xs"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1 h-8 px-2">
                  {viewMode === 'simple' ? 'Simple' : 'Pro'}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                <DropdownMenuItem onClick={() => setViewMode('simple')} className="text-xs">Simple</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('pro')} className="text-xs">Pro</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="flex md:hidden border-t border-white/10 overflow-x-auto">
          {[
            { id: 'hot-predictions', label: 'Hot Predictions' },
            { id: 'your-plays', label: 'Your Plays' },
            { id: 'leaders', label: 'Leaders' }
          ].map(tab => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 text-xs rounded-none border-b-2 ${
                activeTab === tab.id ? 'border-purple-400 text-purple-400' : 'border-transparent'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </header>
      
      <div className="flex pt-28 md:pt-28">
        {/* Left Sidebar - Filters */}
        <aside className={`
          fixed md:sticky top-28 left-0 h-[calc(100vh-7rem)] w-64 bg-zinc-950 border-r border-white/10 
          overflow-y-auto z-30 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-3 space-y-4">
            {/* Forecast Horizon */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Forecast Horizon
              </h3>
              <div className="flex flex-wrap gap-1">
                {horizons.map(h => (
                  <Button
                    key={h}
                    variant={horizon === h ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setHorizon(h)}
                    className={`text-[10px] h-7 ${horizon === h ? 'bg-purple-500/20 border-purple-500/30' : 'border-white/10'}`}
                  >
                    {h}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Outcome Type */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> Outcome Type
              </h3>
              <div className="flex flex-wrap gap-1">
                {outcomes.map(o => (
                  <Badge
                    key={o}
                    variant="outline"
                    className={`cursor-pointer text-[10px] ${
                      outcomeTypes.includes(o) 
                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' 
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                    onClick={() => toggleOutcome(o)}
                  >
                    {o}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Game Mode */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Game Mode
              </h3>
              <div className="space-y-1">
                {[
                  { id: 'fan', label: 'Fan Predictions', icon: Users },
                  { id: 'ai', label: 'AI Signals', icon: Brain },
                  { id: 'blended', label: 'Blended (Fan + AI)', icon: Sparkles },
                ].map(mode => (
                  <Button
                    key={mode.id}
                    variant={gameMode === mode.id ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setGameMode(mode.id)}
                    className={`w-full justify-start text-xs h-8 ${
                      gameMode === mode.id ? 'bg-purple-500/20' : ''
                    }`}
                  >
                    <mode.icon className="h-3 w-3 mr-2" />
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Difficulty */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Risk / Difficulty
              </h3>
              <div className="flex gap-1">
                {['easy', 'medium', 'high'].map(d => (
                  <Button
                    key={d}
                    variant={difficulty === d ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 text-[10px] h-7 ${
                      difficulty === d 
                        ? d === 'easy' ? 'bg-green-500/20 border-green-500/30' 
                          : d === 'high' ? 'bg-red-500/20 border-red-500/30' 
                          : 'bg-yellow-500/20 border-yellow-500/30'
                        : 'border-white/10'
                    }`}
                  >
                    {d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'High Upside'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 min-h-screen p-2 sm:p-4">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Hot Predictions Tab */}
          {activeTab === 'hot-predictions' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">Hot Predictions</h1>
                  <p className="text-xs text-muted-foreground">{filteredMarkets.length} active markets</p>
                </div>
                
                {/* Mobile Search */}
                <div className="relative sm:hidden">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search songs, artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 bg-white/5 border-white/10 text-xs"
                  />
                </div>
              </div>
              
              {/* Market Cards Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMarkets.map(market => (
                  <Card
                    key={market.id}
                    className="bg-zinc-900/50 border-white/10 p-3 sm:p-4 hover:bg-zinc-800/50 transition-all cursor-pointer group"
                    onClick={() => setSelectedMarket(market)}
                  >
                    {/* Song Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <img 
                        src={market.artwork} 
                        alt={market.songTitle}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{market.songTitle}</h3>
                        <p className="text-xs text-muted-foreground truncate">{market.artist}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StatusBadge status={market.status} />
                          <Badge variant="outline" className="text-[10px] border-white/10">
                            {market.horizon}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(market.id); }}
                      >
                        <Star className={`h-4 w-4 ${watchlist.includes(market.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                    
                    {/* Outcome */}
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{market.outcome}</p>
                    
                    {/* Probability Display */}
                    <div className="flex items-center justify-center mb-3">
                      <ProbabilityRing probability={market.probability} />
                    </div>
                    
                    {/* Fan vs AI */}
                    <div className="flex justify-center gap-4 mb-3">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-blue-400" />
                        <span className="text-xs">{market.fanProbability}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Brain className="h-3 w-3 text-purple-400" />
                        <span className="text-xs">{market.aiProbability}%</span>
                      </div>
                    </div>
                    
                    {/* Prediction Actions */}
                    {!userPredictions[market.id] ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 bg-green-500/10 border-green-500/30 hover:bg-green-500/20 text-green-400"
                            onClick={() => submitPrediction(market.id, 'will', 'medium')}
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            It WILL
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-400"
                            onClick={() => submitPrediction(market.id, 'wont', 'medium')}
                          >
                            <TrendingDown className="h-3 w-3 mr-1" />
                            It WON'T
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2 bg-white/5 rounded-lg">
                        <Check className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">
                          Predicted: {userPredictions[market.id]?.prediction === 'will' ? 'WILL' : "WON'T"}
                        </span>
                      </div>
                    )}
                    
                    {/* Quick Stats */}
                    {viewMode === 'pro' && (
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-3 pt-3 border-t border-white/10">
                        <span>{market.totalForecasts.toLocaleString()} forecasts</span>
                        <span>Fan: {market.fanAccuracy}%</span>
                        <span>AI: {market.aiAccuracy}%</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Your Plays Tab */}
          {activeTab === 'your-plays' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <Card className="bg-zinc-900/50 border-white/10 p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{mockUserPredictions.length}</p>
                    <p className="text-xs text-muted-foreground">Active Predictions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">67%</p>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">Level 5</p>
                    <p className="text-xs text-muted-foreground">1,250 XP</p>
                  </div>
                </div>
              </Card>
              
              {/* Predictions List */}
              <div className="space-y-3">
                {mockUserPredictions.map(pred => (
                  <Card
                    key={pred.id}
                    className="bg-zinc-900/50 border-white/10 p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3">
                      <img 
                        src={pred.market.artwork} 
                        alt={pred.market.songTitle}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{pred.market.songTitle}</h3>
                        <p className="text-xs text-muted-foreground truncate">{pred.market.outcome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${
                              pred.prediction === 'will' 
                                ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                                : 'bg-red-500/20 border-red-500/30 text-red-400'
                            }`}
                          >
                            {pred.prediction === 'will' ? 'WILL' : "WON'T"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] border-white/10 capitalize">
                            {pred.confidence}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            pred.status === 'won' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            pred.status === 'lost' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                            'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                          }`}
                        >
                          {pred.status}
                        </Badge>
                        {pred.xpGained !== 0 && (
                          <p className={`text-xs mt-1 ${pred.xpGained > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pred.xpGained > 0 ? '+' : ''}{pred.xpGained} XP
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Leaders Tab */}
          {activeTab === 'leaders' && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Top Fans */}
              <Card className="bg-zinc-900/50 border-white/10 p-4">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Top Fans
                </h2>
                <div className="space-y-3">
                  {mockLeaderboard.fans.map((fan, i) => (
                    <div key={fan.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <span className="text-2xl">{fan.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{fan.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {fan.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] border-white/10">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{fan.winRate}%</p>
                        <p className="text-[10px] text-muted-foreground">{fan.predictions} plays</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-7 border-white/10">
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
              
              {/* Top AIs */}
              <Card className="bg-zinc-900/50 border-white/10 p-4">
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  Top AI Strategies
                </h2>
                <div className="space-y-3">
                  {mockLeaderboard.ais.map((ai, i) => (
                    <div key={ai.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                      <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{ai.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ai.specialty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-purple-400 font-semibold">{ai.accuracy}%</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-7 border-white/10">
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
      
      {/* Market Detail Drawer */}
      <Sheet open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
        <SheetContent className="bg-zinc-950 border-white/10 w-full sm:max-w-lg overflow-y-auto">
          {selectedMarket && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-start gap-4">
                  <img 
                    src={selectedMarket.artwork} 
                    alt={selectedMarket.songTitle}
                    className="w-20 h-20 rounded-xl object-cover"
                  />
                  <div>
                    <SheetTitle className="text-white text-left">{selectedMarket.songTitle}</SheetTitle>
                    <p className="text-sm text-muted-foreground">{selectedMarket.artist}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={selectedMarket.status} />
                      <Badge variant="outline" className="text-[10px] border-white/10">
                        {selectedMarket.horizon}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="space-y-6">
                {/* Big Probability */}
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-white">{selectedMarket.probability}%</p>
                  <p className="text-sm text-muted-foreground mt-1">Future Hit Probability</p>
                </div>
                
                {/* Outcome Definition */}
                <Card className="bg-white/5 border-white/10 p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">OUTCOME DEFINITION</h4>
                  <p className="text-sm">{selectedMarket.outcome}</p>
                </Card>
                
                {/* Forecast Curve */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">PROBABILITY TREND</h4>
                  <div className="h-24 bg-white/5 rounded-lg p-3">
                    <MiniChart data={selectedMarket.probabilityHistory} />
                  </div>
                </div>
                
                {/* Fan vs AI */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">CROWD VS AI</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-blue-500/10 border-blue-500/20 p-3 text-center">
                      <Users className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                      <p className="text-xl font-bold">{selectedMarket.fanProbability}%</p>
                      <p className="text-[10px] text-muted-foreground">Fan Crowd</p>
                    </Card>
                    <Card className="bg-purple-500/10 border-purple-500/20 p-3 text-center">
                      <Brain className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                      <p className="text-xl font-bold">{selectedMarket.aiProbability}%</p>
                      <p className="text-[10px] text-muted-foreground">AI Model</p>
                    </Card>
                  </div>
                </div>
                
                {/* Recent Events */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">RECENT EVENTS</h4>
                  <div className="space-y-2">
                    {selectedMarket.events.map((event, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{event.time}</span>
                        <span>{event.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 border-white/10">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`flex-1 ${watchlist.includes(selectedMarket.id) ? 'bg-yellow-500/20 border-yellow-500/30' : 'border-white/10'}`}
                    onClick={() => toggleWatchlist(selectedMarket.id)}
                  >
                    <Star className={`h-4 w-4 mr-2 ${watchlist.includes(selectedMarket.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    Watchlist
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MusicAlpha;
