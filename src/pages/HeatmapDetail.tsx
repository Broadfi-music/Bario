import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play,
  Users, Clock, Zap, ChevronDown, Copy, Music, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Platform icons as SVG components
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C21.003.517 20.373.285 19.7.164c-.517-.093-1.038-.135-1.564-.15-.04-.003-.083-.01-.124-.013H5.988c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81.84-.553 1.472-1.287 1.88-2.208.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.004-11.392zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.392-2.244-1.158-.33-.55-.39-1.155-.212-1.78.307-1.09 1.35-1.76 2.59-1.657.48.044.94.16 1.37.39v-3.4c0-.08 0-.16.01-.24.04-.23.2-.39.44-.43.3-.06.6-.1.9-.13.55-.06 1.1-.12 1.63-.18.35-.04.68.12.84.41.08.15.12.33.12.51v.41z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027H6.27zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03H6.27zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

const AudiusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.656c-.164.238-.41.376-.688.376H6.794c-.278 0-.524-.138-.688-.376-.164-.238-.205-.537-.114-.815l2.55-6.967c.123-.336.447-.56.802-.56h5.312c.355 0 .679.224.802.56l2.55 6.967c.091.278.05.577-.114.815z"/>
  </svg>
);

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
      listeners: (2.4 - (i * 0.02)).toFixed(1), 
      mindshare: (5.2 - (i * 0.05)).toFixed(1), 
      reach24h: (113.78 - (i * 1)).toFixed(2),
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
  const [realtimeListeners, setRealtimeListeners] = useState('2.4');
  const [realtimeMindshare, setRealtimeMindshare] = useState('5.2');
  const [realtimeReach, setRealtimeReach] = useState('113.78');
  const [chartData, setChartData] = useState([120, 100, 110, 90, 100, 60, 80, 40, 70, 50]);
  
  const song = mockSongs.find(s => s.id === Number(id)) || mockSongs[0];

  // Realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealtimeListeners(prev => (parseFloat(prev) + (Math.random() - 0.4) * 0.1).toFixed(1));
      setRealtimeMindshare(prev => (parseFloat(prev) + (Math.random() - 0.5) * 0.05).toFixed(1));
      setRealtimeReach(prev => (parseFloat(prev) + (Math.random() - 0.3) * 2).toFixed(2));
      setChartData(prev => {
        const newData = [...prev.slice(1), Math.floor(prev[prev.length - 1] + (Math.random() - 0.5) * 30)];
        return newData;
      });
    }, 2000);

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

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out ${song.title} by ${song.artist} on Bario!`;
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
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
                  <a href="https://spotify.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 transition-colors text-[#1DB954]">
                    <SpotifyIcon />
                  </a>
                  <a href="https://music.apple.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FA243C]/20 hover:bg-[#FA243C]/30 transition-colors text-[#FA243C]">
                    <AppleMusicIcon />
                  </a>
                  <a href="https://deezer.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEAA2D]/20 hover:bg-[#FEAA2D]/30 transition-colors text-[#FEAA2D]">
                    <DeezerIcon />
                  </a>
                  <a href="https://audius.co" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#CC0FE0]/20 hover:bg-[#CC0FE0]/30 transition-colors text-[#CC0FE0]">
                    <AudiusIcon />
                  </a>
                </div>
                
                {/* Community Listeners */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-white/50">Community listeners</span>
                    <span className="text-[9px] text-white/40">{realtimeListeners}M total</span>
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
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-medium text-white">{realtimeListeners}M</span>
                      <span className="text-[7px] text-[#4ade80] animate-pulse">● LIVE</span>
                    </div>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 h-8 text-[9px] border-white/10 text-white hover:bg-white/5"
                      >
                        <Share2 className="h-3 w-3 mr-1" /> Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleShare('twitter')} className="text-xs">
                        Share to X (Twitter)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('facebook')} className="text-xs">
                        Share to Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="text-xs">
                        Share to WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="text-xs">
                        Copy Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    <p className="text-base font-bold text-white">{realtimeListeners}M</p>
                    <p className={`text-[9px] ${song.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {song.change24h >= 0 ? '▲' : '▼'}{Math.abs(song.change24h).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40">Mindshare</p>
                    <p className="text-base font-bold text-white">{realtimeMindshare}%</p>
                    <p className="text-[9px] text-[#4ade80]">▲ realtime</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-white/40">Listeners</p>
                    <p className="text-base font-bold text-[#4ade80]">{realtimeListeners}M</p>
                    <p className="text-[9px] text-[#4ade80] animate-pulse">● LIVE</p>
                  </div>
                </div>

                {/* Realtime Chart */}
                <div className="h-48 sm:h-64 bg-white/[0.02] rounded-xl flex items-center justify-center relative overflow-hidden">
                  <svg className="w-full h-full absolute inset-0">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#4ade80" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M0,${200 - chartData[0]} ${chartData.map((d, i) => `Q${i * 80 + 40},${200 - d} ${(i + 1) * 80},${200 - chartData[Math.min(i + 1, chartData.length - 1)]}`).join(' ')}`}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2"
                      className="transition-all duration-500"
                    />
                    <path
                      d={`M0,${200 - chartData[0]} ${chartData.map((d, i) => `Q${i * 80 + 40},${200 - d} ${(i + 1) * 80},${200 - chartData[Math.min(i + 1, chartData.length - 1)]}`).join(' ')} L800,200 L0,200 Z`}
                      fill="url(#chartGradient)"
                      className="transition-all duration-500"
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
                  <div className="absolute top-2 right-2">
                    <span className="text-[7px] text-[#4ade80] animate-pulse">● LIVE</span>
                  </div>
                </div>
              </Card>

              {/* Stats Row */}
              <div className="grid grid-cols-1 gap-3">
                <Card className="bg-white/[0.02] border-white/5 p-3">
                  <p className="text-[9px] text-white/40 mb-1">24h reach</p>
                  <p className="text-sm font-bold text-white">{realtimeReach}K</p>
                  <p className="text-[8px] text-[#4ade80] animate-pulse">● LIVE</p>
                  <div className="h-8 mt-2">
                    <svg className="w-full h-full">
                      <path d="M0,20 Q10,18 20,15 T40,10 T60,12 T80,5" fill="none" stroke="#4ade80" strokeWidth="1.5" />
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
                  {(showAllVoices ? topVoices : topVoices.slice(0, 10)).map((voice, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03]">
                      <span className="text-[9px] text-white/40 w-4">{i + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                        {voice.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-medium text-white truncate">{voice.name}</p>
                      </div>
                      <span className="text-[9px] text-white/50">{voice.score.toFixed(2)}</span>
                      <span className={`text-[8px] ${voice.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {voice.change >= 0 ? '+' : ''}{voice.change.toFixed(0)}%
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
                <div className="space-y-4">
                  {smartFeed.map((item, i) => (
                    <div key={i} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <span className="text-[10px]">📰</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-medium text-white">{item.user}</span>
                            <span className="text-[8px] text-white/40">{item.handle}</span>
                          </div>
                          <span className="text-[8px] text-white/30">{item.time}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-white/70 mb-2">{item.content}</p>
                      <div className="flex items-center gap-3 text-[8px] text-white/40">
                        <span>{item.views} views</span>
                        <span>{item.likes} likes</span>
                        <span>{item.comments} comments</span>
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