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
import AnimatedCD from '@/components/AnimatedCD';
import AnimatedDice from '@/components/AnimatedDice';
import AnimatedSaturn from '@/components/AnimatedSaturn';

const Index = () => {
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});

  const tracks = [
    { id: 1, image: track1, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 2, image: track2, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 3, image: track3, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 4, image: track4, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { id: 5, image: track5, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
    { id: 6, image: track6, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
    { id: 7, image: track7, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
    { id: 8, image: track8, audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  ];

  const featureCards = [
    {
      id: 1,
      title: "AI-Powered Remixing",
      description: "Transform any song into multiple genres instantly with our advanced AI technology. From amapiano to trap, your music adapts to any style.",
      image: card1
    },
    {
      id: 2,
      title: "Lightning Speed Processing",
      description: "Get your remixed tracks in seconds, not hours. Our powerful processing engine delivers studio-quality results instantly.",
      image: card2
    },
    {
      id: 3,
      title: "Professional Quality Output",
      description: "Experience high-fidelity audio that rivals professional studio productions. Every remix maintains the original's clarity and depth.",
      image: card3
    },
    {
      id: 4,
      title: "Unlimited Creative Freedom",
      description: "Experiment with countless genres and styles. Create unlimited variations until you find the perfect sound for your vision.",
      image: card4
    },
    {
      id: 5,
      title: "Easy Export & Share",
      description: "Download your remixes in high-quality formats and share them directly to your favorite platforms. Your music, your way.",
      image: card5
    }
  ];

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      
      {/* Instant Processing Section */}
      <section className="py-20 px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Instant processing
            </h2>
            <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
              Advanced AI processing delivers your remix in seconds, not hours, giving you studio-quality transformation without delay. Your audio is analyzed, reconstructed, styled, and rendered at high speed, so you can experiment freely, create multiple versions instantly, and keep your creative flow going without ever waiting.
            </p>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.map((track) => (
              <div key={track.id} className="relative">
                <button
                  onClick={() => handleTrackClick(track.id)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-foreground/5 hover:scale-[1.02] transition-transform duration-200 w-full"
                >
                  <img 
                    src={track.image} 
                    alt={`Track ${track.id}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className={`rounded-full p-4 transition-all duration-200 ${
                      playingTrack === track.id 
                        ? 'bg-foreground/90 scale-110' 
                        : 'bg-foreground/80'
                    }`}>
                      {playingTrack === track.id ? (
                        <Pause className="h-8 w-8 text-background fill-background" />
                      ) : (
                        <Play className="h-8 w-8 text-background fill-background" />
                      )}
                    </div>
                  </div>
                </button>
                <audio
                  ref={(el) => { audioRefs.current[track.id] = el; }}
                  src={track.audio}
                  onEnded={() => handleAudioEnded(track.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything You Need Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground text-center mb-16">
            Everything you need to elevate<br />
            and make music your career
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCards.map((card) => (
              <div 
                key={card.id} 
                className="bg-black rounded-2xl p-8 flex flex-col items-start space-y-6 hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="w-full aspect-square flex items-center justify-center">
                  <img 
                    src={card.image} 
                    alt={card.title}
                    className="w-3/4 h-3/4 object-contain"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="text-foreground/70 text-sm leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BeatPulse Waveform Matcher Section */}
      <section className="py-12 px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                BeatPulse Waveform Matcher
              </h2>
              <p className="text-lg text-foreground/70 leading-relaxed">
                A waveform matching protocol that helps artists find beat that perfectly match their vocal energy by analysing pitch and Cadence with AI. It creates a frictionless experience where every uploaded vocal is matched with the ideal beat structure, tempo pocket, and dynamic mood using AI-powered waveform alignment.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <AnimatedCD />
            </div>
          </div>
        </div>
      </section>

      {/* MEGASHUFFLE Section */}
      <section className="py-12 px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                MEGASHUFFLE
              </h2>
              <p className="text-lg text-foreground/70 leading-relaxed">
                World's Largest Randomized Music discovery Engine that every shuffle introduces an artist the listener has never heard before. Artist get exposure instantly.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <AnimatedDice />
            </div>
          </div>
        </div>
      </section>

      {/* MUSICWARP Section */}
      <section className="py-12 px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                MUSICWARP (Artist Teleportation)
              </h2>
              <p className="text-lg text-foreground/70 leading-relaxed">
                Artists shift their music into world regions through sound filters. Regional Virality boost global charts. This "regional virality booster" helps artists test, expand, and accelerate their reach across global charts by adapting their music to cultural sound identities. Instead of being limited to their local genre, artists can teleport their sound into any region's dominant style and grow worldwide.
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <AnimatedSaturn />
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-foreground/5 py-16 px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand Section */}
            <div>
              <h3 className="text-foreground font-semibold text-lg mb-4">Brand</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">About</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Blog</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Pricing</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Hub</a></li>
              </ul>
            </div>

            {/* Support Section */}
            <div>
              <h3 className="text-foreground font-semibold text-lg mb-4">Support</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Help</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Contact us</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Community guidelines</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">FAQ</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Terms of service</a></li>
                <li><a href="#" className="text-foreground/60 hover:text-foreground transition-colors text-sm">Privacy policy</a></li>
              </ul>
            </div>
          </div>

          <div className="text-center text-foreground/60 pt-8 border-t border-foreground/5">
            <p className="text-sm">© 2025 Bario. Transforming music with AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
