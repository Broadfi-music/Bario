import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Flame, TrendingUp, Trophy, Crown, Star, Music, Heart, RefreshCw } from 'lucide-react';
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
  saves: number;
  position: number;
  isHot: boolean;
  momentum: 'rising' | 'falling' | 'stable';
  genre: string;
  country: string;
}

interface StrikeVote {
  track_id: string;
  vote_type: 'strike' | 'save';
}

const ThreeStrike = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<StrikeTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<StrikeTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userVotes, setUserVotes] = useState<Map<string, 'strike' | 'save'>>(new Map());
  const [selectedCountry, setSelectedCountry] = useState('GLOBAL');
  const [refreshing, setRefreshing] = useState(false);

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

  // Country-specific artists for regional trending music
  const countryArtists: Record<string, string[]> = {
    'GLOBAL': ['Drake', 'Taylor Swift', 'The Weeknd', 'Bad Bunny', 'BTS', 'Dua Lipa'],
    'US': ['Drake', 'Kendrick Lamar', 'Taylor Swift', 'The Weeknd', 'SZA', 'Post Malone', 'Travis Scott', 'Morgan Wallen', 'Billie Eilish', 'Doja Cat'],
    'UK': ['Central Cee', 'Ed Sheeran', 'Dua Lipa', 'Dave', 'Stormzy', 'Little Simz', 'Tion Wayne', 'Headie One', 'Digga D', 'Aitch'],
    'NG': ['Wizkid', 'Burna Boy', 'Davido', 'Rema', 'Asake', 'Ayra Starr', 'Tems', 'Omah Lay', 'Ckay', 'Fireboy DML', 'Shallipopi', 'Seyi Vibez'],
    'GH': ['Sarkodie', 'Shatta Wale', 'Stonebwoy', 'Black Sherif', 'King Promise', 'Gyakie', 'Camidoh', 'Kidi', 'Kuami Eugene'],
    'ZA': ['Tyla', 'Kabza De Small', 'DJ Maphorisa', 'Nasty C', 'Cassper Nyovest', 'Master KG', 'Focalistic', 'Young Stunna'],
    'KE': ['Sauti Sol', 'Nyashinski', 'Khaligraph Jones', 'Otile Brown', 'Nviiri the Storyteller', 'Bien'],
    'BR': ['Anitta', 'Ludmilla', 'MC Livinho', 'Luisa Sonza', 'Pedro Sampaio', 'Mc Cabelinho'],
    'JP': ['YOASOBI', 'Ado', 'King Gnu', 'Fujii Kaze', 'Mrs. GREEN APPLE', 'Kenshi Yonezu', 'Official HIGE DANdism'],
    'KR': ['BTS', 'BLACKPINK', 'Stray Kids', 'NewJeans', 'aespa', 'IVE', 'LE SSERAFIM', 'SEVENTEEN', 'NCT'],
    'FR': ['Aya Nakamura', 'Jul', 'Ninho', 'Damso', 'Gazo', 'Tiakola', 'SDM', 'Niska'],
    'DE': ['Apache 207', 'Luciano', 'RAF Camora', 'Capital Bra', 'Bonez MC', 'Kontra K', 'Bushido'],
  };

  // Fetch user votes from database
  const fetchUserVotes = useCallback(async () => {
    if (!user) return;
    
    const { data: votes } = await supabase
      .from('strike_votes')
      .select('track_id, vote_type')
      .eq('user_id', user.id);
    
    if (votes) {
      const voteMap = new Map<string, 'strike' | 'save'>();
      votes.forEach((v: StrikeVote) => voteMap.set(v.track_id, v.vote_type as 'strike' | 'save'));
      setUserVotes(voteMap);
    }
  }, [user]);

  // Fetch all vote counts for tracks
  const fetchVoteCounts = useCallback(async (trackIds: string[]) => {
    if (trackIds.length === 0) return new Map<string, { strikes: number; saves: number }>();
    
    const { data: votes } = await supabase
      .from('strike_votes')
      .select('track_id, vote_type')
      .in('track_id', trackIds);
    
    const counts = new Map<string, { strikes: number; saves: number }>();
    trackIds.forEach(id => counts.set(id, { strikes: 0, saves: 0 }));
    
    if (votes) {
      votes.forEach((v: StrikeVote) => {
        const current = counts.get(v.track_id) || { strikes: 0, saves: 0 };
        if (v.vote_type === 'strike') {
          current.strikes++;
        } else {
          current.saves++;
        }
        counts.set(v.track_id, current);
      });
    }
    
    return counts;
  }, []);

  useEffect(() => {
    fetchTracks();
    fetchUserVotes();
  }, [selectedCountry, fetchUserVotes]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      // Build URL with query parameters - the edge function uses GET params not body
      const params = new URLSearchParams({
        country: selectedCountry,
        limit: '50'
      });
      
      // Add timestamp to bust cache and get fresh data
      params.append('_t', Date.now().toString());
      
      const response = await fetch(
        `https://sufbohhsxlrefkoubmed.supabase.co/functions/v1/heatmap-tracks?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1ZmJvaGhzeGxyZWZrb3VibWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODY3NjAsImV4cCI6MjA4MDQ2Mjc2MH0.1Ms3xhguJjQ-bbPronddzgO-XCYcTZTkcWS-uUMg1q4'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`ThreeStrike: Fetched ${data?.tracks?.length || 0} tracks for ${selectedCountry}`);
      
      if (!data?.tracks || data.tracks.length === 0) {
        toast.error('No tracks available for this region');
        setLoading(false);
        return;
      }
      
      // Filter tracks with playable previews and shuffle for variety
      let allTracks = data.tracks
        .filter((track: any) => track.previewUrl || track.preview_url)
        .sort(() => Math.random() - 0.5) // Shuffle for variety each time
        .map((track: any) => ({
          id: track.id || `track-${Math.random().toString(36).substr(2, 9)}`,
          title: track.title,
          artist: track.artist || track.artist_name,
          artwork: track.artwork || track.cover_image_url || '/src/assets/card-1.png',
          preview: track.previewUrl || track.preview_url,
          source: track.source || 'deezer',
          genre: track.genre || 'Pop'
        }));
      
      // Fallback: Add Audius tracks for GLOBAL filter if edge function returns few tracks
      if (selectedCountry === 'GLOBAL' && allTracks.length < 10) {
        try {
          const audiusResponse = await fetch('https://discoveryprovider.audius.co/v1/tracks/trending?limit=10&app_name=Bario');
          const audiusData = await audiusResponse.json();
          
          if (audiusData.data && audiusData.data.length > 0) {
            const audiusTracks = audiusData.data
              .filter((track: any) => track.artwork?.['480x480'] || track.artwork?.['150x150'])
              .map((track: any) => ({
                id: `audius-${track.id}`,
                title: track.title,
                artist: track.user?.name || 'Unknown Artist',
                artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'] || '/src/assets/card-1.png',
                preview: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream?app_name=Bario`,
                source: 'audius',
                genre: 'Indie'
              }));
            
            allTracks = [...allTracks, ...audiusTracks];
          }
        } catch (audiusError) {
          console.warn('Audius API fallback error:', audiusError);
        }
      }
      
      // Ensure we have tracks
      if (allTracks.length === 0) {
        toast.error('No playable tracks available');
        setLoading(false);
        return;
      }
      
      // Shuffle and limit
      allTracks = allTracks.sort(() => Math.random() - 0.5).slice(0, 30);
      
      const trackIds = allTracks.map((track: any) => track.id);
      const voteCounts = await fetchVoteCounts(trackIds);
      
      const strikeTracks: StrikeTrack[] = allTracks.map((track: any, index: number) => {
        const counts = voteCounts.get(track.id) || { strikes: 0, saves: 0 };
        return {
          id: track.id,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork,
          preview: track.preview,
          strikes: counts.strikes,
          saves: counts.saves,
          position: index + 1,
          isHot: index < 5,
          momentum: counts.saves > counts.strikes ? 'rising' : counts.strikes > counts.saves ? 'falling' : 'stable',
          genre: track.genre || 'Pop',
          country: selectedCountry,
        };
      });
      
      // Sort by popularity (saves - strikes)
      strikeTracks.sort((a, b) => (b.saves - b.strikes) - (a.saves - a.strikes));
      
      setTracks(strikeTracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      toast.error('Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTracks();
    await fetchUserVotes();
    setRefreshing(false);
    toast.success('Tracks refreshed!');
  };

  const handlePlay = (track: StrikeTrack) => {
    if (!track.preview) {
      toast.error('No preview available for this track');
      return;
    }
    
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        // Set up error handler before playing
        audioRef.current.onerror = () => {
          console.error('Audio playback error for:', track.title);
          toast.error('Unable to play this track. Try another one.');
          setIsPlaying(false);
          setCurrentTrack(null);
        };
        
        audioRef.current.oncanplay = () => {
          console.log('Audio ready to play:', track.title);
        };
        
        audioRef.current.src = track.preview;
        audioRef.current.play()
          .then(() => {
            console.log('Playing:', track.title);
          })
          .catch((err) => {
            console.error('Playback error:', err);
            toast.error('Unable to play. Try another track.');
            setIsPlaying(false);
            setCurrentTrack(null);
          });
      }
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleVote = async (track: StrikeTrack, type: 'strike' | 'save') => {
    if (!user) {
      toast.error('Please sign in to vote');
      navigate('/auth');
      return;
    }
    
    const existingVote = userVotes.get(track.id);
    
    if (existingVote === type) {
      toast.error(`Already ${type === 'strike' ? 'struck' : 'saved'} this track`);
      return;
    }
    
    // Optimistic update
    const newVotes = new Map(userVotes);
    newVotes.set(track.id, type);
    setUserVotes(newVotes);
    
    // Update track counts optimistically
    setTracks(prev => prev.map(t => {
      if (t.id !== track.id) return t;
      
      let newStrikes = t.strikes;
      let newSaves = t.saves;
      
      // Remove old vote if exists
      if (existingVote === 'strike') newStrikes--;
      if (existingVote === 'save') newSaves--;
      
      // Add new vote
      if (type === 'strike') newStrikes++;
      if (type === 'save') newSaves++;
      
      return {
        ...t,
        strikes: newStrikes,
        saves: newSaves,
        momentum: newSaves > newStrikes ? 'rising' : newStrikes > newSaves ? 'falling' : 'stable',
      };
    }));
    
    try {
      if (existingVote) {
        // Update existing vote
        await supabase
          .from('strike_votes')
          .update({ vote_type: type })
          .eq('track_id', track.id)
          .eq('user_id', user.id);
      } else {
        // Insert new vote
        await supabase
          .from('strike_votes')
          .insert({
            track_id: track.id,
            user_id: user.id,
            vote_type: type,
          });
      }
      
      toast.success(type === 'strike' ? 'Strike added! 🔥' : 'Vote saved! ⭐');
    } catch (error) {
      console.error('Error voting:', error);
      // Rollback optimistic update
      const rolledBack = new Map(userVotes);
      if (existingVote) {
        rolledBack.set(track.id, existingVote);
      } else {
        rolledBack.delete(track.id);
      }
      setUserVotes(rolledBack);
      toast.error('Failed to vote');
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-white/60 hover:text-white"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-black text-white hover:bg-black/90 text-xs">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-black text-white hover:bg-black/90 text-xs">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
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
            {tracks.map((track) => {
              const userVote = userVotes.get(track.id);
              const isEliminated = track.strikes >= 3;
              
              return (
                <Card 
                  key={track.id} 
                  className={`bg-white/5 border-white/10 p-3 hover:bg-white/10 transition-all ${
                    isEliminated ? 'opacity-50 grayscale' : ''
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
                        <span className="text-[10px] text-green-400">{track.saves} saves</span>
                        <span className="text-[10px] text-red-400">{track.strikes} strikes</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded">{track.genre}</span>
                      </div>
                    </div>

                    {/* Vote Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(track, 'strike')}
                        disabled={isEliminated}
                        className={`h-8 w-8 p-0 ${userVote === 'strike' ? 'bg-orange-500/30 text-orange-400' : 'text-orange-500 hover:bg-orange-500/20'}`}
                      >
                        <Flame className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleVote(track, 'save')}
                        disabled={isEliminated}
                        className={`h-8 w-8 p-0 ${userVote === 'save' ? 'bg-yellow-500/30 text-yellow-400' : 'text-yellow-500 hover:bg-yellow-500/20'}`}
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
                  {isEliminated && (
                    <div className="mt-2 px-2 py-1 bg-red-500/30 rounded text-[10px] text-red-300 text-center">
                      ❌ ELIMINATED - 3 Strikes
                    </div>
                  )}
                </Card>
              );
            })}
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