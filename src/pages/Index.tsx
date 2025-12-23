import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Play, Pause, TrendingUp, ExternalLink, Users, Calendar, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import track1 from '@/assets/track-1.jpeg';
import track2 from '@/assets/track-2.jpeg';
import track3 from '@/assets/track-3.jpeg';
import track4 from '@/assets/track-4.jpeg';
import track5 from '@/assets/track-5.jpeg';
import track6 from '@/assets/track-6.jpeg';
import track7 from '@/assets/track-7.jpeg';
import track8 from '@/assets/track-8.jpeg';
import card1 from '@/assets/card-1.png';
import card2 from '@/assets/card-2.png';
import card3 from '@/assets/card-3.png';
import card4 from '@/assets/card-4.png';
import AnimatedDice from '@/components/AnimatedDice';
import globe from '@/assets/globe.png';
import exploreInspire from '@/assets/explore-inspire.gif';
import { useHeatmapTracks } from '@/hooks/useHeatmapData';
import { supabase } from '@/integrations/supabase/client';

// Demo data for podcast section
const DEMO_CATEGORIES = [
  { id: 'music', name: 'Music', image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400', listener_count: 308200 },
  { id: 'hiphop', name: 'Hip-Hop', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400', listener_count: 149600 },
  { id: 'production', name: 'Production', image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400', listener_count: 51500 },
  { id: 'kpop', name: 'K-Pop', image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400', listener_count: 50900 },
  { id: 'latin', name: 'Latin', image: 'https://images.unsplash.com/photo-1504898770365-14faca6a7320?w=400', listener_count: 36300 },
  { id: 'indie', name: 'Indie', image: 'https://images.unsplash.com/photo-1485579149621-3123dd979571?w=400', listener_count: 27100 },
];

const DEMO_SCHEDULES = [
  { id: 'sch-1', host_id: 'host-1', host_name: 'DJ Akademiks', host_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', title: 'Weekly Hip-Hop Roundup', scheduled_at: new Date(Date.now() + 3600000 * 3).toISOString() },
  { id: 'sch-2', host_id: 'host-2', host_name: 'Metro Boomin', host_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400', title: 'Production Masterclass', scheduled_at: new Date(Date.now() + 3600000 * 8).toISOString() },
  { id: 'sch-3', host_id: 'host-3', host_name: 'Eric Nam', host_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400', title: 'K-Pop Deep Dive', scheduled_at: new Date(Date.now() + 3600000 * 24).toISOString() },
];

const formatViewers = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
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
const Index = () => {
  const navigate = useNavigate();
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const [heatmapPlayingId, setHeatmapPlayingId] = useState<string | null>(null);
  const heatmapAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useRef<{
    [key: number]: HTMLAudioElement | null;
  }>({});
  const [liveHosts, setLiveHosts] = useState<any[]>([]);

  // Fetch live podcast sessions
  useEffect(() => {
    const fetchLiveSessions = async () => {
      const { data } = await supabase
        .from('podcast_sessions')
        .select(`*, profiles:host_id (full_name, avatar_url, username)`)
        .eq('status', 'live')
        .order('listener_count', { ascending: false })
        .limit(6);
      
      if (data) {
        setLiveHosts(data.map(s => ({
          id: s.id,
          host_id: s.host_id,
          title: s.title,
          listener_count: s.listener_count || 0,
          host_name: (s.profiles as any)?.full_name || (s.profiles as any)?.username || 'Host',
          host_avatar: (s.profiles as any)?.avatar_url,
          cover_image_url: s.cover_image_url
        })));
      }
    };
    fetchLiveSessions();
  }, []);
  
  // Fetch real heatmap data
  const { tracks: heatmapTracks, summary, loading: heatmapLoading } = useHeatmapTracks(20);
  
  const tracks = [{
    id: 1,
    image: track1,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  }, {
    id: 2,
    image: track2,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  }, {
    id: 3,
    image: track3,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  }, {
    id: 4,
    image: track4,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }, {
    id: 5,
    image: track5,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  }, {
    id: 6,
    image: track6,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
  }, {
    id: 7,
    image: track7,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
  }, {
    id: 8,
    image: track8,
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  }];
  const featureCards = [{
    id: 1,
    title: "AI-Powered Remixing",
    description: "Transform any song into multiple genres instantly with our advanced AI technology. From amapiano to trap, your music adapts to any style.",
    image: card1
  }, {
    id: 2,
    title: "Lightning Speed Processing",
    description: "Get your remixed tracks in seconds, not hours. Our powerful processing engine delivers studio-quality results instantly.",
    image: card2
  }, {
    id: 3,
    title: "Professional Quality Output",
    description: "Experience high-fidelity audio that rivals professional studio productions. Every remix maintains the original's clarity and depth.",
    image: card3
  }, {
    id: 4,
    title: "Unlimited Creative Freedom",
    description: "Experiment with countless genres and styles. Create unlimited variations until you find the perfect sound for your vision.",
    image: card4
  }];
  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, []);
  const handleTrackClick = (trackId: number) => {
    const audio = audioRefs.current[trackId];
    if (playingTrack === trackId) {
      // Pause current track
      if (audio) {
        audio.pause();
      }
      setPlayingTrack(null);
    } else {
      // Pause all other tracks
      Object.entries(audioRefs.current).forEach(([id, audioElement]) => {
        if (audioElement && Number(id) !== trackId) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
      });

      // Play selected track
      if (audio) {
        audio.play();
        setPlayingTrack(trackId);
      }
    }
  };
  const handleAudioEnded = (trackId: number) => {
    setPlayingTrack(null);
  };
  return <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Navbar />
      <Hero />
      
      {/* Instant Processing Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Instant processing
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-foreground/70 max-w-3xl mx-auto px-2">
              Advanced AI processing delivers your remix in seconds, not hours, giving you studio-quality transformation without delay. Your audio is analyzed, reconstructed, styled, and rendered at high speed, so you can experiment freely, create multiple versions instantly, and keep your creative flow going without ever waiting.
            </p>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {tracks.map(track => <div key={track.id} className="relative">
                <button onClick={() => handleTrackClick(track.id)} className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-foreground/5 hover:scale-[1.02] transition-transform duration-200 w-full">
                  <img src={track.image} alt={`Track ${track.id}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className={`rounded-full p-3 sm:p-4 transition-all duration-200 ${playingTrack === track.id ? 'bg-foreground/90 scale-110' : 'bg-foreground/80'}`}>
                      {playingTrack === track.id ? <Pause className="h-6 w-6 sm:h-8 sm:w-8 text-background fill-background" /> : <Play className="h-6 w-6 sm:h-8 sm:w-8 text-background fill-background" />}
                    </div>
                  </div>
                </button>
                <audio ref={el => {
              audioRefs.current[track.id] = el;
            }} src={track.audio} onEnded={() => handleAudioEnded(track.id)} />
              </div>)}
          </div>
        </div>
      </section>

      {/* Everything You Need Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-center mb-8 lg:mb-16 px-2">
            Everything you need to elevate<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>and make music your career
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featureCards.map(card => <div key={card.id} className="bg-black rounded-2xl p-4 sm:p-6 flex flex-col items-start space-y-4 hover:scale-[1.02] transition-transform duration-200">
                <div className="w-full aspect-square flex items-center justify-center">
                  <img src={card.image} alt={card.title} className="w-2/3 sm:w-3/4 h-2/3 sm:h-3/4 object-contain" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-foreground/70 text-xs sm:text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Podcast Feed Section */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 border-t border-foreground/5 bg-[#0e0e10]">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">🎙️ Live Podcasts</h2>
              <p className="text-sm text-white/60">Tune into live music discussions and shows</p>
            </div>
            <Link to="/podcasts" className="flex items-center gap-1 text-sm text-[#53fc18] hover:underline">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Top Live Categories */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Top Live Categories</h3>
              <Link to="/podcasts" className="text-[10px] text-[#53fc18] hover:underline">View all</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {DEMO_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => navigate('/podcasts')}
                  className="flex-shrink-0 w-28 sm:w-32 cursor-pointer group"
                >
                  <div className="relative aspect-[4/5] rounded-lg overflow-hidden mb-1.5">
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs font-bold text-white truncate">{cat.name}</p>
                      <p className="text-[9px] text-white/60">{formatViewers(cat.listener_count)} viewers</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Schedules */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#53fc18]" />
                Upcoming Schedules
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEMO_SCHEDULES.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/host/${schedule.host_id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                      {schedule.host_avatar ? (
                        <img src={schedule.host_avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{schedule.title}</p>
                      <p className="text-xs text-white/50">{schedule.host_name}</p>
                    </div>
                    <span className="text-[10px] bg-[#53fc18]/20 text-[#53fc18] px-2 py-0.5 rounded">
                      {formatScheduleTime(schedule.scheduled_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Heatmap Campaign & Market Events Section */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                🔥 Heatmap Campaign
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 max-w-2xl mx-auto">
                Real-time music market events and top performing tracks. Stay ahead with live data on trending songs.
              </p>
            </div>
            <Link to="/global-heatmap" className="hidden sm:flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors">
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Hidden audio element for heatmap tracks */}
          <audio 
            ref={heatmapAudioRef} 
            onEnded={() => setHeatmapPlayingId(null)}
          />

          {/* Market Events from real data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {(heatmapTracks.slice(0, 4).length > 0 ? heatmapTracks.slice(0, 4) : [
              { id: '1', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', metrics: { change24h: 15.2 }, artwork: '' },
              { id: '2', title: 'APT.', artist: 'ROSÉ & Bruno Mars', metrics: { change24h: 12.8 }, artwork: '' },
              { id: '3', title: 'Timeless', artist: 'The Weeknd', metrics: { change24h: 28.5 }, artwork: '' },
              { id: '4', title: 'Who', artist: 'Jimin', metrics: { change24h: 18.3 }, artwork: '' },
            ]).map((track, i) => (
              <div 
                key={track.id} 
                className="bg-foreground/5 rounded-xl p-4 hover:bg-foreground/10 transition-colors cursor-pointer group"
                onClick={() => {
                  if ('previewUrl' in track && track.previewUrl && heatmapAudioRef.current) {
                    if (heatmapPlayingId === track.id) {
                      heatmapAudioRef.current.pause();
                      setHeatmapPlayingId(null);
                    } else {
                      heatmapAudioRef.current.src = track.previewUrl;
                      heatmapAudioRef.current.play();
                      setHeatmapPlayingId(track.id);
                    }
                  }
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  {'artwork' in track && track.artwork && (
                    <img src={track.artwork} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{track.title}</span>
                      <span className={`text-xs ${track.metrics.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {track.metrics.change24h >= 0 ? '+' : ''}{track.metrics.change24h.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-foreground/60">{track.artist}</p>
                  </div>
                  {'previewUrl' in track && track.previewUrl && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      heatmapPlayingId === track.id ? 'bg-green-500' : 'bg-foreground/10 group-hover:bg-foreground/20'
                    }`}>
                      {heatmapPlayingId === track.id ? (
                        <Pause className="h-3 w-3 text-background" />
                      ) : (
                        <Play className="h-3 w-3 text-foreground" />
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground/50">
                  {i === 0 ? 'Major playlist addition' : i === 1 ? 'Viral TikTok trend' : i === 2 ? 'Radio momentum gain' : 'Streaming milestone'}
                </p>
                <p className="text-[10px] text-foreground/30 mt-2">{Math.floor(Math.random() * 60) + 10} min ago</p>
              </div>
            ))}
          </div>

          {/* Top Performing Music from real data */}
          <div className="bg-foreground/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold text-foreground">Top Performing Music</span>
                <span className="text-[10px] text-green-400 animate-pulse">● LIVE</span>
              </div>
              {summary && (
                <span className="text-xs text-foreground/50">
                  {summary.totalTracks} tracks • {summary.totalListeners > 1000000 ? `${(summary.totalListeners / 1000000).toFixed(1)}M` : summary.totalListeners} listeners
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {(heatmapTracks.filter(t => t.metrics.change24h > 0).slice(0, 12).length > 0 
                ? heatmapTracks.filter(t => t.metrics.change24h > 0).slice(0, 12)
                : ['Die With A Smile', 'APT.', 'Timeless', 'Who', 'Luther', 'Birds of a Feather', 'Taste', 'Too Sweet', 'Blinding Lights', 'Shape of You', 'Bad Guy', 'Old Town Road'].map((title, i) => ({
                    id: `fallback-${i}`,
                    title,
                    artwork: `https://images.unsplash.com/photo-${1493225457124 + i * 100000}-a3eb161ffa5f?w=200`,
                    metrics: { change24h: 15 - i * 1.2 }
                  }))
              ).map((track, i) => (
                <Link
                  to="/global-heatmap"
                  key={track.id} 
                  className="bg-foreground/5 hover:bg-foreground/10 rounded-lg overflow-hidden cursor-pointer transition-all group"
                >
                  <div className="aspect-square relative">
                    {'artwork' in track && track.artwork ? (
                      <img src={track.artwork} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-500/30 to-teal-500/30 flex items-center justify-center">
                        <TrendingUp className="h-8 w-8 text-green-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] font-semibold text-white truncate">{track.title}</p>
                      <p className="text-[9px] text-green-400">+{track.metrics.change24h.toFixed(1)}%</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="text-center mt-6">
            <Link 
              to="/global-heatmap" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-full font-semibold hover:bg-foreground/90 transition-colors text-sm"
            >
              Explore Global Heatmap <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* MEGASHUFFLE Section */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-6 lg:gap-12">
            <div className="flex-1 space-y-4 lg:space-y-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                MEGASHUFFLE
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 leading-relaxed">
                World's Largest Randomized Music discovery Engine that every shuffle introduces an artist the listener has never heard before. Artist get exposure instantly.
              </p>
            </div>
            <div className="flex-1 flex justify-center w-full max-w-sm lg:max-w-none">
              <AnimatedDice />
            </div>
          </div>
        </div>
      </section>

      {/* MUSICWARP Section */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
            <div className="flex-1 space-y-4 lg:space-y-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                MUSICWARP (Artist Teleportation)
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 leading-relaxed">
                Artists shift their music into world regions through sound filters. Regional Virality boost global charts. This "regional virality booster" helps artists test, expand, and accelerate their reach across global charts by adapting their music to cultural sound identities. Instead of being limited to their local genre, artists can teleport their sound into any region's dominant style and grow worldwide.
              </p>
            </div>
            <div className="flex-1 flex justify-center w-full">
              <img src={globe} alt="Global music distribution" className="w-full max-w-xs sm:max-w-sm lg:max-w-md h-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* Explore and Get Inspired Section */}
      <section className="relative w-full -mt-16 lg:-mt-32">
        <div className="relative w-full">
          <img src={exploreInspire} alt="Explore and Get Inspired" className="w-full h-auto object-cover" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-6xl font-bold text-white tracking-wider text-center">
              EXPLORE AND GET INSPIRED
            </h2>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground text-center mb-8 lg:mb-16">
            Choose your plan
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
            {/* Creator Free */}
            <div className="bg-foreground/5 rounded-2xl p-6 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Creator Free</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-foreground">$0</span>
                  <span className="text-foreground/60 ml-2">/month</span>
                </div>
              </div>
              
              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                Get Started
              </button>
              
              <ul className="space-y-2 flex-1 text-xs">
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>  4 SongTime Machine transformations/month</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>3 MusicWarp regional filters</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Lite BeatPulse matching</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Basic MEGASHUFFLE discovery</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Limited ViralPath daily missions</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Low-priority exports</span>
                </li>
              </ul>
              <p className="text-foreground/50 text-xs mt-4 italic">
                Perfect for exploring before you upgrade.
              </p>
            </div>

            {/* Creator Basic */}
            <div className="bg-foreground/5 rounded-2xl p-6 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Creator Basic</h3>
                <p className="text-foreground/60 text-xs mb-4">For artists and everyday creators.</p>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-foreground">$5</span>
                  <span className="text-foreground/60 ml-2">/month</span>
                </div>
              </div>
              
              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                Subscribe
              </button>
              
              <ul className="space-y-2 flex-1 text-xs">
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span> 20 SongTime Machine transformations</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>10 MusicWarp filters</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Basic BeatPulse waveform matching</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Full ViralPath missions</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Access to global discovery challenges</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Standard export quality</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Community badge for visibility</span>
                </li>
              </ul>
              <p className="text-foreground/50 text-xs mt-4 italic">
                A powerful entry point for fast growth.
              </p>
            </div>

            {/* Creator Pro */}
            <div className="bg-foreground/5 rounded-2xl p-6 flex flex-col border-2 border-foreground relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-4 py-1 rounded-full text-xs font-semibold">
                Most Popular
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Creator Pro</h3>
                <p className="text-foreground/60 text-xs mb-4">For serious artists ready to accelerate.</p>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-foreground">$12</span>
                  <span className="text-foreground/60 ml-2">/month</span>
                </div>
              </div>
              
              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                Subscribe
              </button>
              
              <ul className="space-y-2 flex-1 text-xs">
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span> 100 SongTime Machine time jumps</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span> 100 MusicWarp regional filters</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Full BeatPulse access (deep energy analysis)</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Detailed SceneVibe performance analytics</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Higher ViralPath ranking priority</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Priority HQ WAV exports</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Creator spotlight boosts in MEGASHUFFLE</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Smart creative recommendations</span>
                </li>
              </ul>
              <p className="text-foreground/50 text-xs mt-4 italic">
                Turn your creativity into global momentum.
              </p>
            </div>

            {/* Label Basic */}
            <div className="bg-foreground/5 rounded-2xl p-6 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Label Basic</h3>
                <p className="text-foreground/60 text-xs mb-4">For small teams, managers, and multi-artist accounts.</p>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-foreground">$29</span>
                  <span className="text-foreground/60 ml-2">/month</span>
                </div>
              </div>
              
              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                Subscribe
              </button>
              
              <ul className="space-y-2 flex-1 text-xs">
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Everything in Creator Pro</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Manage up to 5 artists</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Artist growth dashboard</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Weekly audience insights</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Release timing suggestions</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Basic heat-map data for regions</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Early access to new filters/features</span>
                </li>
              </ul>
              <p className="text-foreground/50 text-xs mt-4 italic">
                Perfect for managers building new stars.
              </p>
            </div>

            {/* Label Pro */}
            <div className="bg-foreground/5 rounded-2xl p-6 flex flex-col relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground/20 text-foreground px-4 py-1 rounded-full text-xs font-semibold">
                Best Value
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">Label Pro</h3>
                <p className="text-foreground/60 text-xs mb-4">For professional labels, influencers, and music businesses.</p>
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-bold text-foreground">$49</span>
                  <span className="text-foreground/60 ml-2">/month</span>
                </div>
              </div>
              
              <button className="w-full bg-foreground text-background py-3 rounded-full font-semibold mb-6 hover:bg-foreground/90 transition-colors text-sm">
                Subscribe
              </button>
              
              <ul className="space-y-2 flex-1 text-xs">
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>All tools in Label Basic</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Up to 20 artist profiles</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Advanced audience heat-map intelligence</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>AI-powered release strategy generator</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Smart distribution support tools</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Data-driven TikTok/YouTube challenge planner</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Priority in global discovery engines</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>VIP early feature access</span>
                </li>
                <li className="text-foreground/70 flex items-start">
                  <span className="mr-2">•</span>
                  <span>Dedicated support</span>
                </li>
              </ul>
              <p className="text-foreground/50 text-xs mt-4 italic">
                Your full-scale, AI-powered music operations suite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Radio Station Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-12">
            <div className="flex-1 space-y-4 lg:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full">
                <span className="text-red-500 text-sm animate-pulse">●</span>
                <span className="text-red-400 text-xs font-medium">LIVE NOW</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                🎙️ Bario Radio
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 leading-relaxed">
                24/7 live radio streaming the hottest tracks from around the world. AI-curated playlists, artist takeovers, and exclusive premieres. Tune in and discover your next favorite song.
              </p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <button className="px-6 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-colors text-sm flex items-center gap-2">
                  <Play className="h-4 w-4 fill-white" />
                  Listen Live
                </button>
                <button className="px-6 py-3 bg-foreground/10 text-foreground rounded-full font-semibold hover:bg-foreground/20 transition-colors text-sm">
                  View Schedule
                </button>
              </div>
            </div>
            <div className="flex-1 w-full max-w-md">
              <div className="bg-gradient-to-br from-red-500/20 via-orange-500/10 to-yellow-500/20 rounded-2xl p-6 border border-foreground/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div>
                    <p className="text-foreground font-semibold">Now Playing</p>
                    <p className="text-foreground/60 text-sm">Afrobeats Takeover • DJ Spinall</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-foreground/50">
                    <span>Live listeners</span>
                    <span className="text-red-400">2.4K listening</span>
                  </div>
                  <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Podcast Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              🎧 Bario Podcast
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-foreground/70 max-w-2xl mx-auto">
              Weekly episodes featuring artist interviews, industry insights, and behind-the-scenes stories from the world of music.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {[
              { title: 'The Rise of Afrobeats', guest: 'Burna Boy', duration: '45 min', episode: 'EP 24' },
              { title: 'Breaking into K-Pop', guest: 'Industry Insider', duration: '38 min', episode: 'EP 23' },
              { title: 'AI in Music Production', guest: 'Tech Panel', duration: '52 min', episode: 'EP 22' },
            ].map((podcast, i) => (
              <div key={i} className="bg-foreground/5 rounded-2xl p-5 hover:bg-foreground/10 transition-colors cursor-pointer group">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-3xl">🎙️</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground/40 text-xs">{podcast.episode}</span>
                    <h4 className="text-foreground font-semibold text-sm sm:text-base truncate">{podcast.title}</h4>
                    <p className="text-foreground/60 text-xs">{podcast.guest}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-foreground/40 text-xs">{podcast.duration}</span>
                      <button className="text-foreground/60 hover:text-foreground transition-colors">
                        <Play className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-foreground/10 text-foreground rounded-full font-semibold hover:bg-foreground/20 transition-colors text-sm">
              View All Episodes <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-foreground/5 py-8 lg:py-16 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12 mb-8 lg:mb-12">
            {/* Brand Section */}
            <div>
              <h3 className="text-foreground font-semibold text-base lg:text-lg mb-3 lg:mb-4">Brand</h3>
              <ul className="space-y-2 lg:space-y-3">
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">About</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Blog</a></li>
                <li><a href="/pricing" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Pricing</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Hub</a></li>
              </ul>
            </div>

            {/* Support Section */}
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <h3 className="text-foreground font-semibold text-base lg:text-lg mb-3 lg:mb-4">Support</h3>
              <ul className="space-y-2 lg:space-y-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-x-4">
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Help</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Contact us</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Community guidelines</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">FAQ</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Terms of service</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-xs sm:text-sm">Privacy policy</a></li>
              </ul>
            </div>
          </div>

          <div className="text-center text-foreground/60 pt-6 lg:pt-8 border-t border-foreground/5">
            <p className="text-xs sm:text-sm">© 2025 Bario. Transforming music with AI.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;