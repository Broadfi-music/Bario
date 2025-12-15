import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play,
  Users, Clock, Zap, ChevronDown, Copy, Music, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Generate 99 mock songs
const generateMockSongs = () => {
  const baseSongs = [
    { title: 'Midnight Rush', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', twitterHandle: '@novaecho', description: 'Breakout synth-pop hit dominating charts globally. High energy production with viral hooks.' },
    { title: 'Electric Dreams', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', twitterHandle: '@synthwavekid', description: 'Retro-futuristic anthem trending worldwide on TikTok with dance challenges.' },
    { title: 'Golden Hour', artist: 'Amber Waves', artwork: '/src/assets/card-3.png', twitterHandle: '@amberwaves', description: 'Country crossover gaining radio momentum with heartfelt lyrics.' },
    { title: 'Neon Nights', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', twitterHandle: '@djpulse', description: 'Electronic banger holding steady on club charts.' },
    { title: 'Afro Vibes', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', twitterHandle: '@lagossound', description: 'Afrobeats sensation breaking out globally with infectious rhythm.' },
  ];
  
  const artworks = [
    '/src/assets/card-1.png', '/src/assets/card-2.png', '/src/assets/card-3.png',
    '/src/assets/card-4.png', '/src/assets/card-5.png', '/src/assets/track-1.jpeg',
    '/src/assets/track-2.jpeg', '/src/assets/track-3.jpeg'
  ];

  return Array.from({ length: 99 }, (_, i) => {
    const base = baseSongs[i % baseSongs.length];
    return {
      id: i + 1, rank: i + 1, trend: 'up' as const, trendValue: 12, 
      title: i < 5 ? base.title : `Track ${i + 1}`, 
      artist: i < 5 ? base.artist : `Artist ${i + 1}`,
      artwork: artworks[i % artworks.length], 
      attentionScore: 98470 - (i * 500), momentum: 'surging' as const, 
      change24h: 15.2 - (i * 0.1),
      listeners: `${(2.4 - (i * 0.02)).toFixed(1)}M`, 
      mindshare: '0%', 
      reach24h: '113.78K', volume24h: '$3.63M',
      twitterHandle: i < 5 ? base.twitterHandle : `@artist${i + 1}`, 
      description: i < 5 ? base.description : `Trending track with amazing production and viral potential.`,
      platforms: [{ name: 'Spotify', percentage: 34 }, { name: 'TikTok', percentage: 28 }, { name: 'YouTube', percentage: 22 }],
      latestBuzz: 'Major playlist addition driving massive streams, TikTok trend gaining momentum',
      change7D: -8.48 + (Math.random() * 20), change30D: -15.08 + (Math.random() * 30),
    };
  });
};

const mockSongs = generateMockSongs();

const topVoices = Array.from({ length: 50 }, (_, i) => ({
  name: ['Sanera', 'Princ3', 'MickEy M', 'DefiBoss', 'Calvin', 'Crypto Aman', 'BeatMaster', 'ChartKing'][i % 8] + (i > 7 ? ` ${i}` : ''),
  avatar: ['🎵', '🎸', '🎹', '🎤', '🎧', '🎺', '🎷', '🥁'][i % 8],
  score: 49.11 - (i * 0.5),
  change: Math.random() > 0.3 ? Math.random() * 200 : -(Math.random() * 50),
  color: Math.random() > 0.3 ? 'bg-[#4ade80]' : 'bg-red-500'
}));

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
  const [showAllVoices, setShowAllVoices] = useState(false);
  
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
          <button onClick={() => navigate('/global-heatmap')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
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
              {/* Song Header */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <img src={song.artwork} alt={song.title} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h1 className="text-sm sm:text-base font-bold text-white truncate">{song.title}</h1>
                    <p className="text-[10px] text-white/50">{song.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-white/40">{song.twitterHandle}</span>
                      <ExternalLink className="h-3 w-3 text-white/40" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/60 mb-4">{song.description}</p>
                
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
                
                {/* Community Listeners */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-white/50">Community listeners</span>
                    <span className="text-[9px] text-white/40">{song.listeners} total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4ade80] rounded-full" style={{ width: '87%' }} />
                    </div>
                    <span className="text-[9px] text-[#4ade80]">87.1%</span>
                    <span className="text-[9px] text-red-400">12.9%</span>
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
                    <span className="text-[9px] text-white/50">Latest buzz</span>
                  </div>
                  <p className="text-[9px] text-white/70">{song.latestBuzz}</p>
                  <p className="text-[8px] text-white/30 mt-1">Dec 15, 6:01AM</p>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Listeners</span>
                    <span className="text-[9px] font-medium text-white">{song.listeners}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 24h</span>
                    <span className={`text-[9px] ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change24h >= 0 ? '+' : ''}{song.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 7D</span>
                    <span className={`text-[9px] ${song.change7D >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change7D >= 0 ? '+' : ''}{song.change7D.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 30D</span>
                    <span className={`text-[9px] ${song.change30D >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change30D >= 0 ? '+' : ''}{song.change30D.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 h-8 text-[9px] bg-[#4ade80] text-black hover:bg-[#4ade80]/90"
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

            {/* Center - Charts */}
            <div className="lg:col-span-6 space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-white/10">
                {['Charts'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`pb-2 text-[10px] font-medium transition-colors relative ${
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
                      className={`text-[8px] px-2 py-1 rounded-md transition-colors ${
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
                    <p className="text-[9px] text-white/40">Listeners</p>
                    <p className="text-base font-bold text-white">{song.listeners}</p>
                    <p className={`text-[9px] ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change24h >= 0 ? '▲' : '▼'}{Math.abs(song.change24h).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40">Mindshare</p>
                    <p className="text-base font-bold text-white">{song.mindshare}</p>
                    <p className="text-[9px] text-white/50">▲0</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40">Listeners</p>
                    <p className="text-base font-bold text-[#4ade80]">{song.listeners}</p>
                    <p className="text-[9px] text-[#4ade80]">▲ realtime</p>
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
                      <span className="text-[8px] text-white/50">Listeners</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-[8px] text-white/50">Mindshare</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[9px] text-white/40 mb-1">24h reach</p>
                  <p className="text-sm font-bold text-white">{song.reach24h}</p>
                  <p className="text-[8px] text-[#4ade80]">▲ realtime</p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,20 Q10,18 20,15 T40,10 T60,12 T80,5" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                    </svg>
                  </div>
                </Card>
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[9px] text-white/40 mb-1">24h Volume</p>
                  <p className="text-sm font-bold text-white">{song.volume24h}</p>
                  <p className="text-[8px] text-[#4ade80]">▲ realtime</p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,20 Q20,15 40,18 T80,10" fill="none" stroke="#4ade80" strokeWidth="1.5" />
                    </svg>
                  </div>
                </Card>
              </div>

              {/* Top Voices */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-medium text-white">Top Voices</h3>
                  <button 
                    onClick={() => setShowAllVoices(!showAllVoices)}
                    className="text-[9px] text-white/50 hover:text-white flex items-center gap-1"
                  >
                    {showAllVoices ? 'Show less' : 'View all 50'} <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(showAllVoices ? topVoices : topVoices.slice(0, 6)).map((voice, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white/[0.02] rounded-lg">
                      <span className="text-[8px] text-white/40 w-4">{i + 1}</span>
                      <span className="text-base">{voice.avatar}</span>
                      <span className="text-[9px] font-medium text-white flex-1 truncate">{voice.name}</span>
                      <span className="text-[9px] font-medium text-white">{voice.score.toFixed(2)}</span>
                      <span className={`text-[8px] ${voice.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {voice.change >= 0 ? '+' : ''}{voice.change.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Smart Feed */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-3">Smart Feed</h3>
                <div className="space-y-3">
                  {smartFeed.map((post, i) => (
                    <div key={i} className="p-3 bg-white/[0.02] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/10" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-medium text-white">{post.user}</span>
                          <span className="text-[8px] text-white/40 ml-1">{post.handle}</span>
                        </div>
                        <span className="text-[8px] text-white/30">{post.time}</span>
                      </div>
                      <p className="text-[9px] text-white/70 mb-2">{post.content}</p>
                      <div className="flex items-center gap-3 text-[8px] text-white/40">
                        <span>{post.views} views</span>
                        <span>{post.likes} likes</span>
                        <span>{post.comments} comments</span>
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
