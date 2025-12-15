import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, Minus, X,
  ChevronDown, Filter, Zap, Clock, ArrowUpRight, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  platforms: { name: string; percentage: number }[];
  marketMoves: string[];
  isWatchlisted: boolean;
}

// Mock data
const mockSongs: Song[] = [
  {
    id: 1, rank: 1, trend: 'up', trendValue: 12, title: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', attentionScore: 9847, momentum: 'surging', change24h: 15.2,
    platforms: [
      { name: 'Spotify', percentage: 34 },
      { name: 'TikTok', percentage: 28 },
      { name: 'YouTube', percentage: 22 },
      { name: 'Apple', percentage: 16 },
    ],
    marketMoves: ['Playlisted', 'UGC Spike'],
    isWatchlisted: false,
  },
  {
    id: 2, rank: 2, trend: 'up', trendValue: 8, title: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', attentionScore: 8932, momentum: 'surging', change24h: 12.8,
    platforms: [
      { name: 'Spotify', percentage: 31 },
      { name: 'TikTok', percentage: 35 },
      { name: 'YouTube', percentage: 20 },
      { name: 'Apple', percentage: 14 },
    ],
    marketMoves: ['Viral TikTok'],
    isWatchlisted: true,
  },
  {
    id: 3, rank: 3, trend: 'down', trendValue: 2, title: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', attentionScore: 7654, momentum: 'cooling', change24h: -3.4,
    platforms: [
      { name: 'Spotify', percentage: 42 },
      { name: 'TikTok', percentage: 18 },
      { name: 'YouTube', percentage: 25 },
      { name: 'Apple', percentage: 15 },
    ],
    marketMoves: ['Radio Add'],
    isWatchlisted: false,
  },
  {
    id: 4, rank: 4, trend: 'stable', trendValue: 0, title: 'Neon Nights', artist: 'DJ Pulse',
    artwork: '/src/assets/card-4.png', attentionScore: 6543, momentum: 'stable', change24h: 0.5,
    platforms: [
      { name: 'Spotify', percentage: 28 },
      { name: 'TikTok', percentage: 32 },
      { name: 'YouTube', percentage: 28 },
      { name: 'Apple', percentage: 12 },
    ],
    marketMoves: ['Shazam Spike'],
    isWatchlisted: false,
  },
  {
    id: 5, rank: 5, trend: 'up', trendValue: 23, title: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', attentionScore: 5987, momentum: 'surging', change24h: 28.5,
    platforms: [
      { name: 'Spotify', percentage: 25 },
      { name: 'TikTok', percentage: 42 },
      { name: 'YouTube', percentage: 20 },
      { name: 'Apple', percentage: 13 },
    ],
    marketMoves: ['UGC Spike', 'Playlisted', 'Viral'],
    isWatchlisted: true,
  },
  {
    id: 6, rank: 6, trend: 'up', trendValue: 5, title: 'Summer Feels', artist: 'Beach House',
    artwork: '/src/assets/track-1.jpeg', attentionScore: 5432, momentum: 'stable', change24h: 4.2,
    platforms: [
      { name: 'Spotify', percentage: 38 },
      { name: 'TikTok', percentage: 22 },
      { name: 'YouTube', percentage: 28 },
      { name: 'Apple', percentage: 12 },
    ],
    marketMoves: ['Radio Add'],
    isWatchlisted: false,
  },
];

const timeFilters = ['Now', '24h', '7d', '30d'];
const marketFilters = ['Global', 'Emerging', 'Viral', 'Radio'];

