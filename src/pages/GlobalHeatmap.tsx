import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, Minus, Play, X,
  ChevronDown, Filter, RotateCcw, Sparkles, Radio, Music2,
  Globe, Zap, Clock, BarChart3, Users, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

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
  sparklineData: number[];
  platforms: { name: string; percentage: number; icon: string }[];
  marketMoves: string[];
  isWatchlisted: boolean;
  topRegions: { name: string; momentum: number }[];
  storyEvents: { time: string; event: string }[];
}

// Mock data
const generateSparkline = () => Array.from({ length: 24 }, () => Math.random() * 100);

const mockSongs: Song[] = [
  {
    id: 1, rank: 1, trend: 'up', trendValue: 12, title: 'Midnight Rush', artist: 'Nova Echo',
    artwork: '/src/assets/card-1.png', attentionScore: 9847, momentum: 'surging',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 34, icon: '🎵' },
      { name: 'TikTok', percentage: 28, icon: '📱' },
      { name: 'YouTube', percentage: 22, icon: '▶️' },
      { name: 'Apple', percentage: 16, icon: '🍎' },
    ],
    marketMoves: ['Playlisted', 'New UGC Spike'],
    isWatchlisted: false,
    topRegions: [
      { name: 'Lagos, NG', momentum: 89 },
      { name: 'London, UK', momentum: 72 },
      { name: 'New York, US', momentum: 68 },
      { name: 'Tokyo, JP', momentum: 54 },
      { name: 'São Paulo, BR', momentum: 51 },
    ],
    storyEvents: [
      { time: '2h ago', event: 'Added to "Today\'s Top Hits" playlist' },
      { time: '6h ago', event: '+132% TikTok uses in 24h' },
      { time: '1d ago', event: 'Radio add in UK' },
    ],
  },
  {
    id: 2, rank: 2, trend: 'up', trendValue: 8, title: 'Electric Dreams', artist: 'Synthwave Kid',
    artwork: '/src/assets/card-2.png', attentionScore: 8932, momentum: 'surging',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 31, icon: '🎵' },
      { name: 'TikTok', percentage: 35, icon: '📱' },
      { name: 'YouTube', percentage: 20, icon: '▶️' },
      { name: 'Apple', percentage: 14, icon: '🍎' },
    ],
    marketMoves: ['Influencer Post', 'Viral TikTok'],
    isWatchlisted: true,
    topRegions: [
      { name: 'Los Angeles, US', momentum: 92 },
      { name: 'Berlin, DE', momentum: 78 },
      { name: 'Seoul, KR', momentum: 65 },
      { name: 'Paris, FR', momentum: 58 },
      { name: 'Sydney, AU', momentum: 45 },
    ],
    storyEvents: [
      { time: '1h ago', event: 'Influencer @musiclover posted dance video' },
      { time: '4h ago', event: 'Trending #1 on TikTok sounds' },
      { time: '12h ago', event: 'Featured on Apple Music editorial' },
    ],
  },
  {
    id: 3, rank: 3, trend: 'down', trendValue: 2, title: 'Golden Hour', artist: 'Amber Waves',
    artwork: '/src/assets/card-3.png', attentionScore: 7654, momentum: 'cooling',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 42, icon: '🎵' },
      { name: 'TikTok', percentage: 18, icon: '📱' },
      { name: 'YouTube', percentage: 25, icon: '▶️' },
      { name: 'Apple', percentage: 15, icon: '🍎' },
    ],
    marketMoves: ['Radio Add'],
    isWatchlisted: false,
    topRegions: [
      { name: 'Nashville, US', momentum: 85 },
      { name: 'Austin, US', momentum: 72 },
      { name: 'Melbourne, AU', momentum: 58 },
      { name: 'Dublin, IE', momentum: 45 },
      { name: 'Toronto, CA', momentum: 42 },
    ],
    storyEvents: [
      { time: '3h ago', event: 'Added to country radio rotation' },
      { time: '1d ago', event: 'Peak attention reached' },
    ],
  },
  {
    id: 4, rank: 4, trend: 'stable', trendValue: 0, title: 'Neon Nights', artist: 'DJ Pulse',
    artwork: '/src/assets/card-4.png', attentionScore: 6543, momentum: 'stable',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 28, icon: '🎵' },
      { name: 'TikTok', percentage: 32, icon: '📱' },
      { name: 'YouTube', percentage: 28, icon: '▶️' },
      { name: 'Apple', percentage: 12, icon: '🍎' },
    ],
    marketMoves: ['Shazam Spike'],
    isWatchlisted: false,
    topRegions: [
      { name: 'Miami, US', momentum: 76 },
      { name: 'Ibiza, ES', momentum: 71 },
      { name: 'Amsterdam, NL', momentum: 64 },
      { name: 'Bangkok, TH', momentum: 52 },
      { name: 'Dubai, AE', momentum: 48 },
    ],
    storyEvents: [
      { time: '5h ago', event: 'Shazam searches up 45%' },
      { time: '2d ago', event: 'Club DJ pickups increasing' },
    ],
  },
  {
    id: 5, rank: 5, trend: 'up', trendValue: 23, title: 'Afro Vibes', artist: 'Lagos Sound',
    artwork: '/src/assets/card-5.png', attentionScore: 5987, momentum: 'surging',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 25, icon: '🎵' },
      { name: 'TikTok', percentage: 42, icon: '📱' },
      { name: 'YouTube', percentage: 20, icon: '▶️' },
      { name: 'Apple', percentage: 13, icon: '🍎' },
    ],
    marketMoves: ['New UGC Spike', 'Playlisted', 'Viral TikTok'],
    isWatchlisted: true,
    topRegions: [
      { name: 'Lagos, NG', momentum: 98 },
      { name: 'Accra, GH', momentum: 89 },
      { name: 'London, UK', momentum: 72 },
      { name: 'Atlanta, US', momentum: 65 },
      { name: 'Paris, FR', momentum: 54 },
    ],
    storyEvents: [
      { time: '30m ago', event: 'Breaking into UK charts' },
      { time: '2h ago', event: '+245% TikTok uses in 24h' },
      { time: '8h ago', event: 'Added to Afrobeats Hits playlist' },
    ],
  },
  {
    id: 6, rank: 6, trend: 'up', trendValue: 5, title: 'Summer Feels', artist: 'Beach House',
    artwork: '/src/assets/track-1.jpeg', attentionScore: 5432, momentum: 'stable',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 38, icon: '🎵' },
      { name: 'TikTok', percentage: 22, icon: '📱' },
      { name: 'YouTube', percentage: 28, icon: '▶️' },
      { name: 'Apple', percentage: 12, icon: '🍎' },
    ],
    marketMoves: ['Radio Add'],
    isWatchlisted: false,
    topRegions: [
      { name: 'Sydney, AU', momentum: 82 },
      { name: 'Cape Town, ZA', momentum: 68 },
      { name: 'Rio, BR', momentum: 62 },
      { name: 'Barcelona, ES', momentum: 55 },
      { name: 'San Diego, US', momentum: 48 },
    ],
    storyEvents: [
      { time: '4h ago', event: 'Summer playlist additions' },
      { time: '1d ago', event: 'Radio rotation in Australia' },
    ],
  },
  {
    id: 7, rank: 7, trend: 'down', trendValue: 4, title: 'Urban Flow', artist: 'Metro Kings',
    artwork: '/src/assets/track-2.jpeg', attentionScore: 4876, momentum: 'cooling',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 30, icon: '🎵' },
      { name: 'TikTok', percentage: 28, icon: '📱' },
      { name: 'YouTube', percentage: 32, icon: '▶️' },
      { name: 'Apple', percentage: 10, icon: '🍎' },
    ],
    marketMoves: [],
    isWatchlisted: false,
    topRegions: [
      { name: 'Atlanta, US', momentum: 72 },
      { name: 'Houston, US', momentum: 65 },
      { name: 'Chicago, US', momentum: 58 },
      { name: 'Detroit, US', momentum: 52 },
      { name: 'Memphis, US', momentum: 45 },
    ],
    storyEvents: [
      { time: '12h ago', event: 'Attention declining from peak' },
    ],
  },
  {
    id: 8, rank: 8, trend: 'up', trendValue: 15, title: 'K-Pop Fire', artist: 'Seoul Stars',
    artwork: '/src/assets/track-3.jpeg', attentionScore: 4521, momentum: 'surging',
    sparklineData: generateSparkline(),
    platforms: [
      { name: 'Spotify', percentage: 22, icon: '🎵' },
      { name: 'TikTok', percentage: 38, icon: '📱' },
      { name: 'YouTube', percentage: 30, icon: '▶️' },
      { name: 'Apple', percentage: 10, icon: '🍎' },
    ],
    marketMoves: ['Influencer Post', 'New UGC Spike'],
    isWatchlisted: false,
    topRegions: [
      { name: 'Seoul, KR', momentum: 95 },
      { name: 'Tokyo, JP', momentum: 88 },
      { name: 'Manila, PH', momentum: 82 },
      { name: 'Jakarta, ID', momentum: 75 },
      { name: 'Los Angeles, US', momentum: 62 },
    ],
    storyEvents: [
      { time: '1h ago', event: 'K-pop fan accounts trending' },
      { time: '3h ago', event: 'Dance challenge going viral' },
    ],
  },
];

