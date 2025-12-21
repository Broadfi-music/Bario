import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, X, Music, Plus, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  source: string;
  previewUrl?: string;
}

const CreatePrediction = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedSong, setSelectedSong] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-search', {
        body: { query: searchQuery, limit: 10 }
      });

      if (error) throw error;

      const results: SearchResult[] = [];
      
      // Add Deezer results
      if (data?.deezer?.data) {
        data.deezer.data.forEach((track: any) => {
          results.push({
            id: `deezer-${track.id}`,
            title: track.title,
            artist: track.artist?.name || 'Unknown',
            artwork: track.album?.cover_medium || track.album?.cover || '/placeholder.svg',
            source: 'deezer',
            previewUrl: track.preview
          });
        });
      }

      // Add Spotify results
      if (data?.spotify?.tracks?.items) {
        data.spotify.tracks.items.forEach((track: any) => {
          results.push({
            id: `spotify-${track.id}`,
            title: track.name,
            artist: track.artists?.[0]?.name || 'Unknown',
            artwork: track.album?.images?.[0]?.url || '/placeholder.svg',
            source: 'spotify',
            previewUrl: track.preview_url
          });
        });
      }

      // Add Audius results
      if (data?.audius?.data) {
        data.audius.data.forEach((track: any) => {
          results.push({
            id: `audius-${track.id}`,
            title: track.title,
            artist: track.user?.name || 'Unknown',
            artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'] || '/placeholder.svg',
            source: 'audius'
          });
        });
      }

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Failed to search songs');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      toast.error('Please sign in to create a prediction');
      navigate('/auth');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a prediction title');
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from('user_predictions').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        song_id: selectedSong?.id || null,
        song_title: selectedSong?.title || null,
        artist_name: selectedSong?.artist || null,
        song_artwork: selectedSong?.artwork || null,
        song_source: selectedSong?.source || null,
        status: 'active'
      });

      if (error) throw error;

      toast.success('Prediction created successfully!');
      navigate('/music-alpha');
    } catch (err) {
      console.error('Create error:', err);
      toast.error('Failed to create prediction');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4">
          <button 
            onClick={() => navigate('/music-alpha')} 
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Back to Alpha</span>
          </button>
          
          <h1 className="text-sm font-semibold">Create Prediction</h1>
          
          <div className="w-20" />
        </div>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">
              Prediction Title *
            </label>
            <Input
              placeholder="e.g., This song will hit 1M streams by next week"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">
              Description (optional)
            </label>
            <textarea
              placeholder="Add more context about your prediction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">
              <Image className="h-3 w-3 inline mr-1" />
              Cover Image URL (optional)
            </label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            {imageUrl && (
              <div className="mt-2">
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Add Song */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">
              <Music className="h-3 w-3 inline mr-1" />
              Add Song (optional)
            </label>
            
            {selectedSong ? (
              <Card className="bg-white/5 border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedSong.artwork} 
                    alt="" 
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{selectedSong.title}</p>
                    <p className="text-xs text-white/50">{selectedSong.artist}</p>
                    <span className="text-[10px] text-purple-400 capitalize">{selectedSong.source}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedSong(null)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {!showSearch ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowSearch(true)}
                    className="w-full border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add a song to your prediction
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                          placeholder="Search for a song..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchSongs()}
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                        />
                      </div>
                      <Button 
                        onClick={searchSongs}
                        disabled={isSearching}
                        className="bg-purple-500 hover:bg-purple-600"
                      >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="text-white/50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="max-h-60 overflow-y-auto space-y-2 bg-white/5 rounded-lg p-2">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            onClick={() => {
                              setSelectedSong(result);
                              setShowSearch(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                          >
                            <img 
                              src={result.artwork} 
                              alt="" 
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white truncate">{result.title}</p>
                              <p className="text-[10px] text-white/50">{result.artist}</p>
                            </div>
                            <span className="text-[9px] text-purple-400 capitalize px-1.5 py-0.5 bg-purple-500/20 rounded">
                              {result.source}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
            className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Prediction'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreatePrediction;
