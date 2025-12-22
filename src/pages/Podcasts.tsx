import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Mic, Clock, Heart, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const podcasts = [
  { id: 1, name: 'Music Industry Secrets', host: 'DJ Akademiks', category: 'Music Industry', episodes: 245, rating: 4.8, duration: '45 min', artwork: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300', latestEpisode: 'The Rise of Afrobeats in America' },
  { id: 2, name: 'The Producer Pod', host: 'Metro Boomin', category: 'Production', episodes: 120, rating: 4.9, duration: '60 min', artwork: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300', latestEpisode: 'Creating Beats That Go Viral' },
  { id: 3, name: 'Lyrical Breakdown', host: 'Cole Bennett', category: 'Hip-Hop', episodes: 89, rating: 4.7, duration: '55 min', artwork: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300', latestEpisode: 'Breaking Down Kendricks Latest' },
  { id: 4, name: 'Afrobeats Weekly', host: 'Adesope Live', category: 'Afrobeats', episodes: 156, rating: 4.6, duration: '40 min', artwork: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=300', latestEpisode: 'Wizkid vs Davido: The Debate' },
  { id: 5, name: 'K-Pop Universe', host: 'Eric Nam', category: 'K-Pop', episodes: 78, rating: 4.9, duration: '50 min', artwork: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300', latestEpisode: 'NewJeans Breaking Records' },
  { id: 6, name: 'Electronic Frontiers', host: 'Diplo', category: 'EDM', episodes: 200, rating: 4.5, duration: '65 min', artwork: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300', latestEpisode: 'The Future of Dance Music' },
  { id: 7, name: 'Indie Discovery', host: 'Phoebe Bridgers', category: 'Indie', episodes: 95, rating: 4.8, duration: '35 min', artwork: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300', latestEpisode: 'Underground Artists to Watch' },
  { id: 8, name: 'Latin Rhythms', host: 'J Balvin', category: 'Latin', episodes: 134, rating: 4.7, duration: '45 min', artwork: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=300', latestEpisode: 'Reggaetons Global Takeover' },
];

const Podcasts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Music Industry', 'Hip-Hop', 'Afrobeats', 'K-Pop', 'EDM', 'Production'];

  const filteredPodcasts = selectedCategory === 'All' 
    ? podcasts 
    : podcasts.filter(p => p.category === selectedCategory);

  const toggleFavorite = (id: number) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-[#4ade80]" />
            <span className="font-bold">Podcasts</span>
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
            <h1 className="text-3xl font-bold mb-2">Music Podcasts</h1>
            <p className="text-white/60 text-sm">Discover conversations about music, artists, and the industry</p>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-[#4ade80] text-black font-medium' 
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredPodcasts.map(podcast => (
              <Card key={podcast.id} className="bg-white/[0.03] border-white/5 overflow-hidden group hover:bg-white/[0.06] transition-colors cursor-pointer">
                <div className="relative">
                  <img src={podcast.artwork} alt={podcast.name} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-[#4ade80] flex items-center justify-center">
                      <Play className="h-8 w-8 text-black ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-full">
                    <span className="text-[9px] text-white/80">{podcast.category}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{podcast.name}</h3>
                      <p className="text-[10px] text-white/50">by {podcast.host}</p>
                    </div>
                    <button onClick={() => toggleFavorite(podcast.id)} className="text-white/40 hover:text-red-400 ml-2">
                      <Heart className={`h-4 w-4 ${favorites.includes(podcast.id) ? 'fill-red-400 text-red-400' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-2 mb-3">
                    <p className="text-[9px] text-white/40 mb-1">Latest Episode</p>
                    <p className="text-[10px] text-white truncate">{podcast.latestEpisode}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px]">
                    <div className="flex items-center gap-1 text-white/40">
                      <Clock className="h-3 w-3" />
                      <span>{podcast.duration}</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="h-3 w-3 fill-yellow-400" />
                      <span>{podcast.rating}</span>
                    </div>
                    <span className="text-white/40">{podcast.episodes} eps</span>
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

export default Podcasts;
