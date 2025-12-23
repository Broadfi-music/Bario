import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Play, Users, Radio } from 'lucide-react';

interface LiveHost {
  id: string;
  host_id: string;
  title: string;
  listener_count: number;
  host_name?: string;
  host_avatar?: string;
  category?: string;
}

// Demo live hosts for the feed
const DEMO_LIVE_HOSTS: LiveHost[] = [
  {
    id: 'demo-1',
    host_id: 'host-1',
    title: 'The Rise of Afrobeats in America',
    listener_count: 1247,
    host_name: 'DJ Akademiks',
    host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'Music'
  },
  {
    id: 'demo-2',
    host_id: 'host-2',
    title: 'Producer Secrets: Making Hits',
    listener_count: 892,
    host_name: 'Metro Boomin',
    host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    category: 'Production'
  },
  {
    id: 'demo-3',
    host_id: 'host-3',
    title: 'K-Pop Global Domination',
    listener_count: 2341,
    host_name: 'Eric Nam',
    host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    category: 'K-Pop'
  },
  {
    id: 'demo-4',
    host_id: 'host-4',
    title: 'Latin Music Revolution',
    listener_count: 1567,
    host_name: 'J Balvin',
    host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    category: 'Latin'
  },
  {
    id: 'demo-5',
    host_id: 'host-5',
    title: 'Indie Artist Spotlight',
    listener_count: 654,
    host_name: 'Phoebe Bridgers',
    host_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    category: 'Indie'
  },
  {
    id: 'demo-6',
    host_id: 'host-1',
    title: 'Hip-Hop News Daily',
    listener_count: 3200,
    host_name: 'DJ Akademiks',
    host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'Hip-Hop'
  }
];

const formatViewers = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const PodcastFeed = () => {
  const [liveHosts, setLiveHosts] = useState<LiveHost[]>(DEMO_LIVE_HOSTS);
  const [categories] = useState(['All', 'Music', 'Hip-Hop', 'K-Pop', 'Latin', 'Indie', 'Production']);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  const fetchLiveSessions = async () => {
    const { data } = await supabase
      .from('podcast_sessions')
      .select('*')
      .eq('status', 'live')
      .order('listener_count', { ascending: false });

    if (data && data.length > 0) {
      setLiveHosts([...DEMO_LIVE_HOSTS, ...data.map(s => ({
        id: s.id,
        host_id: s.host_id,
        title: s.title,
        listener_count: s.listener_count || 0,
        host_name: 'Host',
        category: 'Music'
      }))]);
    }
  };

  const filteredHosts = selectedCategory === 'All' 
    ? liveHosts 
    : liveHosts.filter(h => h.category === selectedCategory);

  return (
    <div className="pt-20 pb-6 px-4">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-green-500 text-black' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommended Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Radio className="h-5 w-5 text-red-500" />
          Live Now
        </h2>
        
        {/* Grid - Kick.com style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHosts.map((host) => (
            <Link 
              key={host.id}
              to={`/podcast-host/${host.host_id}`}
              className="group block"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-800 mb-2">
                {/* Gradient background as placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-500/50 to-orange-500/50" />
                
                {/* Host avatar as center focus */}
                {host.host_avatar && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white/20">
                      <img 
                        src={host.host_avatar} 
                        alt={host.host_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                {/* Live badge */}
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
                
                {/* Viewer count */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {formatViewers(host.listener_count)} watching
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="h-12 w-12 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-700">
                  {host.host_avatar ? (
                    <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-white truncate group-hover:text-green-400 transition-colors">
                    {host.title}
                  </h3>
                  <p className="text-xs text-white/60 truncate">{host.host_name}</p>
                  {host.category && (
                    <span className="inline-block mt-1 text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded">
                      {host.category}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recommended Channels */}
      <div>
        <h2 className="text-lg font-bold mb-4">Recommended Channels</h2>
        <div className="space-y-2">
          {DEMO_LIVE_HOSTS.slice(0, 8).map((host) => (
            <Link
              key={`sidebar-${host.id}`}
              to={`/podcast-host/${host.host_id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700">
                  {host.host_avatar ? (
                    <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-green-400 transition-colors">
                  {host.host_name}
                </p>
                <p className="text-xs text-white/40 truncate">{host.category}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/40">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                {formatViewers(host.listener_count)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PodcastFeed;
