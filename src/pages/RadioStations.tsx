import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Radio, Heart, Search, X, Eye, Tv, ChevronRight, Sparkles, Users, User } from 'lucide-react';
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

// Curated 10 radio stations with different categories
const CURATED_STATIONS: RadioStation[] = [
  {
    stationuuid: '1',
    name: 'BBC Radio 1',
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/BBC_Radio_1.svg/1200px-BBC_Radio_1.svg.png',
    tags: 'pop,hits,chart',
    country: 'United Kingdom',
    countrycode: 'UK',
    language: 'english',
    votes: 50000,
    clickcount: 250000,
    clicktrend: 100,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.bbc.co.uk/radio1'
  },
  {
    stationuuid: '2',
    name: 'Hot 97 FM',
    url: 'https://stream.revma.ihrhls.com/zc1465',
    url_resolved: 'https://stream.revma.ihrhls.com/zc1465',
    favicon: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/2e/WQHT_logo.svg/1200px-WQHT_logo.svg.png',
    tags: 'hip-hop,rap,urban',
    country: 'United States',
    countrycode: 'US',
    language: 'english',
    votes: 45000,
    clickcount: 180000,
    clicktrend: 80,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.hot97.com'
  },
  {
    stationuuid: '3',
    name: 'NRJ France',
    url: 'https://scdn.nrjaudio.fm/fr/30001/mp3_128.mp3',
    url_resolved: 'https://scdn.nrjaudio.fm/fr/30001/mp3_128.mp3',
    favicon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/NRJ_logo.svg/1200px-NRJ_logo.svg.png',
    tags: 'pop,dance,hits',
    country: 'France',
    countrycode: 'FR',
    language: 'french',
    votes: 35000,
    clickcount: 150000,
    clicktrend: 60,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.nrj.fr'
  },
  {
    stationuuid: '4',
    name: 'Smooth Jazz Florida',
    url: 'https://ice6.securenetsystems.net/SJFL320',
    url_resolved: 'https://ice6.securenetsystems.net/SJFL320',
    favicon: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=200',
    tags: 'jazz,smooth jazz,instrumental',
    country: 'United States',
    countrycode: 'US',
    language: 'english',
    votes: 28000,
    clickcount: 120000,
    clicktrend: 45,
    codec: 'MP3',
    bitrate: 320,
    homepage: 'https://smoothjazzflorida.com'
  },
  {
    stationuuid: '5',
    name: 'Rock FM',
    url: 'https://rockfm.cope.stream.flumotion.com/cope/rockfm.mp3',
    url_resolved: 'https://rockfm.cope.stream.flumotion.com/cope/rockfm.mp3',
    favicon: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=200',
    tags: 'rock,classic rock,metal',
    country: 'Spain',
    countrycode: 'ES',
    language: 'spanish',
    votes: 32000,
    clickcount: 140000,
    clicktrend: 55,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.rockfm.fm'
  },
  {
    stationuuid: '6',
    name: 'Electronica FM',
    url: 'https://strw3.openstream.co/1484',
    url_resolved: 'https://strw3.openstream.co/1484',
    favicon: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
    tags: 'electronic,edm,dance',
    country: 'Netherlands',
    countrycode: 'NL',
    language: 'english',
    votes: 22000,
    clickcount: 95000,
    clicktrend: 70,
    codec: 'MP3',
    bitrate: 128,
    homepage: ''
  },
  {
    stationuuid: '7',
    name: 'Classic FM',
    url: 'https://media-ice.musicradio.com/ClassicFMMP3',
    url_resolved: 'https://media-ice.musicradio.com/ClassicFMMP3',
    favicon: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Classic_FM_UK.svg/1200px-Classic_FM_UK.svg.png',
    tags: 'classical,orchestra,instrumental',
    country: 'United Kingdom',
    countrycode: 'UK',
    language: 'english',
    votes: 40000,
    clickcount: 170000,
    clicktrend: 50,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://www.classicfm.com'
  },
  {
    stationuuid: '8',
    name: 'Naija FM',
    url: 'https://stream.zeno.fm/8b7t6czn8vruv',
    url_resolved: 'https://stream.zeno.fm/8b7t6czn8vruv',
    favicon: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
    tags: 'afrobeats,nigerian,african',
    country: 'Nigeria',
    countrycode: 'NG',
    language: 'english',
    votes: 18000,
    clickcount: 85000,
    clicktrend: 90,
    codec: 'MP3',
    bitrate: 128,
    homepage: ''
  },
  {
    stationuuid: '9',
    name: 'K-Pop Radio',
    url: 'https://listen.moe/kpop/stream',
    url_resolved: 'https://listen.moe/kpop/stream',
    favicon: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
    tags: 'kpop,korean,pop',
    country: 'South Korea',
    countrycode: 'KR',
    language: 'korean',
    votes: 25000,
    clickcount: 110000,
    clicktrend: 85,
    codec: 'MP3',
    bitrate: 128,
    homepage: 'https://listen.moe'
  },
  {
    stationuuid: '10',
    name: 'Latin Hits FM',
    url: 'https://usa8.fastcast4u.com/proxy/latinosfm?mp=/1',
    url_resolved: 'https://usa8.fastcast4u.com/proxy/latinosfm?mp=/1',
    favicon: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=200',
    tags: 'latin,reggaeton,spanish',
    country: 'Mexico',
    countrycode: 'MX',
    language: 'spanish',
    votes: 20000,
    clickcount: 90000,
    clicktrend: 65,
    codec: 'MP3',
    bitrate: 128,
    homepage: ''
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📻' },
  { id: 'pop', label: 'Pop', icon: '🎤' },
  { id: 'hip-hop', label: 'Hip-Hop', icon: '🎧' },
  { id: 'rock', label: 'Rock', icon: '🎸' },
  { id: 'jazz', label: 'Jazz', icon: '🎷' },
  { id: 'electronic', label: 'Electronic', icon: '🎹' },
  { id: 'classical', label: 'Classical', icon: '🎻' },
  { id: 'afrobeats', label: 'Afrobeats', icon: '🥁' },
  { id: 'kpop', label: 'K-Pop', icon: '💜' },
  { id: 'latin', label: 'Latin', icon: '💃' },
];

const RadioStations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [stations] = useState<RadioStation[]>(CURATED_STATIONS);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [headerIndex, setHeaderIndex] = useState(0);

  // Animated header carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setHeaderIndex(prev => (prev + 1) % stations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [stations.length]);

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
  const featuredStation = stations[headerIndex];

  // Filter stations
  const filteredStations = stations.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.tags?.toLowerCase().includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Recommended stations (random selection)
  const recommendedStations = [...stations].sort(() => Math.random() - 0.5).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Kick-style Header */}
      <header className="sticky top-0 z-50 bg-[#0e0e10] border-b border-white/5">
        <div className="flex items-center h-14 px-4 gap-4">
          {/* Logo - just icon, no text */}
          <button onClick={() => navigate('/')} className="flex items-center">
            <Radio className="h-6 w-6 text-[#53fc18]" />
          </button>
          
          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/heatmap')} className="text-sm text-white/60 hover:text-white transition-colors">
              Heatmap
            </button>
            <button onClick={() => navigate('/podcasts')} className="text-sm text-white/60 hover:text-white transition-colors">
              Podcast
            </button>
          </div>
          
          {/* Search Bar - Kick style */}
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10 bg-[#1f1f23] border-none text-sm placeholder:text-white/40 rounded-lg w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Right side buttons */}
          <div className="flex items-center gap-2">
            {user ? (
              <Button
                onClick={() => navigate(`/host/${user.id}`)}
                size="sm"
                className="bg-black hover:bg-black/80 text-white border border-white/20 font-semibold h-9 px-4"
              >
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My Page</span>
              </Button>
            ) : (
              <>
                <Button onClick={() => navigate('/auth')} size="sm" variant="ghost" className="h-9">
                  Log In
                </Button>
                <Button onClick={() => navigate('/auth')} size="sm" className="bg-black hover:bg-black/80 text-white border border-white/20 font-semibold h-9">
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner - Animated like Kick */}
      <div className="relative h-[300px] sm:h-[400px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={featuredStation?.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'} 
            alt=""
            className="w-full h-full object-cover blur-2xl opacity-40 transition-all duration-1000"
            onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10]/60 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative h-full flex items-end p-6 sm:p-10">
          <div className="flex items-end gap-6 max-w-4xl">
            {/* Featured Station Logo */}
            <div 
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl cursor-pointer transform hover:scale-105 transition-transform"
              onClick={() => navigate(`/radio/${featuredStation?.stationuuid}`, { state: { station: featuredStation } })}
            >
              <img 
                src={featuredStation?.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=200'} 
                alt={featuredStation?.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=200'; }}
              />
            </div>

            {/* Station Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-[10px] font-semibold">
                  <span className="animate-pulse w-1.5 h-1.5 bg-white rounded-full"></span>
                  LIVE
                </span>
                <span className="text-white/60 text-xs">{featuredStation?.tags?.split(',')[0]}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 truncate">{featuredStation?.name}</h1>
              <p className="text-white/60 text-sm mb-4">{featuredStation?.country} • {formatListeners(featuredStation?.clickcount || 0)} listeners</p>
              
              <div className="flex gap-3">
                <Button 
                  onClick={(e) => featuredStation && togglePlay(featuredStation, e)}
                  className="bg-black hover:bg-black/80 text-white border border-white/20 font-semibold h-10 px-6"
                >
                  {playingStation === featuredStation?.stationuuid ? (
                    <><Pause className="h-5 w-5 mr-2" />Pause</>
                  ) : (
                    <><Play className="h-5 w-5 mr-2" />Listen Now</>
                  )}
                </Button>
                <Button 
                  onClick={(e) => featuredStation && toggleFavorite(featuredStation.stationuuid, e)}
                  variant="outline"
                  className="border-white/20 h-10 px-4"
                >
                  <Heart className={`h-5 w-5 ${favorites.includes(featuredStation?.stationuuid || '') ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Carousel Dots */}
          <div className="absolute bottom-4 right-6 flex gap-1.5">
            {stations.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setHeaderIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${headerIndex === i ? 'bg-[#53fc18] w-6' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`px-4 sm:px-6 py-6 ${currentPlayingStation ? 'pb-24' : ''}`}>

        {/* Recommended Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#53fc18]" />
              Recommended For You
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recommendedStations.map(station => (
              <div
                key={station.stationuuid}
                className="group cursor-pointer"
                onClick={() => navigate(`/radio/${station.stationuuid}`, { state: { station } })}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                  <img 
                    src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'} 
                    alt={station.name}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'; }}
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-semibold">
                    <span className="animate-pulse w-1 h-1 bg-white rounded-full"></span>
                    LIVE
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px]">
                    <Eye className="h-3 w-3" />
                    {formatListeners(station.clickcount)}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePlay(station, e)}
                      className="w-12 h-12 rounded-full bg-black border border-white/20 flex items-center justify-center"
                    >
                      {playingStation === station.stationuuid ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white ml-1" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium truncate">{station.name}</p>
                  <p className="text-xs text-white/50">{station.tags?.split(',')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Stations Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {selectedCategory === 'all' ? 'All Stations' : `${CATEGORIES.find(c => c.id === selectedCategory)?.label} Stations`}
            </h2>
            <span className="text-sm text-white/50">{filteredStations.length} stations</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredStations.map(station => (
              <div
                key={station.stationuuid}
                className="group cursor-pointer"
                onClick={() => navigate(`/radio/${station.stationuuid}`, { state: { station } })}
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                  <img 
                    src={station.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'} 
                    alt={station.name}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-300"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=400'; }}
                  />
                  
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-semibold">
                    <span className="animate-pulse w-1 h-1 bg-white rounded-full"></span>
                    LIVE
                  </div>

                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/80 rounded text-[9px]">
                    <Eye className="h-3 w-3" />
                    {formatListeners(station.clickcount)}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => togglePlay(station, e)}
                      className="w-12 h-12 rounded-full bg-[#53fc18] flex items-center justify-center transform hover:scale-110 transition-transform"
                    >
                      {playingStation === station.stationuuid ? (
                        <Pause className="h-6 w-6 text-black" />
                      ) : (
                        <Play className="h-6 w-6 text-black ml-1" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={(e) => toggleFavorite(station.stationuuid, e)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Heart className={`h-4 w-4 ${favorites.includes(station.stationuuid) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                </div>

                <div className="flex gap-2 mt-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500">
                    <img 
                      src={station.favicon || ''} 
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{station.name}</p>
                    <p className="text-xs text-white/50 truncate">{station.country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredStations.length === 0 && (
            <div className="text-center py-12">
              <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">No stations found</p>
            </div>
          )}
        </section>
      </main>

      {/* Now Playing Bar */}
      {currentPlayingStation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-white/10 p-3">
          <div className="flex items-center gap-4 max-w-7xl mx-auto">
            <div className="relative">
              <img 
                src={currentPlayingStation.favicon || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'} 
                alt="" 
                className="w-12 h-12 rounded-lg object-cover"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=100'; }}
              />
              <div className="absolute -top-1 -right-1 flex items-center gap-0.5 px-1 py-0.5 bg-red-500 rounded">
                <span className="animate-pulse w-1 h-1 bg-white rounded-full"></span>
                <span className="text-[7px] font-medium">LIVE</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentPlayingStation.name}</p>
              <p className="text-xs text-white/50 truncate">{currentPlayingStation.tags?.split(',')[0]}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-white/50">
                <Users className="h-4 w-4" />
                <span className="text-xs">{formatListeners(currentPlayingStation.clickcount)}</span>
              </div>
              <Button
                onClick={(e) => togglePlay(currentPlayingStation, e)}
                size="icon"
                className="h-10 w-10 rounded-full bg-[#53fc18] hover:bg-[#53fc18]/90"
              >
                <Pause className="h-5 w-5 text-black" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioStations;