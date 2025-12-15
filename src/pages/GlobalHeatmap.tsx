import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ExternalLink, Filter, Clock,
  Play, Users, ChevronRight, Sparkles, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
interface Song {
  id: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  title: string;
  artist: string;
  artwork: string;
  attentionScore: number;
  momentum: 'surging' | 'cooling' | 'stable';
  change24h: number;
  listeners: string;
  marketCap: string;
  platforms: { name: string; percentage: number }[];
  marketMoves: string[];
  isWatchlisted: boolean;
  twitterHandle?: string;
  description?: string;
}

interface MarketEvent {
  id: number;
  song: Song;
  event: string;
  change: number;
  time: string;
  sources: string[];
}

// Mock data - Top 99 Leaderboard
const mockSongs: Song[] = [
  {
    id: 1, rank: 1, trend: 'up', trendValue: 12, title: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', attentionScore: 98470, momentum: 'surging', change24h: 15.2,
    listeners: '2.4M', marketCap: '41.7M',
    platforms: [{ name: 'Spotify', percentage: 34 }, { name: 'TikTok', percentage: 28 }],
    marketMoves: ['Playlisted', 'UGC Spike'], isWatchlisted: false,
    twitterHandle: '@novaecho', description: 'Breakout synth-pop hit dominating charts globally'
  },
  {
    id: 2, rank: 2, trend: 'up', trendValue: 8, title: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', attentionScore: 89320, momentum: 'surging', change24h: 12.8,
    listeners: '1.8M', marketCap: '35.2M',
    platforms: [{ name: 'Spotify', percentage: 31 }, { name: 'TikTok', percentage: 35 }],
    marketMoves: ['Viral TikTok'], isWatchlisted: true,
    twitterHandle: '@synthwavekid', description: 'Retro-futuristic anthem trending worldwide'
  },
  {
    id: 3, rank: 3, trend: 'down', trendValue: 2, title: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', attentionScore: 76540, momentum: 'cooling', change24h: -3.4,
    listeners: '1.5M', marketCap: '28.9M',
    platforms: [{ name: 'Spotify', percentage: 42 }, { name: 'Radio', percentage: 25 }],
    marketMoves: ['Radio Add'], isWatchlisted: false,
    twitterHandle: '@amberwaves', description: 'Country crossover gaining radio momentum'
  },
  {
    id: 4, rank: 4, trend: 'stable', trendValue: 0, title: 'Neon Nights', artist: 'DJ Pulse',
    artwork: '/src/assets/card-4.png', attentionScore: 65430, momentum: 'stable', change24h: 0.5,
    listeners: '1.2M', marketCap: '22.1M',
    platforms: [{ name: 'Spotify', percentage: 28 }, { name: 'TikTok', percentage: 32 }],
    marketMoves: ['Shazam Spike'], isWatchlisted: false,
    twitterHandle: '@djpulse', description: 'Electronic banger holding steady'
  },
  {
    id: 5, rank: 5, trend: 'up', trendValue: 23, title: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', attentionScore: 59870, momentum: 'surging', change24h: 28.5,
    listeners: '980K', marketCap: '18.4M',
    platforms: [{ name: 'Spotify', percentage: 25 }, { name: 'TikTok', percentage: 42 }],
    marketMoves: ['UGC Spike', 'Viral'], isWatchlisted: true,
    twitterHandle: '@lagossound', description: 'Afrobeats sensation breaking out globally'
  },
  {
    id: 6, rank: 6, trend: 'up', trendValue: 5, title: 'Summer Feels', artist: 'Beach House',
    artwork: '/src/assets/track-1.jpeg', attentionScore: 54320, momentum: 'stable', change24h: 4.2,
    listeners: '890K', marketCap: '15.7M',
    platforms: [{ name: 'Spotify', percentage: 38 }, { name: 'YouTube', percentage: 28 }],
    marketMoves: ['Radio Add'], isWatchlisted: false,
    twitterHandle: '@beachhouseband', description: 'Dreamy indie vibes for summer'
  },
  {
    id: 7, rank: 7, trend: 'down', trendValue: 4, title: 'Tokyo Drift', artist: 'Yuki Beats',
    artwork: '/src/assets/track-2.jpeg', attentionScore: 48900, momentum: 'cooling', change24h: -5.1,
    listeners: '780K', marketCap: '13.2M',
    platforms: [{ name: 'Spotify', percentage: 35 }, { name: 'Apple', percentage: 22 }],
    marketMoves: [], isWatchlisted: false,
    twitterHandle: '@yukibeats', description: 'J-pop influenced electronic track'
  },
  {
    id: 8, rank: 8, trend: 'up', trendValue: 15, title: 'K-Pop Fire', artist: 'Seoul Stars',
    artwork: '/src/assets/track-3.jpeg', attentionScore: 45670, momentum: 'surging', change24h: 18.3,
    listeners: '1.1M', marketCap: '24.5M',
    platforms: [{ name: 'YouTube', percentage: 45 }, { name: 'Spotify', percentage: 28 }],
    marketMoves: ['Music Video', 'Fan Army'], isWatchlisted: false,
    twitterHandle: '@seoulstars', description: 'K-pop group dominating YouTube'
  },
];

const marketEvents: MarketEvent[] = [
  { id: 1, song: mockSongs[0], event: 'Major playlist addition driving massive streams', change: 0.01, time: '36 min ago', sources: ['@spotify', '@apple'] },
  { id: 2, song: mockSongs[1], event: 'Viral TikTok trend challenging streaming records', change: 0, time: '42 min ago', sources: ['@tiktok'] },
  { id: 3, song: mockSongs[4], event: 'Afrobeats crossover gaining radio momentum', change: 0.17, time: '1 hr ago', sources: ['@billboard'] },
  { id: 4, song: mockSongs[7], event: 'Music video breaks 10M views in 24 hours', change: 0.04, time: '2 hrs ago', sources: ['@youtube'] },
];

const timeFilters = ['Now', '24H', '7D', '30D'];

const GlobalHeatmap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('projects');
  const [timeWindow, setTimeWindow] = useState('24H');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 5]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
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
      toast.success(watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist');
    });
  };

  // Good/Bad sentiment songs
  const goodSentiment = mockSongs.filter(s => s.change24h > 0).slice(0, 12);
  const badSentiment = mockSongs.filter(s => s.change24h <= 0).slice(0, 12);

  // Calculate grid sizes based on attention score
  const getGridSize = (score: number, max: number) => {
    const ratio = score / max;
    if (ratio > 0.8) return 'col-span-2 row-span-2';
    if (ratio > 0.5) return 'col-span-2 row-span-1';
    return 'col-span-1 row-span-1';
  };

  const maxScore = Math.max(...mockSongs.map(s => s.attentionScore));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#4ade80] flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-white">Heatmap</span>
            </Link>
          </div>
          
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

        {/* Global Stats Bar */}
        <div className="border-t border-white/5 px-3 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-[10px] sm:text-xs overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">Global sentiment:</span>
            <span className="font-semibold text-white">73/100</span>
            <span className="text-[#4ade80]">▲8.2%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-white/50">Tracks:</span>
            <span className="font-semibold text-white">14.4k</span>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24 sm:pt-28 pb-6 px-3 sm:px-6">
        {/* Campaigns Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-white">🎵 SNAPS campaigns</h2>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#4ade80]/10 rounded-full">
                <span className="text-[10px] text-[#4ade80]">Total plays: 18M</span>
              </div>
            </div>
            <Link to="#" className="text-[10px] sm:text-xs text-white/50 hover:text-white flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {mockSongs.slice(0, 5).map((song) => (
              <div
                key={song.id}
                onClick={() => navigate(`/heatmap/${song.id}`)}
                className="flex-shrink-0 flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all min-w-[180px] sm:min-w-[220px]"
              >
                <img src={song.artwork} alt={song.title} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-white truncate">{song.title}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/50 truncate">{song.twitterHandle}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs font-bold text-[#4ade80]">{song.listeners}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/40">listeners</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 border-b border-white/10 mb-4">
          {['Projects', 'Voices', 'Sectors'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`pb-2 text-[11px] sm:text-xs font-medium transition-colors relative ${
                activeTab === tab.toLowerCase() 
                  ? 'text-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab}
              {activeTab === tab.toLowerCase() && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4ade80]" />
              )}
            </button>
          ))}
        </div>

        {/* Market Events */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-white">Market events</h3>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {timeFilters.map(t => (
                <button
                  key={t}
                  onClick={() => setTimeWindow(t)}
                  className={`text-[9px] sm:text-[10px] px-2 py-1 rounded-md transition-colors ${
                    timeWindow === t ? 'bg-[#4ade80] text-black font-medium' : 'text-white/50 hover:text-white'
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
                onClick={() => navigate(`/heatmap/${event.song.id}`)}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <img src={event.song.artwork} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs font-medium text-white truncate">{event.song.title}</span>
                      <span className={`text-[9px] font-medium ${event.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {event.change >= 0 ? '▲' : '▼'}{Math.abs(event.change).toFixed(2)} (24h)
                      </span>
                    </div>
                    <p className="text-[9px] text-white/40">{event.song.marketCap} cap</p>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-white/70 line-clamp-2 mb-2">{event.event}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {event.sources.map((source, i) => (
                      <div key={i} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px]">
                        {source.charAt(1).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-[9px] text-white/30">{event.time}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Sentiment Treemaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {/* Good Sentiment */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-xs sm:text-sm font-medium text-white">Good sentiment</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[9px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {goodSentiment.map((song, i) => (
                <div
                  key={song.id}
                  onClick={() => navigate(`/heatmap/${song.id}`)}
                  className={`bg-[#4ade80]/20 hover:bg-[#4ade80]/30 rounded-lg p-2 cursor-pointer transition-all ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '80px' : '40px' }}
                >
                  <p className="text-[9px] sm:text-[10px] font-semibold text-white truncate">{song.title.slice(0, 8)}</p>
                  <p className="text-[8px] sm:text-[9px] text-[#4ade80]">+{song.change24h}%</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bad Sentiment */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-xs sm:text-sm font-medium text-white">Bad sentiment</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[9px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {badSentiment.length > 0 ? badSentiment.map((song, i) => (
                <div
                  key={song.id}
                  onClick={() => navigate(`/heatmap/${song.id}`)}
                  className={`bg-red-500/20 hover:bg-red-500/30 rounded-lg p-2 cursor-pointer transition-all ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 4 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '80px' : '40px' }}
                >
                  <p className="text-[9px] sm:text-[10px] font-semibold text-white truncate">{song.title.slice(0, 8)}</p>
                  <p className="text-[8px] sm:text-[9px] text-red-400">{song.change24h}%</p>
                </div>
              )) : (
                <div className="col-span-full text-center py-6 text-white/30 text-xs">No declining tracks</div>
              )}
            </div>
          </div>
        </div>

        {/* Top 99 Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm sm:text-base font-semibold text-white">🏆 Top 99 Music Leaderboard</h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-white/40 sm:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="sm:hidden mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-full bg-white/5 border-white/10 text-xs placeholder:text-white/40 rounded-lg"
              />
            </div>
          </div>
          
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] text-white/40 border-b border-white/5">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Track</div>
            <div className="col-span-2 text-right">Listeners</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-right">24h</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* Leaderboard Items */}
          <div className="space-y-1">
            {mockSongs.map((song) => (
              <div
                key={song.id}
                onClick={() => navigate(`/heatmap/${song.id}`)}
                className="grid grid-cols-12 gap-2 items-center p-2 sm:p-3 bg-white/[0.01] hover:bg-white/[0.04] rounded-lg cursor-pointer transition-all group"
              >
                {/* Rank */}
                <div className="col-span-2 sm:col-span-1 flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-white">{song.rank}</span>
                  {song.trend === 'up' && <TrendingUp className="h-3 w-3 text-[#4ade80]" />}
                  {song.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                </div>

                {/* Track Info */}
                <div className="col-span-6 sm:col-span-4 flex items-center gap-2">
                  <img src={song.artwork} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-white truncate">{song.title}</p>
                    <p className="text-[9px] sm:text-[10px] text-white/40 truncate">{song.artist}</p>
                  </div>
                </div>

                {/* Listeners */}
                <div className="hidden sm:block col-span-2 text-right">
                  <p className="text-xs font-medium text-white">{song.listeners}</p>
                </div>

                {/* Score */}
                <div className="col-span-2 text-right">
                  <p className="text-[10px] sm:text-xs font-bold text-white">{(song.attentionScore / 1000).toFixed(1)}K</p>
                </div>

                {/* 24h Change */}
                <div className="col-span-2 text-right">
                  <span className={`text-[10px] sm:text-xs font-medium ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                    {song.change24h >= 0 ? '+' : ''}{song.change24h}%
                  </span>
                </div>

                {/* Action */}
                <div className="hidden sm:flex col-span-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 ${watchlist.includes(song.id) ? 'text-yellow-400' : 'text-white/20 group-hover:text-white/50'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(song.id);
                    }}
                  >
                    <Star className={`h-3.5 w-3.5 ${watchlist.includes(song.id) ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default GlobalHeatmap;
