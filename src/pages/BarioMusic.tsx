import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, TrendingUp, Play, Pause, ChevronRight, ChevronLeft, 
  Volume2, X, Music, Upload, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UserUpload {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url: string;
  genre: string | null;
  play_count: number | null;
  like_count: number | null;
  duration_ms: number | null;
  user_id: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

const BarioMusic = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [filteredUploads, setFilteredUploads] = useState<UserUpload[]>([]);
  const [currentTrack, setCurrentTrack] = useState<UserUpload | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [loading, setLoading] = useState(true);

  const genres = [
    'Pop', 'Rap', 'Rock', 'R&B', 'Classical', 'Jazz', 'Soul & Funk',
    'Afro', 'Indie & Alternative', 'Latin Music', 'Dance & EDM',
    'Reggaeton', 'Electronic', 'Country', 'Metal', 'K-Pop',
    'Reggae', 'Blues', 'Folk', 'Lofi', 'Acoustic',
    'Caribbean', 'Japanese Music', 'AnimeVerse', 'Amapiano'
  ];

  useEffect(() => {
    fetchUploads();
  }, []);

  useEffect(() => {
    let filtered = uploads;
    
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (selectedGenre) {
      filtered = filtered.filter(u => u.genre?.toLowerCase() === selectedGenre.toLowerCase());
    }
    
    setFilteredUploads(filtered);
  }, [searchQuery, selectedGenre, uploads]);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      // Fetch uploads
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (uploadsError) throw uploadsError;

      // Fetch published remixes
      const { data: remixesData } = await supabase
        .from('remixes')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      // Convert remixes to the same shape as uploads
      const remixesAsUploads: UserUpload[] = (remixesData || []).map(r => ({
        id: r.id,
        title: r.title,
        description: r.prompt,
        cover_image_url: r.album_art_url,
        audio_url: r.remix_file_url || r.original_file_url || '',
        genre: r.genre,
        play_count: r.play_count,
        like_count: r.like_count,
        duration_ms: null,
        user_id: r.user_id,
        created_at: r.created_at,
      }));

      // Combine both lists
      const allTracks = [...(uploadsData || []), ...remixesAsUploads]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(allTracks.map(u => u.user_id))];
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .in('user_id', userIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.user_id] = p;
          return acc;
        }, {} as Record<string, any>);
      }

      // Merge profiles
      const tracksWithProfiles = allTracks.map(track => ({
        ...track,
        profiles: profilesMap[track.user_id] || null
      }));

      setUploads(tracksWithProfiles as UserUpload[]);
      setFilteredUploads(tracksWithProfiles as UserUpload[]);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = (track: UserUpload, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.src = track.audio_url;
      audioRef.current.play();
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number | null) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getArtistName = (upload: UserUpload) => {
    if (upload.profiles?.full_name) return upload.profiles.full_name;
    if (upload.profiles?.username) return upload.profiles.username;
    return 'Bario Artist';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hidden Audio Element */}
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          toast.error('Failed to play track');
        }}
      />
      
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
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <Input
                placeholder="Search music..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 h-8 w-32 sm:w-48 bg-white/5 border-white/10 text-xs placeholder:text-white/40 rounded-lg"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
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

        {/* Stats Bar */}
        <div className="border-t border-white/5 px-3 sm:px-6 py-2 flex items-center gap-4 sm:gap-6 text-[9px] sm:text-[10px] overflow-x-auto">
          <div className="flex items-center gap-1">
            <Music className="h-3 w-3 text-purple-400" />
            <span className="text-white/50">Tracks:</span>
            <span className="font-semibold text-white">{uploads.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Upload className="h-3 w-3 text-green-400" />
            <span className="text-white/50">Community Uploads</span>
          </div>
          <span className="text-[8px] text-green-400 animate-pulse">● LIVE</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-24 sm:pt-28 pb-24 px-3 sm:px-6">
        {/* Genre Filters */}
        <section className="mb-4">
          <div className="flex gap-2 pb-2 overflow-x-auto">
            <button
              onClick={() => setSelectedGenre('')}
              className={`px-3 py-1.5 rounded-full text-[9px] whitespace-nowrap transition-colors ${
                !selectedGenre ? 'bg-[#4ade80] text-black font-medium' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All Genres
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-full text-[9px] whitespace-nowrap transition-colors ${
                  selectedGenre === genre ? 'bg-[#4ade80] text-black font-medium' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </section>

        {/* Trending Section */}
        <section className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[11px] sm:text-sm font-semibold text-white">🎵 Trending on Bario</h2>
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-full">
                <TrendingUp className="h-3 w-3 text-purple-400" />
                <span className="text-[9px] text-purple-400">Community favorites</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {filteredUploads.slice(0, 8).map((track) => (
              <div
                key={track.id}
                onClick={() => navigate(`/bario-music/${track.id}`)}
                className="flex-shrink-0 flex items-center gap-2 sm:gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-2 sm:p-3 cursor-pointer transition-all min-w-[180px] sm:min-w-[220px] group"
              >
                <div className="relative">
                  <img 
                    src={track.cover_image_url || '/placeholder.svg'} 
                    alt={track.title} 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover" 
                  />
                  <button
                    onClick={(e) => playTrack(track, e)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                  >
                    {currentTrack?.id === track.id && isPlaying ? (
                      <Pause className="h-4 w-4 text-white" />
                    ) : (
                      <Play className="h-4 w-4 text-white" />
                    )}
                  </button>
                  {currentTrack?.id === track.id && isPlaying && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-medium text-white truncate">{track.title}</p>
                  <p className="text-[8px] sm:text-[9px] text-white/50 truncate">{getArtistName(track)}</p>
                  <div className="flex items-center gap-2 mt-1 text-[8px] text-white/40">
                    <span>{formatCount(track.play_count)} plays</span>
                    <span>•</span>
                    <span>{formatDuration(track.duration_ms)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All Music Grid */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] sm:text-sm font-semibold text-white">All Music</h2>
            <button className="text-[9px] sm:text-[10px] text-white/50 hover:text-white flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 animate-pulse">
                  <div className="aspect-square bg-white/10 rounded-lg mb-2" />
                  <div className="h-3 bg-white/10 rounded mb-1" />
                  <div className="h-2 bg-white/10 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="text-center py-12">
              <Music className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-sm">No music found</p>
              <p className="text-white/30 text-xs mt-1">Try a different search or genre</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredUploads.map((track) => (
                <div
                  key={track.id}
                  onClick={() => navigate(`/bario-music/${track.id}`)}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-3 cursor-pointer transition-all group"
                >
                  <div className="relative aspect-square mb-2">
                    <img 
                      src={track.cover_image_url || '/placeholder.svg'} 
                      alt={track.title} 
                      className="w-full h-full rounded-lg object-cover" 
                    />
                    <button
                      onClick={(e) => playTrack(track, e)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                    >
                      <div className="w-12 h-12 bg-[#4ade80] rounded-full flex items-center justify-center">
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="h-5 w-5 text-black" />
                        ) : (
                          <Play className="h-5 w-5 text-black ml-1" />
                        )}
                      </div>
                    </button>
                    {currentTrack?.id === track.id && isPlaying && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500 rounded-full">
                        <Volume2 className="h-3 w-3 text-black animate-pulse" />
                        <span className="text-[8px] text-black font-medium">PLAYING</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-medium text-white truncate">{track.title}</p>
                  <p className="text-[9px] text-white/50 truncate">{getArtistName(track)}</p>
                  <div className="flex items-center justify-between mt-2 text-[8px] text-white/40">
                    <span className="flex items-center gap-1">
                      <Play className="h-2.5 w-2.5" />
                      {formatCount(track.play_count)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-2.5 w-2.5" />
                      {formatCount(track.like_count)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Now Playing Bar */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3 max-w-6xl mx-auto">
            <img 
              src={currentTrack.cover_image_url || '/placeholder.svg'} 
              alt={currentTrack.title} 
              className="w-12 h-12 rounded-lg object-cover" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
              <p className="text-xs text-white/50 truncate">{getArtistName(currentTrack)}</p>
            </div>
            <button
              onClick={(e) => playTrack(currentTrack, e)}
              className="w-10 h-10 bg-[#4ade80] rounded-full flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-black" />
              ) : (
                <Play className="h-5 w-5 text-black ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarioMusic;
