import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Radio, Globe, Heart, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const radioStations = [
  { id: 1, name: 'Afrobeats FM', genre: 'Afrobeats', country: '🇳🇬 Nigeria', listeners: '1.2M', streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv', artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300' },
  { id: 2, name: 'Hip-Hop Nation', genre: 'Hip-Hop', country: '🇺🇸 USA', listeners: '890K', streamUrl: 'https://stream.zeno.fm/vnzf3p50n38uv', artwork: 'https://images.unsplash.com/photo-1571609866754-77a6ad4a8d8c?w=300' },
  { id: 3, name: 'K-Pop Central', genre: 'K-Pop', country: '🇰🇷 South Korea', listeners: '2.1M', streamUrl: 'https://stream.zeno.fm/9cxyg93ah2zuv', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' },
  { id: 4, name: 'UK Vibes', genre: 'UK Drill', country: '🇬🇧 UK', listeners: '650K', streamUrl: 'https://stream.zeno.fm/d0cxnf02gfquv', artwork: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300' },
  { id: 5, name: 'Latin Heat', genre: 'Reggaeton', country: '🇵🇷 Puerto Rico', listeners: '1.5M', streamUrl: 'https://stream.zeno.fm/8fv9u2qhnzzuv', artwork: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300' },
  { id: 6, name: 'Amapiano 24/7', genre: 'Amapiano', country: '🇿🇦 South Africa', listeners: '780K', streamUrl: 'https://stream.zeno.fm/0r0xa792kwzuv', artwork: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=300' },
  { id: 7, name: 'Indie Dreams', genre: 'Indie', country: '🌍 Global', listeners: '420K', streamUrl: 'https://stream.zeno.fm/f5z5phcpev5uv', artwork: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300' },
  { id: 8, name: 'Electronic Pulse', genre: 'EDM', country: '🌍 Global', listeners: '980K', streamUrl: 'https://stream.zeno.fm/8h2n2hgd8qhvv', artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300' },
];

const RadioStations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingStation, setPlayingStation] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);

  const togglePlay = (station: typeof radioStations[0]) => {
    if (playingStation === station.id) {
      audioRef.current?.pause();
      setPlayingStation(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = station.streamUrl;
        audioRef.current.play();
        setPlayingStation(station.id);
      }
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <audio ref={audioRef} />
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#4ade80]" />
            <span className="font-bold">Radio Stations</span>
          </div>
          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="bg-white text-black hover:bg-white/90 text-xs h-8 px-4 rounded-lg font-medium">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-white text-black hover:bg-white/90 text-xs h-8 px-4 rounded-lg font-medium">
                Log In
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="pt-20 pb-6 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Live Radio Stations</h1>
            <p className="text-white/60 text-sm">Stream live music from around the world</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {radioStations.map(station => (
              <Card key={station.id} className="bg-white/[0.03] border-white/5 overflow-hidden group hover:bg-white/[0.06] transition-colors">
                <div className="relative">
                  <img src={station.artwork} alt={station.name} className="w-full aspect-square object-cover" />
                  <button
                    onClick={() => togglePlay(station)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${playingStation === station.id ? 'bg-[#4ade80]' : 'bg-white'}`}>
                      {playingStation === station.id ? (
                        <Pause className="h-8 w-8 text-black" />
                      ) : (
                        <Play className="h-8 w-8 text-black ml-1" />
                      )}
                    </div>
                  </button>
                  {playingStation === station.id && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[#4ade80] rounded-full">
                      <Volume2 className="h-3 w-3 text-black animate-pulse" />
                      <span className="text-[9px] text-black font-medium">LIVE</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{station.name}</h3>
                      <p className="text-[10px] text-white/50">{station.genre}</p>
                    </div>
                    <button onClick={() => toggleFavorite(station.id)} className="text-white/40 hover:text-red-400">
                      <Heart className={`h-4 w-4 ${favorites.includes(station.id) ? 'fill-red-400 text-red-400' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="text-white/40">{station.country}</span>
                    <span className="text-[#4ade80]">{station.listeners} listeners</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RadioStations;
