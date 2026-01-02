import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Radio, Heart, Search, X, Eye, Users, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RadioLiveSidebar } from '@/components/radio/RadioLiveSidebar';

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

interface UserRadioStation {
  id: string;
  user_id: string;
  station_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  listener_count: number;
  is_live: boolean;
  stream_url: string | null;
  profile?: {
    avatar_url: string | null;
    full_name: string | null;
    username: string | null;
  };
}

// Curated 10 radio stations with different categories
const CURATED_STATIONS: RadioStation[] = [
  {
    stationuuid: '1',
    name: 'BBC Radio 1',
    url: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    url_resolved: 'http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one',
    favicon: 'https://cdn-radiotime-logos.tunein.com/s24939q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s34781q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s6527q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s243953q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s24878q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s185589q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s8439q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s298824q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s297990q.png',
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
    favicon: 'https://cdn-radiotime-logos.tunein.com/s256712q.png',
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

const RadioStations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [curatedStations] = useState<RadioStation[]>(CURATED_STATIONS);
  const [userStations, setUserStations] = useState<UserRadioStation[]>([]);
  const [playingStation, setPlayingStation] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [headerIndex, setHeaderIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'discover' | 'community'>('discover');

  // Fetch user-created stations
  useEffect(() => {
    fetchUserStations();
  }, []);

  // Animated header carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setHeaderIndex(prev => (prev + 1) % curatedStations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [curatedStations.length]);

  const fetchUserStations = async () => {
    const { data: stations } = await supabase
      .from('radio_stations')
      .select('*')
      .order('listener_count', { ascending: false });

    if (stations && stations.length > 0) {
      const userIds = [...new Set(stations.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url, full_name, username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      setUserStations(stations.map(s => ({
        ...s,
        profile: profileMap.get(s.user_id)
      })));
    }
  };

  const togglePlay = (stationId: string, streamUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingStation === stationId) {
      audioRef.current?.pause();
      setPlayingStation(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.play().catch(() => {
          toast.error('Unable to play this station');
        });
        setPlayingStation(stationId);
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

  const currentPlayingStation = curatedStations.find(s => s.stationuuid === playingStation) || 
    userStations.find(s => s.id === playingStation);
  const featuredStation = curatedStations[headerIndex];

  // Filter stations
  const filteredCurated = curatedStations.filter(s => {
    return s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUserStations = userStations.filter(s => {
    return s.station_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Twitch-style Left Sidebar */}
      <RadioLiveSidebar />
      
      {/* Mobile-First Header */}
      <header className="sticky top-0 z-50 bg-[#0e0e10] border-b border-white/5">
        <div className="flex items-center h-12 px-3 gap-2 lg:ml-56">
          {/* Mobile Nav - Horizontal scroll */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
            <button 
              onClick={() => navigate('/global-heatmap')}
              className="flex-shrink-0 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              Heatmap
            </button>
            <button 
              onClick={() => navigate('/podcasts')}
              className="flex-shrink-0 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              Podcast
            </button>
            <button 
              onClick={() => setActiveTab('discover')}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium ${activeTab === 'discover' ? 'text-[#53fc18] bg-[#53fc18]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              Discover
            </button>
            <button 
              onClick={() => setActiveTab('community')}
              className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-full font-medium ${activeTab === 'community' ? 'text-[#53fc18] bg-[#53fc18]/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
              Community
            </button>
            {user && (
              <button 
                onClick={() => navigate('/radio-feed')}
                className="flex-shrink-0 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                My Station
              </button>
            )}
          </div>

          {/* Search Toggle */}
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-white/60 hover:text-white"
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        {/* Expandable Search */}
        {showSearch && (
          <div className="px-3 pb-3 lg:ml-56">
            <Input
              placeholder="Search stations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border-white/10 text-sm h-9"
              autoFocus
            />
          </div>
        )}
      </header>

      {/* Main Content - with sidebar offset */}
      <main className={`lg:ml-56 ${currentPlayingStation ? 'pb-24' : ''}`}>
        {/* Hero Banner */}
        <div className="relative h-[200px] sm:h-[300px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e10] via-transparent to-transparent" />

          <div className="relative h-full flex items-end p-4 sm:p-6">
            <div className="flex items-end gap-4 w-full">
              <div 
                className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer"
                onClick={() => navigate(`/radio/${featuredStation?.stationuuid}`, { state: { station: featuredStation } })}
              >
                <Radio className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-semibold">
                    <span className="animate-pulse w-1 h-1 bg-white rounded-full" />
                    LIVE
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold truncate">{featuredStation?.name}</h1>
                <p className="text-white/60 text-xs sm:text-sm">{formatListeners(featuredStation?.clickcount || 0)} listeners</p>
                
                <div className="flex gap-2 mt-2">
                  <Button 
                    onClick={(e) => featuredStation && togglePlay(featuredStation.stationuuid, featuredStation.url_resolved || featuredStation.url, e)}
                    size="sm"
                    className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90 h-8 text-xs"
                  >
                    {playingStation === featuredStation?.stationuuid ? (
                      <><Pause className="h-3 w-3 mr-1" />Pause</>
                    ) : (
                      <><Play className="h-3 w-3 mr-1" />Listen</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content based on tab */}
        <div className="px-3 sm:px-4 py-4">
          {activeTab === 'discover' ? (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">All Stations</h2>
                <span className="text-xs text-white/50">{filteredCurated.length}</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCurated.map(station => (
                  <div
                    key={station.stationuuid}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/radio/${station.stationuuid}`, { state: { station } })}
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                      {station.favicon && (
                        <img src={station.favicon} alt={station.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {!station.favicon && <Radio className="h-8 w-8 text-white/30" />}
                      </div>
                      
                      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1 py-0.5 bg-red-600 rounded text-[7px] font-semibold">
                        <span className="animate-pulse w-1 h-1 bg-white rounded-full" />
                        LIVE
                      </div>

                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1 py-0.5 bg-black/80 rounded text-[8px]">
                        <Eye className="h-2.5 w-2.5" />
                        {formatListeners(station.clickcount)}
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => togglePlay(station.stationuuid, station.url_resolved || station.url, e)}
                          className="w-10 h-10 rounded-full bg-[#53fc18] flex items-center justify-center"
                        >
                          {playingStation === station.stationuuid ? (
                            <Pause className="h-5 w-5 text-black" />
                          ) : (
                            <Play className="h-5 w-5 text-black ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-1.5">
                      <p className="text-xs font-medium truncate">{station.name}</p>
                      <p className="text-[10px] text-white/50 truncate">{station.tags?.split(',')[0]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Community Stations</h2>
                <span className="text-xs text-white/50">{filteredUserStations.length}</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredUserStations.map(station => (
                  <div
                    key={station.id}
                    className="group cursor-pointer"
                  >
                    <div 
                      className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50"
                      onClick={() => station.stream_url && togglePlay(station.id, station.stream_url, { stopPropagation: () => {} } as React.MouseEvent)}
                    >
                      {station.cover_image_url ? (
                        <img src={station.cover_image_url} alt={station.station_name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : station.logo_url ? (
                        <img src={station.logo_url} alt={station.station_name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Radio className="h-8 w-8 text-white/30" />
                        </div>
                      )}
                      
                      {station.is_live && (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1 py-0.5 bg-red-600 rounded text-[7px] font-semibold">
                          <span className="animate-pulse w-1 h-1 bg-white rounded-full" />
                          LIVE
                        </div>
                      )}

                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1 py-0.5 bg-black/80 rounded text-[8px]">
                        <Eye className="h-2.5 w-2.5" />
                        {formatListeners(station.listener_count || 0)}
                      </div>

                      {station.stream_url && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-10 h-10 rounded-full bg-[#53fc18] flex items-center justify-center">
                            {playingStation === station.id ? (
                              <Pause className="h-5 w-5 text-black" />
                            ) : (
                              <Play className="h-5 w-5 text-black ml-0.5" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Profile Icon - Click to go to feed */}
                    <div className="mt-1.5 flex items-start gap-2">
                      <div 
                        className="w-7 h-7 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-[#53fc18] transition-all"
                        onClick={() => navigate(`/radio-feed/${station.user_id}`)}
                      >
                        {station.profile?.avatar_url ? (
                          <img src={station.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{station.station_name}</p>
                        <p className="text-[10px] text-white/50 truncate">
                          {station.profile?.full_name || station.profile?.username || 'Radio Host'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredUserStations.length === 0 && (
                <div className="text-center py-12">
                  <Radio className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50 text-sm">No community stations yet</p>
                  {user && (
                    <Button 
                      onClick={() => navigate('/radio-feed')}
                      className="mt-4 bg-[#53fc18] text-black hover:bg-[#53fc18]/90"
                      size="sm"
                    >
                      Create Your Station
                    </Button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Now Playing Bar */}
      {currentPlayingStation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#18181b] border-t border-white/10 p-2 lg:ml-56">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Radio className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 flex items-center gap-0.5 px-1 bg-red-500 rounded text-[6px] font-medium">
                LIVE
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {'name' in currentPlayingStation ? currentPlayingStation.name : currentPlayingStation.station_name}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {'tags' in currentPlayingStation ? currentPlayingStation.tags?.split(',')[0] : 'Community Radio'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/50 hidden sm:flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatListeners('clickcount' in currentPlayingStation ? currentPlayingStation.clickcount : currentPlayingStation.listener_count || 0)}
              </span>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  audioRef.current?.pause();
                  setPlayingStation(null);
                }}
                size="icon"
                className="h-9 w-9 rounded-full bg-[#53fc18] hover:bg-[#53fc18]/90"
              >
                <Pause className="h-4 w-4 text-black" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RadioStations;
