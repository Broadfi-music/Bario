import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Flame, TrendingUp, Trophy, Crown, Star, Music, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StrikeTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  preview: string;
  strikes: number;
  votes: number;
  position: number;
  isHot: boolean;
  momentum: 'rising' | 'falling' | 'stable';
  genre: string;
  country: string;
}

const ThreeStrike = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<StrikeTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<StrikeTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [votedTracks, setVotedTracks] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState('GLOBAL');

  const countries = [
    { code: 'GLOBAL', name: '🌍 Global', flag: '🌍' },
    { code: 'US', name: 'USA', flag: '🇺🇸' },
    { code: 'UK', name: 'UK', flag: '🇬🇧' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵' },
    { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  ];

  useEffect(() => {
    fetchTracks();
  }, [selectedCountry]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      // Fetch from Deezer charts
      const response = await fetch(`https://api.deezer.com/chart/0/tracks?limit=30`);
      const data = await response.json();
      
      const strikeTracks: StrikeTrack[] = (data.data || []).map((track: any, index: number) => ({
        id: track.id.toString(),
        title: track.title,
        artist: track.artist.name,
        artwork: track.album?.cover_medium || track.album?.cover || '/src/assets/card-1.png',
        preview: track.preview || '',
        strikes: Math.floor(Math.random() * 3),
        votes: Math.floor(Math.random() * 50000) + 1000,
        position: index + 1,
        isHot: index < 5,
        momentum: index < 10 ? 'rising' : index < 20 ? 'stable' : 'falling',
        genre: ['Hip-Hop', 'Pop', 'R&B', 'Afrobeats', 'Electronic'][Math.floor(Math.random() * 5)],
        country: countries[Math.floor(Math.random() * countries.length)].code,
      }));
      
      // Filter by country if not global
      const filtered = selectedCountry === 'GLOBAL' 
        ? strikeTracks 
        : strikeTracks.filter(t => t.country === selectedCountry || Math.random() > 0.7);
      
      setTracks(filtered);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track: StrikeTrack) => {
    if (!track.preview) {
      toast.error('No preview available');
      return;
    }
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview;
        audioRef.current.play().catch(() => toast.error('Unable to play'));
      }
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleVote = (track: StrikeTrack, type: 'strike' | 'save') => {
    if (!user) {
      toast.error('Please sign in to vote');
      navigate('/auth');
      return;
    }
    
    if (votedTracks.has(track.id)) {
      toast.error('Already voted on this track');
      return;
    }
    
    setVotedTracks(prev => new Set([...prev, track.id]));
    
    if (type === 'strike') {
      setTracks(prev => prev.map(t => 
        t.id === track.id ? { ...t, strikes: Math.min(t.strikes + 1, 3) } : t
      ));
      toast.success('Strike added! 🔥');
    } else {
      setTracks(prev => prev.map(t => 
        t.id === track.id ? { ...t, votes: t.votes + 1, strikes: Math.max(t.strikes - 1, 0) } : t
      ));
      toast.success('Vote saved! ⭐');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStrikeColor = (strikes: number) => {
    if (strikes >= 3) return 'bg-red-500';
    if (strikes >= 2) return 'bg-orange-500';
    if (strikes >= 1) return 'bg-yellow-500';
    return 'bg-gray-600';
  };

  const getMomentumIcon = (momentum: string) => {
    if (momentum === 'rising') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (momentum === 'falling') return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    return <span className="w-3 h-3 bg-gray-500 rounded-full" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-orange-950/20 to-black text-white">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-orange-500/20">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/global-heatmap')} className="text-white/60 hover:text-white">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Three Strike
              </h1>
            </div>
          </div>
          
          {user ? (
            <Link to="/dashboard">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Country Filters */}
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-orange-500/10">
          {countries.map((country) => (
            <button
              key={country.code}
              onClick={() => setSelectedCountry(country.code)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                selectedCountry === country.code 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {country.flag} {country.name}
            </button>
          ))}
        </div>
      </header>

      {/* Rules Banner */}
      <div className="pt-28 px-4 pb-4">
        <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30 p-4">
          <h2 className="font-bold text-white mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            How Three Strike Works
          </h2>
          <div className="grid grid-cols-3 gap-4 text-xs text-white/70">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Strike songs you don't like</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Save songs you love</span>
            </div>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-purple-500" />
              <span>3 strikes = eliminated</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tracks Grid */}
      <main className="px-4 pb-24">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tracks.map((track) => (
              <Card 
                key={track.id} 
                className={`bg-white/5 border-white/10 p-3 hover:bg-white/10 transition-all ${
                  track.strikes >= 3 ? 'opacity-50 grayscale' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position & Strikes */}
                  <div className="flex flex-col items-center w-8">
                    <span className="text-lg font-bold text-white/50">#{track.position}</span>
                    <div className="flex gap-0.5 mt-1">
                      {[0, 1, 2].map((i) => (
                        <div 
                          key={i} 
                          className={`w-2 h-2 rounded-full ${i < track.strikes ? getStrikeColor(track.strikes) : 'bg-white/20'}`} 
                        />
                      ))}
                    </div>
                  </div>

                  {/* Artwork */}
                  <div 
                    className="relative w-14 h-14 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => handlePlay(track)}
                  >
                    <img 
                      src={track.artwork} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentTrack?.id === track.id && isPlaying ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white ml-1" />
                      )}
                    </div>
                    {track.isHot && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-0.5">
                        <Flame className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-white truncate">{track.title}</p>
                      {getMomentumIcon(track.momentum)}
                    </div>
                    <p className="text-xs text-white/50 truncate">{track.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-white/40">{formatNumber(track.votes)} votes</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded">{track.genre}</span>
                    </div>
                  </div>

                  {/* Vote Buttons */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVote(track, 'strike')}
                      disabled={votedTracks.has(track.id) || track.strikes >= 3}
                      className="h-8 w-8 p-0 text-orange-500 hover:bg-orange-500/20"
                    >
                      <Flame className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleVote(track, 'save')}
                      disabled={votedTracks.has(track.id)}
                      className="h-8 w-8 p-0 text-yellow-500 hover:bg-yellow-500/20"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Strike Warning */}
                {track.strikes >= 2 && track.strikes < 3 && (
                  <div className="mt-2 px-2 py-1 bg-red-500/20 rounded text-[10px] text-red-400 text-center">
                    ⚠️ One more strike and this track is OUT!
                  </div>
                )}
                {track.strikes >= 3 && (
                  <div className="mt-2 px-2 py-1 bg-red-500/30 rounded text-[10px] text-red-300 text-center">
                    ❌ ELIMINATED - 3 Strikes
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-orange-500/20 p-3">
          <div className="flex items-center gap-3">
            <img src={currentTrack.artwork} alt="" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-white/50 truncate">{currentTrack.artist}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handlePlay(currentTrack)}
              className="h-10 w-10 text-orange-500"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeStrike;