const timeWindows = ['Now', '24h', '7d', '30d'];
const marketFocus = ['Global', 'Your Country', 'Emerging Markets', 'Underground', 'Viral TikTok', 'Radio-Driven'];
const sortOptions = ['Attention Score', '24h Change %', 'TikTok Velocity', 'Radio Adds', 'Momentum'];
const modes = ['Fan', 'Creator/Artist', 'Label/Pro'];

// Mini Sparkline Component
const Sparkline = ({ data, color = 'text-green-500' }: { data: number[]; color?: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-px h-6 w-16">
      {data.slice(-12).map((value, i) => (
        <div
          key={i}
          className={`w-1 rounded-t ${color.includes('green') ? 'bg-green-500' : color.includes('red') ? 'bg-red-500' : 'bg-muted-foreground'}`}
          style={{ height: `${((value - min) / range) * 100}%`, minHeight: '2px' }}
        />
      ))}
    </div>
  );
};

// Momentum Badge Component
const MomentumBadge = ({ momentum }: { momentum: 'surging' | 'cooling' | 'stable' }) => {
  const styles = {
    surging: 'bg-green-500/20 text-green-400 border-green-500/30',
    cooling: 'bg-red-500/20 text-red-400 border-red-500/30',
    stable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  
  return (
    <Badge variant="outline" className={`${styles[momentum]} text-[10px] font-medium capitalize`}>
      {momentum}
    </Badge>
  );
};

// Trend Indicator Component
const TrendIndicator = ({ trend, value }: { trend: 'up' | 'down' | 'stable'; value: number }) => {
  if (trend === 'up') {
    return (
      <span className="flex items-center text-green-400 text-xs font-medium">
        <TrendingUp className="h-3 w-3 mr-0.5" />
        +{value}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center text-red-400 text-xs font-medium">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        -{value}
      </span>
    );
  }
  return (
    <span className="flex items-center text-muted-foreground text-xs">
      <Minus className="h-3 w-3 mr-0.5" />
      0
    </span>
  );
};

const GlobalHeatmap = () => {
  const [activeTab, setActiveTab] = useState('live-market');
  const [timeWindow, setTimeWindow] = useState('24h');
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['Global']);
  const [platformMix, setPlatformMix] = useState({
    streaming: 80,
    ugc: 70,
    social: 60,
    shazam: 50,
    radio: 40,
  });
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 5]);
  const [sortBy, setSortBy] = useState('Attention Score');
  const [mode, setMode] = useState('Fan');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(12);
  
  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(prev => (prev >= 60 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const toggleFocus = (focus: string) => {
    setSelectedFocus(prev => 
      prev.includes(focus) 
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
  };
  
  const toggleWatchlist = (id: number) => {
    setWatchlist(prev => 
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };
  
  const filteredSongs = mockSongs.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const watchlistedSongs = mockSongs.filter(song => watchlist.includes(song.id));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between h-14 px-2 sm:px-4">
          {/* Left: Back Button */}
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
            <span className="text-sm">← Back</span>
          </Link>
          
          {/* Center: Tabs */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={activeTab === 'live-market' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('live-market')}
              className={`text-xs ${activeTab === 'live-market' ? 'bg-white/10' : ''}`}
            >
              Live Market
            </Button>
            <Button
              variant={activeTab === 'regions' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('regions')}
              className={`text-xs ${activeTab === 'regions' ? 'bg-white/10' : ''}`}
            >
              Regions
            </Button>
            <Button
              variant={activeTab === 'genres' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('genres')}
              className={`text-xs ${activeTab === 'genres' ? 'bg-white/10' : ''}`}
            >
              Genres & Scenes
            </Button>
            <Button
              variant={activeTab === 'watchlist' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('watchlist')}
              className={`text-xs ${activeTab === 'watchlist' ? 'bg-white/10' : ''}`}
            >
              Watchlist
            </Button>
          </div>
          
          {/* Right: Search & Mode */}
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search songs, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-48 bg-white/5 border-white/10 text-xs"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  {mode}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                {modes.map(m => (
                  <DropdownMenuItem 
                    key={m} 
                    onClick={() => setMode(m)}
                    className="text-xs"
                  >
                    {m}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="flex md:hidden border-t border-white/10 overflow-x-auto">
          {['live-market', 'regions', 'genres', 'watchlist'].map(tab => (
            <Button
              key={tab}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 text-xs rounded-none border-b-2 ${
                activeTab === tab ? 'border-green-400 text-green-400' : 'border-transparent'
              }`}
            >
              {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Button>
          ))}
        </div>
      </header>
      
      <div className="flex pt-14 md:pt-14">
        {/* Left Sidebar - Filters */}
        <aside className={`
          fixed md:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-64 bg-zinc-950 border-r border-white/10 
          overflow-y-auto z-40 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 space-y-6">
            {/* Time Window */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Time Window
              </h3>
              <div className="flex flex-wrap gap-1">
                {timeWindows.map(tw => (
                  <Button
                    key={tw}
                    variant={timeWindow === tw ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setTimeWindow(tw)}
                    className={`text-xs h-7 ${timeWindow === tw ? 'bg-green-500/20 text-green-400' : ''}`}
                  >
                    {tw}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Market Focus */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Market Focus
              </h3>
              <div className="flex flex-wrap gap-1">
                {marketFocus.map(focus => (
                  <Badge
                    key={focus}
                    variant="outline"
                    onClick={() => toggleFocus(focus)}
                    className={`cursor-pointer text-[10px] transition-colors ${
                      selectedFocus.includes(focus) 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {focus}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Platform Mix */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Platform Mix
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'streaming', label: 'Streaming', icon: Music2 },
                  { key: 'ugc', label: 'UGC & TikTok', icon: Sparkles },
                  { key: 'social', label: 'Social Buzz', icon: Users },
                  { key: 'shazam', label: 'Shazam & Search', icon: Search },
                  { key: 'radio', label: 'Radio', icon: Radio },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                      <span className="text-green-400">{platformMix[key as keyof typeof platformMix]}%</span>
                    </div>
                    <Slider
                      value={[platformMix[key as keyof typeof platformMix]]}
                      onValueChange={([v]) => setPlatformMix(prev => ({ ...prev, [key]: v }))}
                      max={100}
                      step={5}
                      className="h-1"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Your Segments */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Your Segments</h3>
              <div className="space-y-1">
                {['Afrobeats Lagos', 'Alt-pop Gen Z US', 'K-Pop Global'].map(seg => (
                  <div 
                    key={seg}
                    className="flex items-center justify-between p-2 bg-white/5 rounded text-xs hover:bg-white/10 cursor-pointer"
                  >
                    <span>{seg}</span>
                    <X className="h-3 w-3 text-muted-foreground hover:text-white" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
        
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-x-hidden">
          {activeTab === 'live-market' && (
            <div className="p-4">
              {/* Header */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="h-6 w-6 text-green-400" />
                  Live Attention Market
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {selectedFocus.join(' · ')} · All Platforms · {timeWindow} Momentum
                  </span>
                  <span className="flex items-center text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-1" />
                    Updated {lastUpdated}s ago
                  </span>
                </div>
              </div>
              
              {/* Sort & Controls */}
              <div className="flex items-center justify-between mb-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs bg-transparent border-white/10">
                      Sort: {sortBy}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-900 border-white/10">
                    {sortOptions.map(opt => (
                      <DropdownMenuItem 
                        key={opt} 
                        onClick={() => setSortBy(opt)}
                        className="text-xs"
                      >
                        {opt}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    setSelectedFocus(['Global']);
                    setTimeWindow('24h');
                  }}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Filters
                </Button>
              </div>
              
              {/* Song List */}
              <div className="space-y-2">
                {filteredSongs.length === 0 ? (
                  <Card className="p-8 bg-zinc-900/50 border-white/10 text-center">
                    <p className="text-muted-foreground mb-2">No visible waves here yet.</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedFocus(['Global']);
                      }}
                      className="text-xs"
                    >
                      Reset Filters
                    </Button>
                  </Card>
                ) : (
                  filteredSongs.map(song => (
                    <Card 
                      key={song.id}
                      onClick={() => setSelectedSong(song)}
                      className="p-3 bg-zinc-900/50 border-white/10 hover:bg-zinc-800/50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="w-10 text-center">
                          <div className="text-lg font-bold text-white">#{song.rank}</div>
                          <TrendIndicator trend={song.trend} value={song.trendValue} />
                        </div>
                        
                        {/* Artwork */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <img 
                            src={song.artwork} 
                            alt={song.title}
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded">
                            <Play className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        
                        {/* Title & Artist */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{song.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        
                        {/* Attention Score & Sparkline */}
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-400">{song.attentionScore.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">Attention</div>
                          </div>
                          <Sparkline 
                            data={song.sparklineData} 
                            color={song.momentum === 'surging' ? 'text-green-500' : song.momentum === 'cooling' ? 'text-red-500' : 'text-yellow-500'}
                          />
                        </div>
                        
                        {/* Momentum */}
                        <div className="hidden md:block">
                          <MomentumBadge momentum={song.momentum} />
                        </div>
                        
                        {/* Platform Bars */}
                        <div className="hidden lg:flex items-center gap-1">
                          {song.platforms.slice(0, 4).map(p => (
                            <div key={p.name} className="text-center" title={`${p.name}: ${p.percentage}%`}>
                              <div className="text-[10px]">{p.icon}</div>
                              <div className="w-5 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500" 
                                  style={{ width: `${p.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Market Moves */}
                        <div className="hidden xl:flex flex-wrap gap-1 max-w-32">
                          {song.marketMoves.slice(0, 2).map(move => (
                            <Badge 
                              key={move} 
                              variant="outline" 
                              className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/30"
                            >
                              {move}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Watchlist */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(song.id);
                          }}
                          className={`h-8 w-8 ${watchlist.includes(song.id) ? 'text-yellow-400' : 'text-muted-foreground'}`}
                        >
                          <Star className={`h-4 w-4 ${watchlist.includes(song.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'watchlist' && (
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-400" />
                Your Watchlist
              </h1>
              
              <Tabs defaultValue="songs">
                <TabsList className="bg-white/5 mb-4">
                  <TabsTrigger value="songs" className="text-xs">Songs</TabsTrigger>
                  <TabsTrigger value="segments" className="text-xs">Segments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="songs">
                  {watchlistedSongs.length === 0 ? (
                    <Card className="p-8 bg-zinc-900/50 border-white/10 text-center">
                      <Star className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No songs in your watchlist yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">Click the star icon on any song to add it.</p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {watchlistedSongs.map(song => (
                        <Card 
                          key={song.id}
                          onClick={() => setSelectedSong(song)}
                          className="p-3 bg-zinc-900/50 border-white/10 hover:bg-zinc-800/50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 text-center">
                              <div className="text-lg font-bold">#{song.rank}</div>
                              <TrendIndicator trend={song.trend} value={song.trendValue} />
                            </div>
                            <img src={song.artwork} alt={song.title} className="w-12 h-12 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{song.title}</h3>
                              <p className="text-xs text-muted-foreground">{song.artist}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-400">{song.attentionScore.toLocaleString()}</div>
                            </div>
                            <MomentumBadge momentum={song.momentum} />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWatchlist(song.id);
                              }}
                              className="text-yellow-400"
                            >
                              <Star className="h-4 w-4 fill-current" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="segments">
                  <div className="grid gap-3 md:grid-cols-2">
                    {['Afrobeats Lagos', 'Alt-pop Gen Z US', 'K-Pop Global'].map(seg => (
                      <Card key={seg} className="p-4 bg-zinc-900/50 border-white/10">
                        <h3 className="font-semibold mb-2">{seg}</h3>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Top song vs last week</span>
                          <span className="text-green-400">+24%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Songs surging</span>
                          <Badge className="bg-green-500/20 text-green-400 text-[10px]">12 surging</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {activeTab === 'regions' && (
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Globe className="h-6 w-6 text-blue-400" />
                Regions
              </h1>
              <Card className="p-8 bg-zinc-900/50 border-white/10 text-center">
                <p className="text-muted-foreground">Regional heatmap visualization coming soon.</p>
              </Card>
            </div>
          )}
          
          {activeTab === 'genres' && (
            <div className="p-4">
              <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Music2 className="h-6 w-6 text-purple-400" />
                Genres & Scenes
              </h1>
              <Card className="p-8 bg-zinc-900/50 border-white/10 text-center">
                <p className="text-muted-foreground">Genre analysis dashboard coming soon.</p>
              </Card>
            </div>
          )}
        </main>
      </div>
      
      {/* Song Detail Drawer */}
      <Sheet open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-zinc-950 border-white/10 overflow-y-auto">
          {selectedSong && (
            <>
              <SheetHeader className="text-left">
                <div className="flex items-start gap-4">
                  <img 
                    src={selectedSong.artwork} 
                    alt={selectedSong.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <SheetTitle className="text-xl text-white">{selectedSong.title}</SheetTitle>
                    <p className="text-muted-foreground">{selectedSong.artist}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-green-500/20 text-green-400">#{selectedSong.rank}</Badge>
                      <MomentumBadge momentum={selectedSong.momentum} />
                    </div>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Big Score */}
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg">
                  <div className="text-4xl font-bold text-green-400">{selectedSong.attentionScore.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Attention Score · Top 0.3% globally</div>
                </div>
                
                {/* Chart */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Attention Over Time</h3>
                  <div className="h-32 bg-zinc-900/50 rounded-lg flex items-end justify-around p-2">
                    {selectedSong.sparklineData.map((val, i) => (
                      <div
                        key={i}
                        className="w-2 bg-green-500 rounded-t"
                        style={{ height: `${(val / 100) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Top Regions */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Top Regions</h3>
                  <div className="space-y-2">
                    {selectedSong.topRegions.map(region => (
                      <div key={region.name} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-28 truncate">{region.name}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full" 
                            style={{ width: `${region.momentum}%` }}
                          />
                        </div>
                        <span className="text-xs text-green-400 w-8">{region.momentum}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Platform Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Platform Breakdown</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedSong.platforms.map(p => (
                      <div key={p.name} className="flex items-center gap-2 p-2 bg-zinc-900/50 rounded">
                        <span className="text-lg">{p.icon}</span>
                        <div className="flex-1">
                          <div className="text-xs">{p.name}</div>
                          <div className="text-xs text-green-400">{p.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Story */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    {selectedSong.storyEvents.map((event, i) => (
                      <div key={i} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground w-16 flex-shrink-0">{event.time}</span>
                        <span>{event.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Button 
                    variant="outline" 
                    className="flex-1 bg-transparent border-white/20"
                    onClick={() => toggleWatchlist(selectedSong.id)}
                  >
                    <Star className={`h-4 w-4 mr-2 ${watchlist.includes(selectedSong.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {watchlist.includes(selectedSong.id) ? 'Watching' : 'Add to Watchlist'}
                  </Button>
                  <Button variant="outline" className="bg-transparent border-white/20">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {mode === 'Label/Pro' && (
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Track this Record
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GlobalHeatmap;
