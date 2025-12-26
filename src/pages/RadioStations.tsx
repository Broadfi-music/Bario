import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Radio, Heart, Search, X, Eye, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  votes: number;
  clickcount: number;
  clicktrend: number;
  codec: string;
  bitrate: number;
  homepage: string;
}

const RadioStations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('top');

  const categories = [
    { id: 'top', label: 'Top' },
    { id: 'trending', label: 'Trending' },
    { id: 'music', label: 'Music' },
    { id: 'hip-hop', label: 'Hip-Hop' },
    { id: 'pop', label: 'Pop' },
    { id: 'rock', label: 'Rock' },
    { id: 'jazz', label: 'Jazz' },
    { id: 'electronic', label: 'Electronic' },
  ];

  useEffect(() => {
    fetchStations();
  }, [selectedCategory]);

  const fetchStations = async () => {
    setLoading(true);
    try {
      let body: any = { limit: 40 };
      
      if (selectedCategory === 'top') {
        body.action = 'topvote';
      } else if (selectedCategory === 'trending') {
        body.action = 'topclick';
      } else {
        body.action = 'bytag';
        body.tag = selectedCategory;
      }

      const { data, error } = await supabase.functions.invoke('radio-browser', { body });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Radio data:', data);
      setStations(data?.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load radio stations');
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const searchStations = async () => {
    if (!searchQuery.trim()) {
      fetchStations();
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('radio-browser', {
        body: { action: 'search', name: searchQuery, limit: 40 }
      });

      if (error) throw error;
      setStations(data?.stations || []);
    } catch (error) {
      console.error('Error searching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (station: RadioStation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingStation === station.stationuuid) {
      audioRef.current?.pause();
      setPlayingStation(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = station.url_resolved || station.url;
        audioRef.current.play().catch(() => {
          toast.error('Unable to play this station');
        });
        setPlayingStation(station.stationuuid);
      }
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const formatListeners = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const currentPlayingStation = stations.find(s => s.stationuuid === playingStation);

  const filteredStations = stations.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <audio ref={audioRef} />
      
      {/* Header - Kick.com style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0e0e10]">
        <div className="flex items-center h-12 px-2 sm:px-4 gap-2">
          <button onClick={() => navigate('/')} className="text-white/60 hover:text-white p-1">
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          {/* Search Bar - Full width on mobile */}
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStations()}
              className="pl-8 pr-8 h-8 bg-[#1f1f23] border-none text-xs placeholder:text-white/40 rounded-md w-full"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); fetchStations(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Studio Button */}
          <Button
            onClick={() => navigate('/podcasts')}
            size="sm"
            className="bg-black hover:bg-black/80 text-white text-[10px] h-8 px-2 sm:px-3 font-semibold border border-white/10"
          >
            <Tv className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Studio</span>
          </Button>

          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="bg-black hover:bg-black/80 text-white text-[10px] h-8 px-2 sm:px-3 font-semibold border border-white/10">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-black hover:bg-black/80 text-white text-[10px] h-8 px-2 sm:px-3 font-semibold border border-white/10">
                Log In
              </Button>
            </Link>
          )}
        </div>

        {/* Categories - Scrollable */}
        <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto border-t border-white/5 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-black text-white border border-white/20' 
                  : 'bg-transparent text-white/60 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Currently Playing Bar */}
      {currentPlayingStation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-white/10 p-2 sm:p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={currentPlayingStation.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'} 
                alt="" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded object-cover"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'; }}
              />
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1 py-0.5 bg-red-500 rounded">
                <span className="animate-pulse w-1 h-1 bg-white rounded-full"></span>
                <span className="text-[7px] text-white font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{currentPlayingStation.name}</p>
              <p className="text-[10px] text-white/50 truncate">{currentPlayingStation.tags?.split(',')[0] || 'Radio'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 text-white/50">
                <Eye className="h-3 w-3" />
                <span className="text-[10px]">{formatListeners(currentPlayingStation.clickcount)}</span>
              </div>
              <Button
                onClick={(e) => togglePlay(currentPlayingStation, e)}
                size="icon"
                className="h-9 w-9 rounded-full bg-black hover:bg-black/80 border border-white/20"
              >
                <Pause className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`pt-24 ${currentPlayingStation ? 'pb-20' : 'pb-4'} px-2 sm:px-4`}>
        {/* Station Grid - Kick.com mobile style */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="aspect-video bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {filteredStations.map(station => (
              <div
                key={station.stationuuid}
                className="group cursor-pointer"
                onClick={() => navigate(`/radio/${station.stationuuid}`, { state: { station } })}
              >
                {/* Thumbnail - Smaller on mobile */}
                <div className="relative aspect-video rounded overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                  <img 
                    src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'} 
                    alt={station.name}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'; }}
                  />
                  
                  {/* Live Badge */}
                  <div className="absolute top-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-semibold">
                    <span className="animate-pulse w-1 h-1 bg-white rounded-full"></span>
                    LIVE
                  </div>

                  {/* Viewer Count */}
                  <div className="absolute bottom-1 left-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/80 rounded text-[8px]">
                    <Eye className="h-2.5 w-2.5" />
                    {formatListeners(station.clickcount)}
                  </div>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePlay(station, e)}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black flex items-center justify-center border border-white/20"
                    >
                      {playingStation === station.stationuuid ? (
                        <Pause className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      ) : (
                        <Play className="h-4 w-4 sm:h-5 sm:w-5 text-white ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => toggleFavorite(station.stationuuid, e)}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className={`h-3 w-3 ${favorites.includes(station.stationuuid) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                </div>

                {/* Info - Compact on mobile */}
                <div className="flex gap-2 mt-1.5">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500">
                    <img 
                      src={station.favicon || ''} 
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-medium text-white truncate">
                      {station.name}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-white/50 truncate">{station.country || 'Worldwide'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredStations.length === 0 && (
          <div className="text-center py-12">
            <Radio className="h-10 w-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm">No stations found</p>
            <Button onClick={fetchStations} variant="ghost" className="mt-3 text-xs">
              Load Stations
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RadioStations;
