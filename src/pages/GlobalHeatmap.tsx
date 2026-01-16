import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Star, TrendingUp, TrendingDown, ExternalLink, Filter, Clock,
  Play, Pause, Users, ChevronRight, Sparkles, Zap, ChevronLeft, Volume2, X, Flame, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';
import { useHeatmapTracks, useSyncHeatmap, HeatmapTrack } from '@/hooks/useHeatmapData';

// Platform icons
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027H6.27zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03H6.27zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
    <path d="M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C21.003.517 20.373.285 19.7.164c-.517-.093-1.038-.135-1.564-.15-.04-.003-.083-.01-.124-.013H5.988c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81.84-.553 1.472-1.287 1.88-2.208.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.004-11.392z"/>
  </svg>
);

const AudiusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.656c-.164.238-.41.376-.688.376H6.794c-.278 0-.524-.138-.688-.376-.164-.238-.205-.537-.114-.815l2.55-6.967c.123-.336.447-.56.802-.56h5.312c.355 0 .679.224.802.56l2.55 6.967c.091.278.05.577-.114.815z"/>
  </svg>
);

interface MarketEvent {
  id: number;
  song: HeatmapTrack;
  event: string;
  change: number;
  time: string;
}

const timeFilters = ['Now', '24H', '7D', '30D'];

