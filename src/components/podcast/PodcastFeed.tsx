import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, Users, Play, Calendar, Headphones } from 'lucide-react';

interface LiveHost {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  listener_count: number;
  host_name?: string;
  host_avatar?: string;
  category?: string;
  cover_image_url?: string;
}

interface Category {
  id: string;
  name: string;
  image: string;
  listener_count: number;
  tags: string[];
}

// Demo categories matching Kick.com style
const DEMO_CATEGORIES: Category[] = [
  { id: 'music', name: 'Music', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', listener_count: 308200, tags: ['Live', 'Casual'] },
  { id: 'hiphop', name: 'Hip-Hop', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', listener_count: 149600, tags: ['Beats', 'Culture'] },
  { id: 'production', name: 'Production', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', listener_count: 51500, tags: ['Studio'] },
  { id: 'kpop', name: 'K-Pop', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', listener_count: 50900, tags: ['Dance', 'Culture'] },
  { id: 'latin', name: 'Latin', image: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400', listener_count: 36300, tags: ['Reggaeton', 'Salsa'] },
  { id: 'indie', name: 'Indie', image: 'https://images.unsplash.com/photo-1485579149621-3123dd979571?w=400', listener_count: 27100, tags: ['Alternative'] },
  { id: 'irl', name: 'IRL', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400', listener_count: 24400, tags: ['Podcast', 'Talk'] },
  { id: 'jazz', name: 'Jazz', image: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400', listener_count: 21100, tags: ['Smooth', 'Live'] },
];

// Demo live hosts
const DEMO_LIVE_HOSTS: LiveHost[] = [
  {
    id: 'demo-1',
    host_id: 'host-1',
    title: 'The Rise of Afrobeats in America',
    description: 'Discussing how Afrobeats is taking over the US music scene with special guests',
    listener_count: 1247,
    host_name: 'DJ Akademiks',
    host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'Music',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
  },
  {
    id: 'demo-2',
    host_id: 'host-2',
    title: 'Producer Secrets: Making Hits',
    description: 'Live production session and Q&A',
    listener_count: 892,
    host_name: 'Metro Boomin',
    host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    category: 'Production',
    cover_image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800'
  },
  {
    id: 'demo-3',
    host_id: 'host-3',
    title: 'K-Pop Global Domination',
    description: 'How K-Pop conquered the world',
    listener_count: 2341,
    host_name: 'Eric Nam',
    host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    category: 'K-Pop',
    cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'
  },
  {
    id: 'demo-4',
    host_id: 'host-4',
    title: 'Latin Music Revolution',
    description: 'Reggaeton and its global impact',
    listener_count: 1567,
    host_name: 'J Balvin',
    host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    category: 'Latin',
    cover_image_url: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=800'
  },
  {
    id: 'demo-5',
    host_id: 'host-5',
    title: 'Indie Artist Spotlight',
    description: 'Underground artists you need to know',
    listener_count: 654,
    host_name: 'Phoebe Bridgers',
    host_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    category: 'Indie',
    cover_image_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979571?w=800'
  },
  {
    id: 'demo-6',
    host_id: 'host-1',
    title: 'Hip-Hop News Daily',
    description: 'Breaking news and hot takes',
    listener_count: 3200,
    host_name: 'DJ Akademiks',
    host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    category: 'Hip-Hop',
    cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
  }
];

// Demo schedules
const DEMO_SCHEDULES = [
  { id: 'sch-1', host_id: 'host-1', host_name: 'DJ Akademiks', host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', title: 'Weekly Hip-Hop Roundup', description: 'Breaking down the week\'s biggest stories', scheduled_at: new Date(Date.now() + 3600000 * 3).toISOString() },
  { id: 'sch-2', host_id: 'host-2', host_name: 'Metro Boomin', host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', title: 'Production Masterclass', description: 'Learn beat-making techniques', scheduled_at: new Date(Date.now() + 3600000 * 8).toISOString() },
  { id: 'sch-3', host_id: 'host-3', host_name: 'Eric Nam', host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', title: 'K-Pop Deep Dive', description: 'Exploring the latest K-Pop trends', scheduled_at: new Date(Date.now() + 3600000 * 24).toISOString() },
  { id: 'sch-4', host_id: 'host-4', host_name: 'J Balvin', host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', title: 'Latin Music Hour', description: 'Celebrating Latin rhythms', scheduled_at: new Date(Date.now() + 3600000 * 48).toISOString() },
];

// Demo episodes
const DEMO_EPISODES = [
  { id: 'ep-1', host_id: 'host-1', host_name: 'DJ Akademiks', host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', title: 'The Evolution of Hip-Hop', cover_image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', play_count: 125000, duration_ms: 3600000 },
  { id: 'ep-2', host_id: 'host-2', host_name: 'Metro Boomin', host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', title: 'Behind the Beats', cover_image_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', play_count: 98000, duration_ms: 2700000 },
  { id: 'ep-3', host_id: 'host-3', host_name: 'Eric Nam', host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', title: 'K-Pop Global Impact', cover_image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', play_count: 87000, duration_ms: 3200000 },
  { id: 'ep-4', host_id: 'host-4', host_name: 'J Balvin', host_avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', title: 'Reggaeton Revolution', cover_image_url: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400', play_count: 156000, duration_ms: 4200000 },
  { id: 'ep-5', host_id: 'host-5', host_name: 'Phoebe Bridgers', host_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', title: 'Indie Discoveries', cover_image_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979571?w=400', play_count: 67000, duration_ms: 2400000 },
  { id: 'ep-6', host_id: 'host-1', host_name: 'DJ Akademiks', host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', title: 'Industry Secrets', cover_image_url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', play_count: 142000, duration_ms: 3900000 },
];

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
};

const formatScheduleTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Starting soon';
  if (hours < 24) return `In ${hours}h`;
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
};

const PodcastFeed = () => {
  const navigate = useNavigate();
  const [liveHosts, setLiveHosts] = useState<LiveHost[]>(DEMO_LIVE_HOSTS);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLiveSessions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('podcast-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'podcast_sessions' }, () => {
        fetchLiveSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveSessions = async () => {
    const { data } = await supabase
      .from('podcast_sessions')
      .select(`
        *,
        profiles:host_id (
          full_name,
          avatar_url,
          username
        )
      `)
      .eq('status', 'live')
      .order('listener_count', { ascending: false });

    if (data && data.length > 0) {
      const realSessions = data.map(s => ({
        id: s.id,
        host_id: s.host_id,
        title: s.title,
        description: s.description || '',
        listener_count: s.listener_count || 0,
        host_name: (s.profiles as any)?.full_name || (s.profiles as any)?.username || 'Host',
        host_avatar: (s.profiles as any)?.avatar_url || null,
        category: 'Music',
        cover_image_url: s.cover_image_url
      }));
      setLiveHosts([...realSessions, ...DEMO_LIVE_HOSTS]);
    }
  };

  const heroHosts = liveHosts.slice(0, 5);
  const currentHero = heroHosts[heroIndex];

  const nextHero = () => setHeroIndex((prev) => (prev + 1) % heroHosts.length);
  const prevHero = () => setHeroIndex((prev) => (prev - 1 + heroHosts.length) % heroHosts.length);

  // Auto-rotate hero
  useEffect(() => {
    const timer = setInterval(nextHero, 8000);
    return () => clearInterval(timer);
  }, [heroHosts.length]);

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white pb-16 lg:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex fixed left-0 top-12 bottom-0 w-56 flex-col bg-[#18181b] border-r border-white/5 overflow-y-auto z-40">
        <div className="p-3">
          <h3 className="text-[10px] font-semibold text-white/50 uppercase mb-2 tracking-wider">Recommended</h3>
          <div className="space-y-0.5">
            {liveHosts.slice(0, 10).map((host) => (
              <div
                key={`sidebar-${host.id}`}
                className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div 
                  className="relative flex-shrink-0"
                  onClick={() => navigate(`/host/${host.host_id}`)}
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-700">
                    {host.host_avatar ? (
                      <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#18181b]" />
                </div>
                <Link 
                  to={`/podcasts?session=${host.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-white truncate group-hover:text-[#53fc18]">
                    {host.host_name}
                  </p>
                  <p className="text-xs text-white/40 truncate">{host.category}</p>
                </Link>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  {formatViewers(host.listener_count)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-56 pt-14 pb-8 px-0">
        {/* Hero Carousel - Kick.com Style - Mobile Optimized */}
        {currentHero && (
          <div className="relative px-3 lg:px-6 mb-4 lg:mb-6">
            <div 
              ref={heroRef}
              className="relative rounded-lg overflow-hidden bg-gradient-to-r from-purple-900/50 to-pink-900/50"
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 lg:gap-6 p-3 lg:p-6">
                {/* Hero Info */}
                <div className="flex-1 min-w-0 z-10 order-2 sm:order-1">
                  <div className="flex items-center gap-2 lg:gap-3 mb-2 lg:mb-3">
                    <div 
                      className="w-8 h-8 lg:w-12 lg:h-12 rounded-full overflow-hidden ring-2 ring-[#53fc18] cursor-pointer hover:ring-white transition-colors"
                      onClick={() => navigate(`/host/${currentHero.host_id}`)}
                    >
                      {currentHero.host_avatar ? (
                        <img src={currentHero.host_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm lg:text-lg font-bold flex items-center gap-2">
                        <span 
                          className="cursor-pointer hover:text-[#53fc18] transition-colors"
                          onClick={() => navigate(`/host/${currentHero.host_id}`)}
                        >
                          {currentHero.host_name}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] lg:text-sm font-normal text-white/60">
                          <Users className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          {formatViewers(currentHero.listener_count)} listening
                        </span>
                      </h2>
                    </div>
                  </div>
                  <h3 className="text-sm lg:text-lg font-medium mb-1 lg:mb-2 line-clamp-2">{currentHero.title}</h3>
                  <p className="text-xs lg:text-sm text-white/60 line-clamp-1 lg:line-clamp-2 mb-2 lg:mb-3">{currentHero.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-xs bg-white/10 px-2 py-0.5 lg:py-1 rounded">{currentHero.category}</span>
                  </div>
                </div>

                {/* Hero Thumbnail - Show on mobile too */}
                <Link 
                  to={`/podcasts?session=${currentHero.id}`}
                  className="relative w-full sm:w-40 lg:w-64 aspect-video rounded-lg overflow-hidden group flex-shrink-0 order-1 sm:order-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-500/50 to-orange-500/50" />
                  {currentHero.cover_image_url && (
                    <img src={currentHero.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 lg:h-10 lg:w-10 text-white" fill="white" />
                  </div>
                  <div className="absolute top-1.5 left-1.5 lg:top-2 lg:left-2 bg-red-600 text-white text-[9px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded flex items-center gap-0.5 lg:gap-1">
                    <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </Link>
              </div>

              {/* Carousel Controls */}
              <div className="absolute bottom-2 lg:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:gap-2">
                <button onClick={prevHero} className="p-0.5 lg:p-1 rounded-full bg-black/50 hover:bg-black/70">
                  <ChevronLeft className="h-3 w-3 lg:h-4 lg:w-4" />
                </button>
                <div className="flex gap-1">
                  {heroHosts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-colors ${i === heroIndex ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
                <button onClick={nextHero} className="p-0.5 lg:p-1 rounded-full bg-black/50 hover:bg-black/70">
                  <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Live Categories - Kick.com Style - Mobile Scrollable */}
        <section className="px-3 lg:px-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Top Live Categories</h2>
            <button onClick={() => navigate('/podcasts')} className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          {/* Mobile: horizontal scroll, Desktop: grid */}
          <div className="flex lg:grid lg:grid-cols-6 xl:grid-cols-8 gap-2 lg:gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 lg:mx-0 lg:px-0 lg:overflow-visible">
            {DEMO_CATEGORIES.map((cat) => {
              const categorySession = liveHosts.find(h => h.category?.toLowerCase() === cat.name.toLowerCase());
              return (
                <div 
                  key={cat.id} 
                  className="group cursor-pointer flex-shrink-0 w-24 lg:w-auto"
                  onClick={() => categorySession ? navigate(`/podcasts?session=${categorySession.id}`) : null}
                >
                  <div className="aspect-[3/4] rounded-lg overflow-hidden mb-1.5 relative">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5">
                      <p className="text-[10px] lg:text-xs font-bold text-white truncate">{cat.name}</p>
                    </div>
                  </div>
                  <p className="text-[9px] lg:text-[10px] text-white/50 hidden lg:block">{formatViewers(cat.listener_count)} listening</p>
                  <div className="hidden lg:flex gap-1 mt-1 flex-wrap">
                    {cat.tags.map((tag) => (
                      <span key={tag} className="text-[8px] lg:text-[9px] bg-white/10 text-white/70 px-1 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Sessions - Mobile optimized */}
        <section className="px-3 lg:px-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold">Music</h2>
            <button onClick={() => navigate('/podcasts')} className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4">
            {liveHosts.map((host) => (
              <Link 
                key={host.id}
                to={`/podcasts?session=${host.id}`}
                className="group block"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-neutral-800 mb-1.5">
                  {host.cover_image_url ? (
                    <img src={host.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-pink-500/50 to-orange-500/50" />
                  )}
                  
                  {/* Live badge */}
                  <div className="absolute top-1 left-1 lg:top-2 lg:left-2 bg-red-600 text-white text-[8px] lg:text-[10px] font-bold px-1.5 lg:px-2 py-0.5 rounded flex items-center gap-0.5 lg:gap-1">
                    <span className="w-1 h-1 lg:w-1.5 lg:h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                  
                  {/* Listener count */}
                  <div className="absolute bottom-1 left-1 lg:bottom-2 lg:left-2 bg-black/70 text-white text-[8px] lg:text-[10px] px-1.5 lg:px-2 py-0.5 rounded">
                    {formatViewers(host.listener_count)} listening
                  </div>

                  {/* Hover overlay - desktop only */}
                  <div className="hidden lg:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                    <Play className="h-10 w-10 text-white" fill="white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex gap-1.5 lg:gap-2">
                  <div 
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-700 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/host/${host.host_id}`);
                    }}
                  >
                    {host.host_avatar ? (
                      <img src={host.host_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[11px] lg:text-sm font-medium text-white truncate group-hover:text-[#53fc18] transition-colors">
                      {host.title}
                    </h3>
                    <p className="text-[10px] lg:text-xs text-white/50 truncate">{host.host_name}</p>
                    <span className="hidden lg:inline-block mt-1 text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                      {host.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Schedules Section */}
        <section className="px-3 lg:px-6 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#53fc18]" />
              Upcoming Schedules
            </h2>
            <button className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          <div className="flex lg:grid lg:grid-cols-4 gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-3 px-3 lg:mx-0 lg:px-0 lg:overflow-visible">
            {DEMO_SCHEDULES.map((schedule) => (
              <div 
                key={schedule.id}
                className="flex-shrink-0 w-64 lg:w-auto bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/host/${schedule.host_id}`)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700">
                    <img src={schedule.host_avatar} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{schedule.host_name}</p>
                    <p className="text-[10px] text-[#53fc18]">{formatScheduleTime(schedule.scheduled_at)}</p>
                  </div>
                </div>
                <h3 className="text-sm font-medium line-clamp-1 mb-1">{schedule.title}</h3>
                <p className="text-[10px] text-white/50 line-clamp-2">{schedule.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Episodes Section */}
        <section className="px-3 lg:px-6 mt-8 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Headphones className="h-4 w-4 text-[#53fc18]" />
              Episodes
            </h2>
            <button className="text-[10px] text-[#53fc18] hover:underline">View all</button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {DEMO_EPISODES.map((episode) => (
              <div 
                key={episode.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/host/${episode.host_id}`)}
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-2">
                  <img src={episode.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" fill="white" />
                  </div>
                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                    {formatDuration(episode.duration_ms)}
                  </div>
                </div>
                <h3 className="text-xs font-medium line-clamp-2 mb-1 group-hover:text-[#53fc18] transition-colors">{episode.title}</h3>
                <p className="text-[10px] text-white/50 truncate">{episode.host_name}</p>
                <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
                  <Play className="h-2.5 w-2.5" />
                  {formatViewers(episode.play_count)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PodcastFeed;
