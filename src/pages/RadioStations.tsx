import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Radio, Heart, Volume2, Users, Search, X, Eye } from 'lucide-react';
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
    { id: 'top', label: 'Top Stations' },
    { id: 'trending', label: 'Trending' },
    { id: 'music', label: 'Music' },
    { id: 'news', label: 'News' },
    { id: 'talk', label: 'Talk' },
    { id: 'sports', label: 'Sports' },
  ];

  useEffect(() => {
    fetchStations();
  }, [selectedCategory]);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('radio-browser', {
        body: { 
          action: selectedCategory === 'top' ? 'topvote' : 
                  selectedCategory === 'trending' ? 'topclick' : 'bytag',
          tag: selectedCategory !== 'top' && selectedCategory !== 'trending' ? selectedCategory : undefined,
          limit: 30 
        }
      });

      if (error) throw error;
      setStations(data?.stations || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load radio stations');
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
        body: { action: 'search', name: searchQuery, limit: 30 }
      });

      if (error) throw error;
      setStations(data?.stations || []);
    } catch (error) {
      console.error('Error searching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (station: RadioStation) => {
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

  const toggleFavorite = (id: string) => {
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
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Header - Kick.com style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#18181b] border-b border-white/5">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/60 hover:text-white mr-6">
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2 mr-6">
            <Radio className="h-5 w-5 text-[#53fc18]" />
            <span className="font-bold text-lg">Radio</span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search radio stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStations()}
              className="pl-10 pr-10 h-9 bg-[#26262c] border-none text-sm placeholder:text-white/40 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); fetchStations(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="ml-auto">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90 text-xs h-8 px-4 rounded font-semibold">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90 text-xs h-8 px-4 rounded font-semibold">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-white/5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id 
                  ? 'bg-[#53fc18] text-black' 
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Currently Playing Bar */}
      {currentPlayingStation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-white/10 p-3">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="relative">
              <img 
                src={currentPlayingStation.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'} 
                alt="" 
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'; }}
              />
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-red-500 rounded-full">
                <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
                <span className="text-[8px] text-white font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentPlayingStation.name}</p>
              <p className="text-xs text-white/50 truncate">{currentPlayingStation.tags?.split(',')[0] || 'Radio'}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-white/50">
                <Eye className="h-4 w-4" />
                <span className="text-xs">{formatListeners(currentPlayingStation.clickcount)}</span>
              </div>
              <Button
                onClick={() => togglePlay(currentPlayingStation)}
                size="icon"
                className="h-10 w-10 rounded-full bg-[#53fc18] hover:bg-[#53fc18]/90"
              >
                <Pause className="h-5 w-5 text-black" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`pt-28 ${currentPlayingStation ? 'pb-24' : 'pb-6'} px-4`}>
        <div className="max-w-7xl mx-auto">
          {/* Featured/Live Stations - Twitch style grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array(12).fill(0).map((_, i) => (
                <div key={i} className="aspect-video bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredStations.map(station => (
                <div
                  key={station.stationuuid}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/radio/${station.stationuuid}`, { state: { station } })}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                    <img 
                      src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'} 
                      alt={station.name}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'; }}
                    />
                    
                    {/* Live Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-[10px] font-semibold">
                      <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
                      LIVE
                    </div>

                    {/* Viewer Count */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 rounded text-[10px]">
                      <Eye className="h-3 w-3" />
                      {formatListeners(station.clickcount)} viewers
                    </div>

                    {/* Play Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(station); }}
                        className="w-14 h-14 rounded-full bg-[#53fc18] flex items-center justify-center"
                      >
                        {playingStation === station.stationuuid ? (
                          <Pause className="h-6 w-6 text-black" />
                        ) : (
                          <Play className="h-6 w-6 text-black ml-1" />
                        )}
                      </button>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(station.stationuuid); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className={`h-4 w-4 ${favorites.includes(station.stationuuid) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="flex gap-3 mt-2">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500">
                      <img 
                        src={station.favicon || ''} 
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-[#53fc18] transition-colors">
                        {station.name}
                      </p>
                      <p className="text-xs text-white/50 truncate">{station.country || 'Worldwide'}</p>
                      <p className="text-xs text-white/40 truncate">{station.tags?.split(',').slice(0, 2).join(', ') || 'Music'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredStations.length === 0 && (
            <div className="text-center py-16">
              <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No stations found</p>
              <Button onClick={fetchStations} variant="ghost" className="mt-4">
                Load Stations
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RadioStations;
