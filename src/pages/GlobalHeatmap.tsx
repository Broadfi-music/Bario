import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ExternalLink, Filter, Clock,
  Play, Users, ChevronRight, Sparkles, Zap, ChevronLeft
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

// Generate 99 mock songs
const generateMockSongs = (): Song[] => {
  const baseSongs = [
    { title: 'Midnight Rush', artist: 'Nova Echo', artwork: '/src/assets/card-1.png', twitterHandle: '@novaecho', description: 'Breakout synth-pop hit dominating charts globally' },
    { title: 'Electric Dreams', artist: 'Synthwave Kid', artwork: '/src/assets/card-2.png', twitterHandle: '@synthwavekid', description: 'Retro-futuristic anthem trending worldwide' },
    { title: 'Golden Hour', artist: 'Amber Waves', artwork: '/src/assets/card-3.png', twitterHandle: '@amberwaves', description: 'Country crossover gaining radio momentum' },
    { title: 'Neon Nights', artist: 'DJ Pulse', artwork: '/src/assets/card-4.png', twitterHandle: '@djpulse', description: 'Electronic banger holding steady' },
    { title: 'Afro Vibes', artist: 'Lagos Sound', artwork: '/src/assets/card-5.png', twitterHandle: '@lagossound', description: 'Afrobeats sensation breaking out globally' },
    { title: 'Summer Feels', artist: 'Beach House', artwork: '/src/assets/track-1.jpeg', twitterHandle: '@beachhouseband', description: 'Dreamy indie vibes for summer' },
    { title: 'Tokyo Drift', artist: 'Yuki Beats', artwork: '/src/assets/track-2.jpeg', twitterHandle: '@yukibeats', description: 'J-pop influenced electronic track' },
    { title: 'K-Pop Fire', artist: 'Seoul Stars', artwork: '/src/assets/track-3.jpeg', twitterHandle: '@seoulstars', description: 'K-pop group dominating YouTube' },
  ];
  
  const additionalTitles = [
    'Moonlight Sonata', 'Urban Dreams', 'Desert Storm', 'Ocean Waves', 'Mountain High',
    'City Lights', 'Starlight', 'Thunder Road', 'Crystal Clear', 'Velvet Sky',
    'Neon Love', 'Dark Paradise', 'Wild Heart', 'Silver Lining', 'Golden Days',
    'Midnight Sun', 'Blue Monday', 'Red Alert', 'Green Light', 'Purple Rain',
    'Diamond Eyes', 'Fire & Ice', 'Sweet Escape', 'Lost in Time', 'Future Shock',
    'Rhythm Nation', 'Soul Train', 'Dance Floor', 'Beat Drop', 'Bass Line',
    'Melody Maker', 'Harmony', 'Symphony', 'Crescendo', 'Tempo',
    'Groove Machine', 'Funk Master', 'Jazz Hands', 'Blues Brother', 'Rock Solid',
    'Pop Culture', 'Hip Hop Hero', 'R&B Smooth', 'Country Road', 'Folk Tale',
    'Indie Spirit', 'Alt Rock', 'Metal Head', 'Punk Rock', 'EDM Life',
    'House Music', 'Techno Beat', 'Trance State', 'Dubstep Drop', 'Drum & Bass',
    'Reggae Vibes', 'Latin Heat', 'Salsa Night', 'Bachata Love', 'Cumbia Flow',
    'Afrobeat King', 'Amapiano Queen', 'Gqom Master', 'Kwaito Style', 'Highlife',
    'Dancehall', 'Soca Party', 'Calypso Sun', 'Zouk Love', 'Kompa Direct',
    'Bollywood Beat', 'Bhangra Blast', 'Qawwali Soul', 'Sufi Spirit', 'Raag Raga',
    'J-Pop Star', 'K-Pop Dream', 'C-Pop Rising', 'V-Pop Wave', 'Thai Pop',
    'Arabic Nights', 'Turkish Delight', 'Persian Dream', 'Israeli Beat', 'African Sun',
    'Caribbean Wave', 'Island Time', 'Beach Vibes', 'Sunset Drive', 'Night Owl'
  ];
  
  const artists = [
    'Nova Echo', 'Synthwave Kid', 'Amber Waves', 'DJ Pulse', 'Lagos Sound',
    'Beach House', 'Yuki Beats', 'Seoul Stars', 'Midnight Crew', 'Electric Soul',
    'Urban Legend', 'Crystal Method', 'Velvet Touch', 'Diamond Girl', 'Golden Boy',
    'Silver Star', 'Bronze Age', 'Platinum Plus', 'Titanium', 'Carbon Copy',
    'Neon Tiger', 'Digital Love', 'Analog Dream', 'Virtual Reality', 'Cyber Punk'
  ];

  const songs: Song[] = [];
  const artworks = [
    '/src/assets/card-1.png', '/src/assets/card-2.png', '/src/assets/card-3.png',
    '/src/assets/card-4.png', '/src/assets/card-5.png', '/src/assets/track-1.jpeg',
    '/src/assets/track-2.jpeg', '/src/assets/track-3.jpeg', '/src/assets/track-4.jpeg',
    '/src/assets/track-5.jpeg', '/src/assets/track-6.jpeg', '/src/assets/track-7.jpeg',
    '/src/assets/track-8.jpeg'
  ];

  for (let i = 0; i < 99; i++) {
    const base = baseSongs[i % baseSongs.length];
    const title = i < 8 ? base.title : additionalTitles[i - 8] || `Track ${i + 1}`;
    const artist = i < 8 ? base.artist : artists[i % artists.length];
    const change24h = Math.random() > 0.3 ? Math.random() * 30 : -(Math.random() * 15);
    
    songs.push({
      id: i + 1,
      rank: i + 1,
      trend: change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'stable',
      trendValue: Math.abs(Math.floor(change24h)),
      title,
      artist,
      artwork: artworks[i % artworks.length],
      attentionScore: Math.floor(100000 - (i * 900) + Math.random() * 500),
      momentum: change24h > 10 ? 'surging' : change24h < -5 ? 'cooling' : 'stable',
      change24h: parseFloat(change24h.toFixed(1)),
      listeners: `${(2.5 - (i * 0.02)).toFixed(1)}M`,
      marketCap: `${(45 - (i * 0.4)).toFixed(1)}M`,
      platforms: [
        { name: 'Spotify', percentage: Math.floor(25 + Math.random() * 20) },
        { name: 'TikTok', percentage: Math.floor(20 + Math.random() * 25) }
      ],
      marketMoves: change24h > 10 ? ['Viral', 'Trending'] : ['Steady'],
      isWatchlisted: false,
      twitterHandle: `@${artist.toLowerCase().replace(' ', '')}`,
      description: i < 8 ? base.description : `${title} by ${artist} - trending now`
    });
  }
  
  return songs;
};