const GlobalHeatmap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live-market');
  const [timeWindow, setTimeWindow] = useState('24h');
  const [marketFocus, setMarketFocus] = useState('Global');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 5]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(12);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(prev => (prev >= 60 ? 0 : prev + 1));
    }, 1000);
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

  const toggleWatchlist = (id: number) => {
    handleInteraction('add to watchlist', () => {
      setWatchlist(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      toast.success(watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist');
    });
  };
  
  const filteredSongs = mockSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const watchlistedSongs = mockSongs.filter(song => watchlist.includes(song.id));

  const MomentumBadge = ({ momentum }: { momentum: 'surging' | 'cooling' | 'stable' }) => {
    const styles = {
      surging: 'bg-[#4ade80]/20 text-[#4ade80]',
      cooling: 'bg-red-500/20 text-red-400',
      stable: 'bg-yellow-500/20 text-yellow-400',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium capitalize ${styles[momentum]}`}>
        {momentum}
      </span>
    );
  };

  const TrendIndicator = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value: number }) => {
    if (trend === 'up') {
      return (
        <span className="flex items-center text-[#4ade80] text-[10px] sm:text-xs font-medium">
          <TrendingUp className="h-3 w-3 mr-0.5" />
          +{value}
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="flex items-center text-red-400 text-[10px] sm:text-xs font-medium">
          <TrendingDown className="h-3 w-3 mr-0.5" />
          -{value}
        </span>
      );
    }
    return (
      <span className="flex items-center text-white/50 text-[10px] sm:text-xs">
        <Minus className="h-3 w-3 mr-0.5" />0
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-4">
          <Link to="/" className="text-base sm:text-lg font-bold text-white">
            BARIO
          </Link>
          
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
                <Button size="sm" className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-full">
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
        
        {/* Sub Header - Stats & Tabs */}
        <div className="border-t border-white/5 px-3 sm:px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div>
                <span className="text-white/50 text-[10px] sm:text-xs">Global sentiment</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm sm:text-lg font-bold text-white">73/100</span>
                  <span className="text-[#4ade80] text-[10px] sm:text-xs">▲8.2%</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="text-white/50 text-xs">Tracks</span>
                <div className="text-lg font-bold text-white">12.4k</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {['live-market', 'watchlist'].map(tab => (
                <Button
                  key={tab}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (tab === 'watchlist' && !user) {
                      toast.error('Please sign in to view watchlist');
                      navigate('/auth');
                      return;
                    }
                    setActiveTab(tab);
                  }}
                  className={`text-[10px] sm:text-xs h-7 px-2 sm:px-3 rounded-full ${
                    activeTab === tab ? 'bg-white/10 text-white' : 'text-white/60'
                  }`}
                >
                  {tab === 'live-market' ? 'Live Market' : 'Watchlist'}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Filters Row */}
        <div className={`border-t border-white/5 px-3 sm:px-4 py-2 overflow-x-auto ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="flex items-center gap-2 min-w-max">
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
              {timeFilters.map(t => (
                <Button
                  key={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeWindow(t)}
                  className={`text-[10px] h-6 px-2 rounded-full ${
                    timeWindow === t ? 'bg-white/10 text-white' : 'text-white/50'
                  }`}
                >
                  {t}
                </Button>
              ))}
            </div>
            
            <div className="w-px h-4 bg-white/10" />
            
            <div className="flex items-center gap-1">
              {marketFilters.map(m => (
                <Button
                  key={m}
                  variant="ghost"
                  size="sm"
                  onClick={() => setMarketFocus(m)}
                  className={`text-[10px] h-6 px-2 rounded-full ${
                    marketFocus === m ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white/50'
                  }`}
                >
                  {m}
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
              placeholder="Search songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 w-full bg-white/5 border-white/10 text-xs placeholder:text-white/40"
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-[180px] sm:pt-[160px] pb-6 px-3 sm:px-4">
        {/* Live Update Indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
            <span className="text-[10px] sm:text-xs text-white/50">Updated {lastUpdated}s ago</span>
          </div>
        </div>

        {activeTab === 'live-market' ? (
          <div className="space-y-2">
            {filteredSongs.map((song) => (
              <Card
                key={song.id}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 transition-all cursor-pointer group"
                onClick={() => setSelectedSong(song)}
              >
                <div className="p-2 sm:p-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Rank */}
                    <div className="flex flex-col items-center w-6 sm:w-8">
                      <span className="text-sm sm:text-lg font-bold text-white">{song.rank}</span>
                      <TrendIndicator trend={song.trend} value={song.trendValue} />
                    </div>
                    
                    {/* Artwork */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                      <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate">{song.title}</h3>
                        <MomentumBadge momentum={song.momentum} />
                      </div>
                      <p className="text-white/50 text-[10px] sm:text-xs truncate">{song.artist}</p>
                      
                      {/* Market Moves */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {song.marketMoves.slice(0, 2).map((move, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] sm:text-[9px] text-white/60">
                            {move}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Score & Actions */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-right">
                        <div className="text-sm sm:text-lg font-bold text-white">{song.attentionScore.toLocaleString()}</div>
                        <div className={`text-[10px] sm:text-xs ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                          {song.change24h >= 0 ? '+' : ''}{song.change24h}%
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 ${watchlist.includes(song.id) ? 'text-yellow-400' : 'text-white/30'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(song.id);
                        }}
                      >
                        <Star className={`h-3.5 w-3.5 ${watchlist.includes(song.id) ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {watchlistedSongs.length === 0 ? (
              <Card className="bg-white/[0.02] border-white/5 p-8 text-center">
                <Star className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/50 text-sm">No songs in your watchlist yet</p>
                <p className="text-white/30 text-xs mt-1">Add songs to track their performance</p>
              </Card>
            ) : (
              watchlistedSongs.map((song) => (
                <Card
                  key={song.id}
                  className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 transition-all cursor-pointer"
                  onClick={() => setSelectedSong(song)}
                >
                  <div className="p-2 sm:p-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={song.artwork} alt={song.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-xs sm:text-sm truncate">{song.title}</h3>
                        <p className="text-white/50 text-[10px] sm:text-xs">{song.artist}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{song.attentionScore.toLocaleString()}</div>
                        <MomentumBadge momentum={song.momentum} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* Song Detail Sheet */}
      <Sheet open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <SheetContent className="bg-zinc-950 border-white/10 w-full sm:max-w-md overflow-y-auto">
          {selectedSong && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedSong.artwork} alt={selectedSong.title} className="w-16 h-16 rounded-lg" />
                  <div>
                    <SheetTitle className="text-white text-base">{selectedSong.title}</SheetTitle>
                    <p className="text-white/60 text-sm">{selectedSong.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <MomentumBadge momentum={selectedSong.momentum} />
                      <span className="text-white/40 text-xs">Rank #{selectedSong.rank}</span>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="space-y-4">
                {/* Score */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white">{selectedSong.attentionScore.toLocaleString()}</div>
                    <div className="text-white/50 text-xs mt-1">Attention Score</div>
                    <div className={`text-sm mt-2 ${selectedSong.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {selectedSong.change24h >= 0 ? '↑' : '↓'} {Math.abs(selectedSong.change24h)}% in 24h
                    </div>
                  </div>
                </div>
                
                {/* Platform Breakdown */}
                <div>
                  <h4 className="text-white/60 text-xs font-medium mb-2">Platform Mix</h4>
                  <div className="space-y-2">
                    {selectedSong.platforms.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-white/80 text-xs w-16">{p.name}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#4ade80] rounded-full"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                        <span className="text-white/60 text-xs w-8">{p.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-[#4ade80] text-black hover:bg-[#4ade80]/90 h-10"
                    onClick={() => {
                      handleInteraction('share this track', () => {
                        toast.success('Link copied to clipboard');
                      });
                    }}
                  >
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 border-white/10 text-white hover:bg-white/10 h-10"
                    onClick={() => toggleWatchlist(selectedSong.id)}
                  >
                    <Star className={`h-4 w-4 mr-2 ${watchlist.includes(selectedSong.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {watchlist.includes(selectedSong.id) ? 'Saved' : 'Watchlist'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      
      {/* User Profile Badge (if logged in) */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40">
          <Link to="/dashboard">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 border border-white/10 hover:bg-white/15 transition-colors">
              <Avatar className="h-6 w-6">
                <AvatarImage src="/src/assets/track-1.jpeg" />
                <AvatarFallback className="bg-[#4ade80] text-black text-xs">
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

export default GlobalHeatmap;