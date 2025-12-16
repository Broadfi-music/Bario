import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Play, Pause } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
import card5 from '@/assets/card-5.png';
import AnimatedDice from '@/components/AnimatedDice';
import globe from '@/assets/globe.png';
import download4 from '@/assets/download_4.gif';
import exploreInspire from '@/assets/explore-inspire.gif';
const Index = () => {
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const audioRefs = useRef<{
    [key: number]: HTMLAudioElement | null;
  }>({});
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
  }, {
    id: 5,
    title: "Easy Export & Share",
    description: "Download your remixes in high-quality formats and share them directly to your favorite platforms. Your music, your way.",
    image: card5
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            {featureCards.slice(0, 4).map(card => <div key={card.id} className="bg-black rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col items-start space-y-4 lg:space-y-6 hover:scale-[1.02] transition-transform duration-200">
                <div className="w-full aspect-square flex items-center justify-center">
                  <img src={card.image} alt={card.title} className="w-2/3 sm:w-3/4 h-2/3 sm:h-3/4 object-contain" />
                </div>
                <div className="space-y-2 lg:space-y-3">
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-foreground/70 text-xs sm:text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>)}
          </div>

          {/* Easy Export & Share with GIF */}
          <div className="mt-8 lg:mt-12 flex flex-col lg:flex-row items-center gap-4 lg:gap-8">
            <div className="flex-1 w-full bg-black rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col items-start space-y-4 lg:space-y-6">
              <div className="w-full aspect-square flex items-center justify-center">
                <img src={card5} alt="Easy Export & Share" className="w-2/3 sm:w-3/4 h-2/3 sm:h-3/4 object-contain" />
              </div>
              <div className="space-y-2 lg:space-y-3">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground">
                  Easy Export & Share
                </h3>
                <p className="text-foreground/70 text-xs sm:text-sm leading-relaxed">
                  Download your remixes in high-quality formats and share them directly to your favorite platforms. Your music, your way.
                </p>
              </div>
            </div>
            <div className="flex-1 w-full flex items-center justify-center">
              <img src={download4} alt="Animation" className="w-full h-auto rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Snap Campaign & Market Events Section */}
      <section className="py-8 lg:py-12 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              🎵 SNAPS Campaign
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-foreground/70 max-w-2xl mx-auto">
              Real-time music market events and top performing tracks. Stay ahead with live data on trending songs.
            </p>
          </div>

          {/* Market Events */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { title: 'Midnight Rush', artist: 'Nova Echo', event: 'Major playlist addition', change: '+15.2%', time: '36 min ago' },
              { title: 'Electric Dreams', artist: 'Synthwave Kid', event: 'Viral TikTok trend', change: '+12.8%', time: '42 min ago' },
              { title: 'Afro Vibes', artist: 'Lagos Sound', event: 'Radio momentum gain', change: '+28.5%', time: '1 hr ago' },
              { title: 'K-Pop Fire', artist: 'Seoul Stars', event: '10M video views', change: '+18.3%', time: '2 hrs ago' },
            ].map((event, i) => (
              <div key={i} className="bg-foreground/5 rounded-xl p-4 hover:bg-foreground/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-foreground">{event.title}</span>
                  <span className="text-xs text-green-400">{event.change}</span>
                </div>
                <p className="text-xs text-foreground/60 mb-1">{event.artist}</p>
                <p className="text-xs text-foreground/50">{event.event}</p>
                <p className="text-[10px] text-foreground/30 mt-2">{event.time}</p>
              </div>
            ))}
          </div>

          {/* Top Performing Music */}
          <div className="bg-foreground/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-foreground">🔥 Top Performing Music</span>
              <span className="text-[10px] text-green-400 animate-pulse">● LIVE</span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {['Midnight Rush', 'Electric Dreams', 'Golden Hour', 'Afro Vibes', 'K-Pop Fire', 'Summer Feels', 'Tokyo Drift', 'Neon Nights'].map((title, i) => (
                <div key={i} className={`bg-green-500/20 hover:bg-green-500/30 rounded-lg p-2 cursor-pointer transition-all ${i < 2 ? 'col-span-2 row-span-2' : ''}`}>
                  <p className="text-[9px] font-semibold text-foreground truncate">{title}</p>
                  <p className="text-[8px] text-green-400">+{(15 - i * 1.5).toFixed(1)}%</p>
                </div>
              ))}
            </div>
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