const mockSongs = generateMockSongs();

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
  const [timeWindow, setTimeWindow] = useState('24H');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([2, 5]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  
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

  // Top performing music (positive change)
  const topPerforming = mockSongs.filter(s => s.change24h > 0).slice(0, 20);

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
        <div className="border-t border-white/5 px-3 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] overflow-x-auto">
          <div className="flex items-center gap-1">
            <span className="text-white/50">Listeners:</span>
            <span className="font-semibold text-white">73M</span>
            <span className="text-[#4ade80]">▲8.2%</span>
          </div>
          <div className="flex items-center gap-1">
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
              <h2 className="text-[11px] sm:text-sm font-semibold text-white">🎵 SNAPS campaigns</h2>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#4ade80]/10 rounded-full">
                <span className="text-[9px] text-[#4ade80]">Total plays: 18M</span>
              </div>
            </div>
            <button className="text-[9px] sm:text-[10px] text-white/50 hover:text-white flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {mockSongs.slice(0, 5).map((song) => (
              <div
                key={song.id}
                onClick={() => navigate(`/global-heatmap/${song.id}`)}
                className="flex-shrink-0 flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all min-w-[160px] sm:min-w-[200px]"
              >
                <img src={song.artwork} alt={song.title} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{song.title}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{song.twitterHandle}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#4ade80]">{song.listeners}</p>
                  <p className="text-[7px] sm:text-[8px] text-white/40">listeners</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Market Events */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">Market events</h3>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              {timeFilters.map(t => (
                <button
                  key={t}
                  onClick={() => setTimeWindow(t)}
                  className={`text-[8px] sm:text-[9px] px-2 py-1 rounded-md transition-colors ${
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
                onClick={() => navigate(`/global-heatmap/${event.song.id}`)}
                className="bg-white/[0.02] hover:bg-white/[0.05] border-white/5 p-3 cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-2 mb-2">
                  <img src={event.song.artwork} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-medium text-white truncate">{event.song.title}</span>
                      <span className={`text-[8px] font-medium ${event.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {event.change >= 0 ? '▲' : '▼'}{Math.abs(event.change).toFixed(2)} (24h)
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40">{event.song.marketCap} cap</p>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-white/70 line-clamp-2 mb-2">{event.event}</p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {event.sources.map((source, i) => (
                      <div key={i} className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[7px]">
                        {source.charAt(1).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-[8px] text-white/30">{event.time}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Top Performing Music Treemap */}
        <section className="mb-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[10px] sm:text-xs font-medium text-white">Top performing music</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[8px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1">
              {topPerforming.map((song, i) => (
                <div
                  key={song.id}
                  onClick={() => navigate(`/global-heatmap/${song.id}`)}
                  className={`bg-[#4ade80]/20 hover:bg-[#4ade80]/30 rounded-lg p-2 cursor-pointer transition-all ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 6 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '70px' : '35px' }}
                >
                  <p className="text-[8px] sm:text-[9px] font-semibold text-white truncate">{song.title.slice(0, 10)}</p>
                  <p className="text-[7px] sm:text-[8px] text-[#4ade80]">+{song.change24h}%</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top 99 Music Leaderboard */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] sm:text-xs font-medium text-white">🏆 Top 99 Music Leaderboard</h3>
            <button 
              onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
              className="text-[9px] text-white/50 hover:text-white flex items-center gap-1"
            >
              {showAllLeaderboard ? 'Show less' : 'View all 99'} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/5 text-[8px] sm:text-[9px] text-white/40">
              <div className="col-span-1">#</div>
              <div className="col-span-4 sm:col-span-3">Song</div>
              <div className="col-span-2 hidden sm:block">Artist</div>
              <div className="col-span-2">Listeners</div>
              <div className="col-span-2">24h</div>
              <div className="col-span-3 sm:col-span-2 text-right">Score</div>
            </div>
            
            {/* Table Rows */}
            <div className="divide-y divide-white/5">
              {(showAllLeaderboard ? mockSongs : mockSongs.slice(0, 15)).map((song) => (
                <div 
                  key={song.id}
                  onClick={() => navigate(`/global-heatmap/${song.id}`)}
                  className="grid grid-cols-12 gap-2 px-3 py-2 hover:bg-white/[0.03] cursor-pointer transition-colors items-center"
                >
                  <div className="col-span-1 text-[9px] sm:text-[10px] text-white/50 font-medium">{song.rank}</div>
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-2">
                    <img src={song.artwork} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover" />
                    <span className="text-[9px] sm:text-[10px] font-medium text-white truncate">{song.title}</span>
                  </div>
                  <div className="col-span-2 hidden sm:block text-[9px] text-white/50 truncate">{song.artist}</div>
                  <div className="col-span-2 text-[9px] sm:text-[10px] text-white">{song.listeners}</div>
                  <div className="col-span-2">
                    <span className={`text-[9px] sm:text-[10px] font-medium ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change24h >= 0 ? '+' : ''}{song.change24h}%
                    </span>
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right text-[9px] sm:text-[10px] text-white font-medium">
                    {(song.attentionScore / 1000).toFixed(1)}k
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Song Detail Sheet */}
      <Sheet open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <SheetContent className="bg-black border-white/10 w-full sm:max-w-md">
          {selectedSong && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-3">
                  <img src={selectedSong.artwork} alt={selectedSong.title} className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <SheetTitle className="text-white text-base">{selectedSong.title}</SheetTitle>
                    <p className="text-[10px] text-white/50">{selectedSong.artist}</p>
                  </div>
                </div>
              </SheetHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-[9px] text-white/40 mb-1">Listeners</p>
                    <p className="text-sm font-bold text-white">{selectedSong.listeners}</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <p className="text-[9px] text-white/40 mb-1">24h Change</p>
                    <p className={`text-sm font-bold ${selectedSong.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {selectedSong.change24h >= 0 ? '+' : ''}{selectedSong.change24h}%
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full bg-[#4ade80] text-black hover:bg-[#4ade80]/90 text-[10px] h-9"
                  onClick={() => navigate(`/global-heatmap/${selectedSong.id}`)}
                >
                  View Full Details
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GlobalHeatmap;
