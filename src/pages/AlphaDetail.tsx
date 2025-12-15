import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2,
  Users, Brain, Zap, Clock, Target, Check, X, Trophy
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
    listeners: '2.4M', marketCap: '41.7M',
    description: 'Major playlist addition driving massive streams. Strong momentum across all platforms.',
    historyData: [45, 52, 58, 55, 61, 64, 67],
  },
  {
    id: 2, songTitle: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', status: 'surging' as const,
    outcome: 'Will double TikTok uses in 7 days?',
    outcomeDefinition: 'Hit if TikTok sound uses reach 2x current count by end of week',
    probability: 82, fanProbability: 85, aiProbability: 79,
    totalForecasts: 8932, fanAccuracy: 68, aiAccuracy: 81,
    horizon: 'This Week', isWatchlisted: true, change24h: 12.8,
    listeners: '1.8M', marketCap: '35.2M',
    description: 'Viral TikTok trend with multiple dance challenges. Momentum accelerating.',
    historyData: [60, 65, 70, 75, 78, 80, 82],
  },
];

const communityInsights = [
  { user: 'ChartMaster99', avatar: '🎯', comment: 'Huge TikTok dance trend starting, seen it everywhere', time: '2h ago' },
  { user: 'BeatProphet', avatar: '🔮', comment: 'Radio adds in multiple countries confirmed', time: '4h ago' },
  { user: 'TrendHunter', avatar: '🎵', comment: 'Underground buzz is real, this will break out', time: '6h ago' },
];

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
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs sm:text-sm">Back</span>
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
        <div className="max-w-5xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-4">
              {/* Song Header */}
              <Card className="bg-white/[0.02] border-white/5 p-4 sm:p-6">
                <div className="flex items-start gap-4 mb-6">
                  <img src={market.artwork} alt={market.songTitle} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-lg sm:text-xl font-bold text-white">{market.songTitle}</h1>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                        market.status === 'surging' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {market.status}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mb-2">{market.artist}</p>
                    <p className="text-xs text-white/60">{market.description}</p>
                  </div>
                </div>

                {/* Main Probability Display */}
                <div className="text-center py-6 bg-white/[0.02] rounded-xl mb-6">
                  <p className="text-sm text-white/50 mb-2">{market.outcome}</p>
                  <div className="flex items-center justify-center gap-4">
                    <div className={`text-5xl sm:text-6xl font-bold ${market.probability >= 50 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {market.probability}%
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mt-2">Future Hit Probability</p>
                  
                  {/* Fan vs AI */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-white/50" />
                      <span className="text-sm text-white/70">Fan: {market.fanProbability}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-purple-400">AI: {market.aiProbability}%</span>
                    </div>
                  </div>
                </div>

                {/* Prediction Actions */}
                <div className="space-y-4">
                  <p className="text-xs text-white/50 text-center">Make your prediction</p>
                  <div className="flex gap-3">
                    <Button
                      className={`flex-1 h-12 text-sm font-medium transition-all ${
                        userPrediction === 'will' 
                          ? 'bg-[#4ade80] text-black' 
                          : 'bg-[#4ade80]/20 text-[#4ade80] hover:bg-[#4ade80]/30'
                      }`}
                      onClick={() => setUserPrediction('will')}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      It WILL happen
                    </Button>
                    <Button
                      className={`flex-1 h-12 text-sm font-medium transition-all ${
                        userPrediction === 'wont' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                      onClick={() => setUserPrediction('wont')}
                    >
                      <X className="h-4 w-4 mr-2" />
                      It WON'T happen
                    </Button>
                  </div>

                  {userPrediction && (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs text-white/50">Confidence level</p>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high'] as const).map(level => (
                            <button
                              key={level}
                              onClick={() => setConfidence(level)}
                              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
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
                        className="w-full h-10 bg-purple-500 hover:bg-purple-600 text-white"
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
                    <p className="text-lg font-bold text-white">{(market.totalForecasts / 1000).toFixed(1)}k</p>
                    <p className="text-[10px] text-white/40">Total forecasts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-[#4ade80]">{market.fanAccuracy}%</p>
                    <p className="text-[10px] text-white/40">Fan accuracy (30d)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-400">{market.aiAccuracy}%</p>
                    <p className="text-[10px] text-white/40">AI accuracy (30d)</p>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-white/10">
                {['Forecast Curve', 'Crowd vs AI', 'Insights'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                    className={`pb-2 text-xs font-medium transition-colors relative ${
                      activeTab === tab.toLowerCase().replace(' ', '-') ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    {tab}
                    {activeTab === tab.toLowerCase().replace(' ', '-') && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'forecast-curve' && (
                <Card className="bg-white/[0.02] border-white/5 p-4">
                  <h3 className="text-sm font-medium text-white mb-4">Probability over time</h3>
                  <div className="h-48 bg-white/[0.02] rounded-xl flex items-end justify-around p-4">
                    {market.historyData.map((value, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div 
                          className="w-6 sm:w-8 bg-gradient-to-t from-purple-500/50 to-purple-500 rounded-t transition-all"
                          style={{ height: `${value}%` }}
                        />
                        <span className="text-[8px] text-white/30">{i + 1}d</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeTab === 'crowd-vs-ai' && (
                <Card className="bg-white/[0.02] border-white/5 p-4">
                  <h3 className="text-sm font-medium text-white mb-4">Accuracy track record</h3>
                  <div className="space-y-3">
                    {forecastHistory.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          item.result === 'won' ? 'bg-[#4ade80]/20' : 'bg-red-500/20'
                        }`}>
                          {item.result === 'won' ? (
                            <Check className="h-4 w-4 text-[#4ade80]" />
                          ) : (
                            <X className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-white">{item.outcome}</p>
                          <p className="text-[10px] text-white/40">Called {item.prediction} at {item.probability}%</p>
                        </div>
                        <span className="text-[10px] text-white/30">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeTab === 'insights' && (
                <Card className="bg-white/[0.02] border-white/5 p-4">
                  <h3 className="text-sm font-medium text-white mb-4">Community insights</h3>
                  <div className="space-y-3">
                    {communityInsights.map((insight, i) => (
                      <div key={i} className="p-3 bg-white/[0.02] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{insight.avatar}</span>
                          <span className="text-xs font-medium text-white">{insight.user}</span>
                          <span className="text-[9px] text-white/30 ml-auto">{insight.time}</span>
                        </div>
                        <p className="text-[11px] text-white/70">{insight.comment}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Outcome Definition */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-purple-400" />
                  <h3 className="text-xs font-medium text-white">Outcome definition</h3>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">{market.outcomeDefinition}</p>
                <div className="flex items-center gap-2 mt-3 text-[10px] text-white/40">
                  <Clock className="h-3 w-3" />
                  <span>Closes: {market.horizon}</span>
                </div>
              </Card>

              {/* Market Stats */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-xs font-medium text-white mb-3">Market stats</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Listeners</span>
                    <span className="text-[10px] font-medium text-white">{market.listeners}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Market cap</span>
                    <span className="text-[10px] font-medium text-white">${market.marketCap}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">24h change</span>
                    <span className={`text-[10px] font-medium ${market.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {market.change24h >= 0 ? '+' : ''}{market.change24h}%
                    </span>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="space-y-2">
                  <Button
                    className="w-full h-9 text-[10px] bg-white/5 text-white hover:bg-white/10"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                  >
                    <Share2 className="h-3 w-3 mr-2" />
                    Share this market
                  </Button>
                  <Button
                    className="w-full h-9 text-[10px] bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                    onClick={() => handleInteraction('add to watchlist')}
                  >
                    <Star className="h-3 w-3 mr-2" />
                    Add to Watchlist
                  </Button>
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
