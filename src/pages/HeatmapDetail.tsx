import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play,
  Users, Clock, Zap, ChevronDown, Copy, Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Mock data - same as GlobalHeatmap
const mockSongs = [
  {
    id: 1, rank: 1, trend: 'up' as const, trendValue: 12, title: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', attentionScore: 98470, momentum: 'surging' as const, change24h: 15.2,
    listeners: '2.4M', marketCap: '41.7M', price: '$0.24', mindshare: '0%', sentiment: -218.55,
    reach24h: '113.78K', volume24h: '$3.63M', priceVsBTC: -8.33,
    twitterHandle: '@novaecho', description: 'Breakout synth-pop hit dominating charts globally. High energy production with viral hooks.',
    platforms: [{ name: 'Spotify', percentage: 34 }, { name: 'TikTok', percentage: 28 }, { name: 'YouTube', percentage: 22 }],
    latestBuzz: 'Major playlist addition driving massive streams, TikTok trend gaining momentum',
    priceATH: '$5.59', athDate: 'Apr 27, 2022', change7D: -8.48, change30D: -15.08,
    contract: '0xdefa...e97202', sectors: ['Pop', 'Electronic'],
  },
  {
    id: 2, rank: 2, trend: 'up' as const, trendValue: 8, title: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', attentionScore: 89320, momentum: 'surging' as const, change24h: 12.8,
    listeners: '1.8M', marketCap: '35.2M', price: '$0.18', mindshare: '2.1%', sentiment: 156.32,
    reach24h: '98.5K', volume24h: '$2.89M', priceVsBTC: 4.21,
    twitterHandle: '@synthwavekid', description: 'Retro-futuristic anthem trending worldwide on TikTok with dance challenges.',
    platforms: [{ name: 'Spotify', percentage: 31 }, { name: 'TikTok', percentage: 35 }, { name: 'Apple', percentage: 20 }],
    latestBuzz: 'Viral TikTok trend challenging streaming records',
    priceATH: '$3.42', athDate: 'Mar 15, 2023', change7D: 5.67, change30D: 22.34,
    contract: '0xabc1...f89012', sectors: ['Synthwave', 'Electronic'],
  },
];

const topVoices = [
  { name: 'Sanera', avatar: '🎵', score: 49.11, change: 36.81, color: 'bg-[#4ade80]' },
  { name: 'Princ3', avatar: '🎸', score: 8.35, change: 207, color: 'bg-[#4ade80]' },
  { name: 'MickEy M', avatar: '🎹', score: 2.85, change: 12, color: 'bg-[#4ade80]' },
  { name: 'DefiBoss', avatar: '🎤', score: 1.94, change: -0.05, color: 'bg-red-500' },
  { name: 'Calvin', avatar: '🎧', score: 7.55, change: -7.55, color: 'bg-red-500' },
  { name: 'Crypto Aman', avatar: '🎺', score: 1.35, change: 135, color: 'bg-[#4ade80]' },
];

const smartFeed = [
  { user: 'Lookonchain', handle: '@lookonchain', time: 'Dec 14', content: 'Nova Echo streams increased 1,400 in 24h, reaching total of 16,796 plays on Spotify.', views: '81.03K', likes: 453, comments: 93, reposts: 21 },
  { user: 'Cointelegraph', handle: '@Cointelegraph', time: 'Dec 14', content: '⚡NEW: Midnight Rush hits Top 50 Global Charts - massive streaming milestone!', views: '33.44K', likes: 253, comments: 80, reposts: 26 },
];

const HeatmapDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('charts');
  const [timeRange, setTimeRange] = useState('7D');
  
  const song = mockSongs.find(s => s.id === Number(id)) || mockSongs[0];

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Sidebar - Song Info */}
            <div className="lg:col-span-3 space-y-4">
              {/* Song Header */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <img src={song.artwork} alt={song.title} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-white truncate">{song.title}</h1>
                    <p className="text-xs text-white/50">{song.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/40">{song.twitterHandle}</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-white/60 mb-4">{song.description}</p>
                
                {/* Community Sentiment */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-white/50">Community sentiment</span>
                    <span className="text-[10px] text-white/40">{song.listeners} listeners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4ade80] rounded-full" style={{ width: '87%' }} />
                    </div>
                    <span className="text-[10px] text-[#4ade80]">87.1%</span>
                    <span className="text-[10px] text-red-400">12.9%</span>
                  </div>
                  <div className="flex -space-x-1 mt-2">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full bg-white/10 border-2 border-black" />
                    ))}
                  </div>
                </div>

                {/* Latest Buzz */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span className="text-[10px] text-white/50">Latest buzz</span>
                  </div>
                  <p className="text-[10px] text-white/70">{song.latestBuzz}</p>
                  <p className="text-[9px] text-white/30 mt-1">Dec 15, 6:01AM</p>
                </div>

                {/* Market Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Market cap</span>
                    <span className="text-[10px] font-medium text-white">${song.marketCap}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Score (ATH)</span>
                    <span className="text-[10px] font-medium text-white">{song.priceATH}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">ATH Date</span>
                    <span className="text-[10px] text-white/60">{song.athDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Δ 24h</span>
                    <span className={`text-[10px] ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change24h >= 0 ? '+' : ''}{song.change24h}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Δ 7D</span>
                    <span className={`text-[10px] ${song.change7D >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change7D >= 0 ? '+' : ''}{song.change7D}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40">Δ 30D</span>
                    <span className={`text-[10px] ${song.change30D >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change30D >= 0 ? '+' : ''}{song.change30D}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 h-8 text-[10px] bg-[#4ade80] text-black hover:bg-[#4ade80]/90"
                    onClick={() => handleInteraction('add to watchlist')}
                  >
                    <Star className="h-3 w-3 mr-1" /> Watch
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-[10px] border-white/10 text-white hover:bg-white/5"
                    onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }}
                  >
                    <Share2 className="h-3 w-3 mr-1" /> Share
                  </Button>
                </div>

                {/* Sectors */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] text-white/40">Sectors</span>
                  <div className="flex gap-1 mt-2">
                    {song.sectors.map(sector => (
                      <span key={sector} className="px-2 py-1 bg-white/5 rounded text-[9px] text-white/60">{sector}</span>
                    ))}
                  </div>
                </div>

                {/* Links */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <span className="text-[10px] text-white/40">Links</span>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                      <Twitter className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Center - Charts */}
            <div className="lg:col-span-6 space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-white/10">
                {['Charts', 'Voices', 'Similar'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`pb-2 text-xs font-medium transition-colors relative ${
                      activeTab === tab.toLowerCase() ? 'text-white' : 'text-white/40'
                    }`}
                  >
                    {tab}
                    {activeTab === tab.toLowerCase() && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80]" />
                    )}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                  {['24h', '7D', '1M', '3M', 'YTD'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTimeRange(t)}
                      className={`text-[9px] px-2 py-1 rounded-md transition-colors ${
                        timeRange === t ? 'bg-[#4ade80] text-black font-medium' : 'text-white/50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Area */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] text-white/40">Score</p>
                    <p className="text-lg font-bold text-white">{song.price}</p>
                    <p className={`text-[10px] ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      ▼{Math.abs(Number(song.price.replace('$', '')) * 0.0836).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40">Mindshare</p>
                    <p className="text-lg font-bold text-white">{song.mindshare}</p>
                    <p className="text-[10px] text-white/50">▲0</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40">Sentiment</p>
                    <p className={`text-lg font-bold ${song.sentiment >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.sentiment >= 0 ? '+' : ''}{song.sentiment}
                    </p>
                    <p className="text-[10px] text-red-400">▼{Math.abs(song.sentiment)}</p>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="h-48 sm:h-64 bg-white/[0.02] rounded-xl flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full absolute inset-0">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,120 Q50,100 100,110 T200,90 T300,100 T400,60 T500,80 T600,40 T700,70 T800,50"
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2"
                    />
                    <path
                      d="M0,120 Q50,100 100,110 T200,90 T300,100 T400,60 T500,80 T600,40 T700,70 T800,50 L800,200 L0,200 Z"
                      fill="url(#chartGradient)"
                    />
                  </svg>
                  <div className="absolute bottom-4 left-4 flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                      <span className="text-[9px] text-white/50">Sentiment</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-[9px] text-white/50">Mindshare</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[10px] text-white/40 mb-1">24h reach</p>
                  <p className="text-sm font-bold text-white">{song.reach24h}</p>
                  <p className="text-[9px] text-[#4ade80]">▲1778.16%</p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,20 Q10,18 20,15 T40,10 T60,12 T80,5" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                    </svg>
                  </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[10px] text-white/40 mb-1">24h Volume</p>
                  <p className="text-sm font-bold text-white">{song.volume24h}</p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,20 Q20,15 40,18 T80,10" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                    </svg>
                  </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[10px] text-white/40 mb-1">vs Bitcoin</p>
                  <p className={`text-sm font-bold ${song.priceVsBTC >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {song.priceVsBTC >= 0 ? '▲' : '▼'}{Math.abs(song.priceVsBTC)}%
                  </p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,10 Q20,15 40,8 T80,20" fill="none" stroke={song.priceVsBTC >= 0 ? '#4ade80' : '#ef4444'} strokeWidth="1.5" />
                    </svg>
                  </div>
                </Card>
              </div>

              {/* Top Voices */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-white">Top voices</h3>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] text-white/50">
                    View all
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {topVoices.map((voice, i) => (
                    <div key={i} className={`${voice.color}/10 rounded-lg p-2`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{voice.avatar}</span>
                        <span className="text-[10px] font-medium text-white truncate">{voice.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-white/50">{voice.score}</span>
                        <span className={`text-[9px] ${voice.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                          {voice.change >= 0 ? '+' : ''}{voice.change}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Smart Feed */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-medium text-white">Smart Feed</h3>
                  </div>
                  <select className="bg-white/5 border-0 text-[10px] text-white/60 rounded px-2 py-1">
                    <option>Smart Engagement</option>
                    <option>Latest</option>
                  </select>
                </div>
                
                <div className="flex gap-1 mb-4 overflow-x-auto">
                  {['All', 'English', 'Chinese', 'Korean', 'Japanese'].map(lang => (
                    <button
                      key={lang}
                      className={`text-[9px] px-2 py-1 rounded-full whitespace-nowrap ${
                        lang === 'All' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {smartFeed.map((post, i) => (
                    <div key={i} className="pb-4 border-b border-white/5 last:border-0">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white/10" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-medium text-white">{post.user}</span>
                            <span className="text-[9px] text-white/40">{post.handle}</span>
                          </div>
                          <span className="text-[9px] text-white/30">{post.time}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/70 mb-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-[9px] text-white/30">
                        <span>👁 {post.views}</span>
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments}</span>
                        <span>🔄 {post.reposts}</span>
                      </div>
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

export default HeatmapDetail;