const GlobalHeatmap = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playTrack: globalPlayTrack, pauseTrack: globalPauseTrack, currentTrack: globalCurrentTrack, isPlaying: globalIsPlaying } = useAudioPlayer();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [timeWindow, setTimeWindow] = useState('24H');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HeatmapTrack[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('GLOBAL');
  
  const { tracks, genres, summary, loading, error, refetch, searchTracks, filterByGenre, filterByCountry } = useHeatmapTracks(99);
  
  const countries = [
    { code: 'GLOBAL', name: '🌍 Global' },
    { code: 'US', name: '🇺🇸 USA' },
    { code: 'UK', name: '🇬🇧 UK' },
    { code: 'NG', name: '🇳🇬 Nigeria' },
    { code: 'GH', name: '🇬🇭 Ghana' },
    { code: 'ZA', name: '🇿🇦 South Africa' },
    { code: 'KE', name: '🇰🇪 Kenya' },
    { code: 'BR', name: '🇧🇷 Brazil' },
    { code: 'MX', name: '🇲🇽 Mexico' },
    { code: 'FR', name: '🇫🇷 France' },
    { code: 'DE', name: '🇩🇪 Germany' },
    { code: 'JP', name: '🇯🇵 Japan' },
    { code: 'KR', name: '🇰🇷 South Korea' },
    { code: 'IN', name: '🇮🇳 India' },
  ];

  // Generate market events from top tracks
  useEffect(() => {
    if (tracks.length > 0) {
      const events: MarketEvent[] = tracks.slice(0, 4).map((track, i) => ({
        id: i + 1,
        song: track,
        event: i === 0 ? 'Major playlist addition driving massive streams' :
               i === 1 ? 'Viral TikTok trend challenging streaming records' :
               i === 2 ? 'Crossover gaining radio momentum' :
               'Music video breaks milestone views',
        change: track.metrics.change24h / 100,
        time: `${Math.floor(Math.random() * 60) + 10} min ago`
      }));
      setMarketEvents(events);
    }
  }, [tracks]);

  // Handle search with debounce - show dropdown immediately on typing
  useEffect(() => {
    if (searchQuery.trim()) {
      // Show dropdown immediately with loading state
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
    
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchTracks(searchQuery);
      } else {
        refetch();
      }
    }, 200); // Fast 200ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update search results when tracks change - keep dropdown open during search
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(tracks);
      // Keep dropdown open - don't close based on results count
    }
  }, [tracks, searchQuery]);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const toggleWatchlist = (id: string) => {
    handleInteraction('add to watchlist', () => {
      setWatchlist(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      toast.success(watchlist.includes(id) ? 'Removed from watchlist' : 'Added to watchlist');
    });
  };

  // Use global audio player for consistent playback across pages
  const playTrack = (track: HeatmapTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (globalCurrentTrack?.id === track.id && globalIsPlaying) {
      globalPauseTrack();
      return;
    }
    
    if (!track.previewUrl) {
      toast.error('No preview available for this track');
      return;
    }
    
    globalPlayTrack({
      id: track.id,
      title: track.title,
      artist: track.artist,
      audioUrl: track.previewUrl,
      coverUrl: track.artwork,
      type: 'music'
    });
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    filterByCountry(country);
  };

  const handleGenreFilter = (genre: string) => {
    setSelectedGenre(genre);
    if (genre) {
      filterByGenre(genre);
    } else {
      refetch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchResults([]);
    refetch();
  };

  // Format listener count
  const formatListeners = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Top performing music (positive change)
  const topPerforming = tracks.filter(s => s.metrics.change24h > 0).slice(0, 20);

  // No loading screen - show content immediately

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-2 sm:px-6">
          {/* Left side - Bario Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/bario-logo.png" 
              alt="Bario" 
              className="h-6 sm:h-8 w-auto object-contain"
            />
          </Link>
          
          {/* Center - Search (visible on all screens) */}
          <div className="relative flex-1 max-w-[120px] sm:max-w-md mx-1 sm:mx-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              ref={searchInputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 w-full bg-white/5 border-white/10 text-xs placeholder:text-white/40 rounded-lg"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-black/95 border border-white/10 rounded-lg shadow-xl max-h-64 overflow-y-auto z-50">
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500"></div>
                    <span className="ml-2 text-[10px] text-white/50">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.slice(0, 10).map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        navigate(`/global-heatmap/${track.id}`);
                        clearSearch();
                      }}
                      className="flex items-center gap-2 p-2 hover:bg-white/10 cursor-pointer"
                    >
                      <img src={track.artwork} alt="" className="w-8 h-8 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white truncate">{track.title}</p>
                        <p className="text-[9px] text-white/50 truncate">{track.artist}</p>
                      </div>
                      <span className="text-[8px] text-white/40">{formatListeners(track.metrics.lastfmListeners)}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-[10px] text-white/50">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right side - Nav Links */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Desktop Nav Links */}
            <nav className="hidden sm:flex items-center gap-3 text-[10px]">
              <Link to="/ai-remix" className="text-white/70 hover:text-cyan-400 transition-colors">
                AI Remix
              </Link>
              <Link to="/podcasts" className="text-white/70 hover:text-purple-400 transition-colors">
                Podcast
              </Link>
              <Link to="/three-strike" className="text-white/70 hover:text-orange-400 transition-colors">
                Three Strike
              </Link>
              <Link to="/bario-music" className="text-white/70 hover:text-green-400 transition-colors">
                Bario Music
              </Link>
            </nav>
            
            {/* Dashboard/Login - Always visible */}
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-black text-white hover:bg-black/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg font-medium">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/auth">
                  <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 rounded-lg font-medium">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Links - Below search */}
        <div className="sm:hidden border-t border-white/5 px-3 py-2 flex items-center gap-3 overflow-x-auto">
          <Link to="/ai-remix" className="text-[9px] text-white/70 hover:text-cyan-400 whitespace-nowrap">
            AI Remix
          </Link>
          <Link to="/bario-music" className="text-[9px] text-white/70 hover:text-green-400 whitespace-nowrap">
            Bario Music
          </Link>
          <Link to="/podcasts" className="text-[9px] text-white/70 hover:text-purple-400 whitespace-nowrap">
            Podcast
          </Link>
          <Link to="/three-strike" className="text-[9px] text-white/70 hover:text-orange-400 whitespace-nowrap">
            Three Strike
          </Link>
          
          {/* Top Chart Dropdown */}
          <div className="relative flex-1">
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full appearance-none bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] h-7 px-2 pr-6 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code} className="bg-black text-white">
                  {country.name}
                </option>
              ))}
            </select>
            <TrendingUp className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-green-400 pointer-events-none" />
          </div>
        </div>

        {/* Global Stats Bar */}
        <div className="border-t border-white/5 px-3 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] overflow-x-auto">
          <div className="flex items-center gap-1">
            <span className="text-white/50">Listeners:</span>
            <span className="font-semibold text-white animate-pulse">
              {summary?.totalListeners ? formatListeners(summary.totalListeners) : '73M'}
            </span>
            <span className="text-[#4ade80]">▲{summary?.avgChange24h || '8.2'}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/50">Tracks:</span>
            <span className="font-semibold text-white">{summary?.totalTracks || tracks.length}</span>
          </div>
          <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24 sm:pt-28 pb-24 px-3 sm:px-6">
        {/* Country Dropdown & Genre Filters */}
        <section className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Country Dropdown */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 text-white text-[10px] px-3 py-1.5 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4ade80] cursor-pointer"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code} className="bg-black text-white">
                    {country.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="h-3 w-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <span className="text-[9px] text-white/40">|</span>
            <span className="text-[9px] text-white/50">Top charts from {countries.find(c => c.code === selectedCountry)?.name.replace(/^.{2}\s/, '') || 'Global'}</span>
          </div>
          
          {/* Genre Filters */}
          <div className="flex gap-2 pb-2 overflow-x-auto">
            <button
              onClick={() => handleGenreFilter('')}
              className={`px-3 py-1.5 rounded-full text-[9px] whitespace-nowrap transition-colors ${
                !selectedGenre ? 'bg-[#4ade80] text-black font-medium' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All Genres
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => handleGenreFilter(genre)}
                className={`px-3 py-1.5 rounded-full text-[9px] whitespace-nowrap transition-colors ${
                  selectedGenre === genre ? 'bg-[#4ade80] text-black font-medium' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Trending Now */}
        <section className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] sm:text-sm font-semibold text-white">🎵 Trending Now</h2>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-[#4ade80]/10 rounded-full">
                <span className="text-[9px] text-[#4ade80]">Total plays: {summary?.totalListeners ? formatListeners(summary.totalListeners) : '18M'}</span>
              </div>
            </div>
            <button className="text-[9px] sm:text-[10px] text-white/50 hover:text-white flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {tracks.slice(0, 8).map((track) => (
              <div
                key={track.id}
                onClick={() => navigate(`/global-heatmap/${track.id}`)}
                className="flex-shrink-0 flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all min-w-[180px] sm:min-w-[220px] group"
              >
                <div className="relative">
                  <img src={track.artwork} alt={track.title} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" />
                  <button
                    onClick={(e) => playTrack(track, e)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  >
                    {globalCurrentTrack?.id === track.id && globalIsPlaying ? (
                      <Pause className="h-4 w-4 text-white" />
                    ) : (
                      <Play className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{track.title}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{track.artist}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {track.spotifyUrl && <SpotifyIcon />}
                    {track.deezerUrl && <DeezerIcon />}
                    {track.audiusUrl && <AudiusIcon />}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#4ade80]">{formatListeners(track.metrics.lastfmListeners)}</p>
                  <p className="text-[7px] sm:text-[8px] text-white/40">listeners</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Market Events */}
        <section className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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
                  <div className="relative">
                    <img src={event.song.artwork} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    <button
                      onClick={(e) => playTrack(event.song, e)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      {globalCurrentTrack?.id === event.song.id && globalIsPlaying ? (
                        <Pause className="h-3 w-3 text-white" />
                      ) : (
                        <Play className="h-3 w-3 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] sm:text-[10px] font-medium text-white truncate">{event.song.title}</span>
                      <span className={`text-[8px] font-medium ${event.change >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                        {event.change >= 0 ? '▲' : '▼'}{Math.abs(event.change).toFixed(2)} (24h)
                      </span>
                    </div>
                    <p className="text-[8px] text-white/40">{event.song.artist}</p>
                  </div>
                </div>
                <p className="text-[9px] sm:text-[10px] text-white/70 line-clamp-2 mb-2">{event.event}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {event.song.spotifyUrl && <SpotifyIcon />}
                    {event.song.deezerUrl && <DeezerIcon />}
                    {event.song.audiusUrl && <AudiusIcon />}
                  </div>
                  <span className="text-[8px] text-white/30">{event.time}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Top Performing Music */}
        <section className="mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[10px] sm:text-xs font-medium text-white">Top performing music</span>
                <span className="text-[7px] text-[#4ade80] animate-pulse">● LIVE</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {['Now', '7D', '1M'].map(t => (
                  <button key={t} className="text-[8px] px-2 py-0.5 rounded text-white/50 hover:text-white">{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1">
              {topPerforming.map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => navigate(`/global-heatmap/${track.id}`)}
                  className={`bg-[#4ade80]/20 hover:bg-[#4ade80]/30 rounded-lg p-2 cursor-pointer transition-all group relative ${
                    i < 2 ? 'col-span-2 row-span-2' : i < 6 ? 'col-span-2' : ''
                  }`}
                  style={{ minHeight: i < 2 ? '100px' : '50px' }}
                >
                  <img 
                    src={track.artwork} 
                    alt={track.title}
                    className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-60"
                  />
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-[8px] sm:text-[9px] font-bold text-white truncate max-w-[80%]">{track.title}</span>
                      <button
                        onClick={(e) => playTrack(track, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {globalCurrentTrack?.id === track.id && globalIsPlaying ? (
                          <Pause className="h-4 w-4 text-white" />
                        ) : (
                          <Play className="h-4 w-4 text-white" />
                        )}
                      </button>
                    </div>
                    <div>
                      <p className="text-[7px] sm:text-[8px] text-white/70 truncate">{track.artist}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] sm:text-[9px] text-white font-semibold">{formatListeners(track.metrics.lastfmListeners)}</span>
                        <span className="text-[7px] text-[#4ade80]">+{track.metrics.change24h.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top 99 Music Leaderboard */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-medium text-white">Top 99 Music Leaderboard</span>
                <span className="text-[7px] text-[#4ade80] animate-pulse">● LIVE</span>
              </div>
              <button
                onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
                className="text-[9px] text-[#4ade80] hover:underline"
              >
                {showAllLeaderboard ? 'Show less' : 'Show all'}
              </button>
            </div>
            
            <div className="divide-y divide-white/5">
              {tracks.slice(0, showAllLeaderboard ? 99 : 20).map((track) => (
                <div
                  key={track.id}
                  onClick={() => navigate(`/global-heatmap/${track.id}`)}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-white/5 cursor-pointer group"
                >
                  <span className="text-[9px] sm:text-[10px] text-white/40 w-6">{track.rank}</span>
                  <div className="flex items-center gap-1">
                    {track.trend === 'up' && <TrendingUp className="h-3 w-3 text-[#4ade80]" />}
                    {track.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
                  </div>
                  <div className="relative">
                    <img src={track.artwork} alt={track.title} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover" />
                    <button
                      onClick={(e) => playTrack(track, e)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      {globalCurrentTrack?.id === track.id && globalIsPlaying ? (
                        <Pause className="h-3 w-3 text-white" />
                      ) : (
                        <Play className="h-3 w-3 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{track.title}</p>
                    <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{track.artist}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                    {track.spotifyUrl && <SpotifyIcon />}
                    {track.deezerUrl && <DeezerIcon />}
                    {track.audiusUrl && <AudiusIcon />}
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-white">{formatListeners(track.metrics.lastfmListeners)}</p>
                    <p className={`text-[7px] sm:text-[8px] ${track.metrics.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {track.metrics.change24h >= 0 ? '+' : ''}{track.metrics.change24h.toFixed(1)}%
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatchlist(track.id);
                    }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity ${watchlist.includes(track.id) ? 'text-yellow-400' : 'text-white/40 hover:text-yellow-400'}`}
                  >
                    <Star className="h-4 w-4" fill={watchlist.includes(track.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      {/* Audio player handled by GlobalAudioPlayer component */}
    </div>
  );
};

export default GlobalHeatmap;
