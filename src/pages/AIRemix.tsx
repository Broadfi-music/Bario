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

const AIRemix = () => {
  const navigate = useNavigate();
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
      if (audio) {
        audio.pause();
      }
      setPlayingTrack(null);
    } else {
      Object.entries(audioRefs.current).forEach(([id, audioElement]) => {
        if (audioElement && Number(id) !== trackId) {
          audioElement.pause();
          audioElement.currentTime = 0;
        }
      });
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
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
              Advanced AI processing delivers your remix in seconds, not hours, giving you studio-quality transformation without delay.
            </p>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {tracks.map(track => (
              <div key={track.id} className="relative">
                <button onClick={() => handleTrackClick(track.id)} className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-foreground/5 hover:scale-[1.02] transition-transform duration-200 w-full">
                  <img src={track.image} alt={`Track ${track.id}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className={`rounded-full p-3 sm:p-4 transition-all duration-200 ${playingTrack === track.id ? 'bg-foreground/90 scale-110' : 'bg-foreground/80'}`}>
                      {playingTrack === track.id ? <Pause className="h-6 w-6 sm:h-8 sm:w-8 text-background fill-background" /> : <Play className="h-6 w-6 sm:h-8 sm:w-8 text-background fill-background" />}
                    </div>
                  </div>
                </button>
                <audio ref={el => { audioRefs.current[track.id] = el; }} src={track.audio} onEnded={() => handleAudioEnded(track.id)} />
              </div>
            ))}
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
            {featureCards.map(card => (
              <div key={card.id} className="bg-black rounded-2xl p-4 sm:p-6 flex flex-col items-start space-y-4 hover:scale-[1.02] transition-transform duration-200">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore & Get Inspired Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5 bg-[#0a0a0a]">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80">
                <img src={exploreInspire} alt="Explore and get inspired" className="w-full h-full object-contain rounded-2xl" />
              </div>
            </div>
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 lg:mb-6">
                Explore and get inspired
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 leading-relaxed mb-6">
                Discover thousands of remixes created by our community. Get inspired by the latest trends and find your unique sound.
              </p>
              <Link to="/dashboard/library">
                <button className="bg-[#4ade80] text-black px-6 py-3 rounded-full font-semibold hover:bg-[#4ade80]/90 transition-colors">
                  Explore Library
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Join Our Community Section */}
      <section className="py-12 lg:py-20 px-4 sm:px-6 border-t border-foreground/5">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16">
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80">
                <img src={globe} alt="Join our global community" className="w-full h-full object-contain animate-spin-slow" />
              </div>
            </div>
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 lg:mb-6">
                Join our global community
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-foreground/70 leading-relaxed mb-6">
                Connect with artists, producers, and music lovers from around the world. Share your creations and collaborate on new projects.
              </p>
              <Link to="/auth">
                <button className="bg-[#4ade80] text-black px-6 py-3 rounded-full font-semibold hover:bg-[#4ade80]/90 transition-colors">
                  Join Now
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-foreground/5 py-8 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/bario-logo.png" alt="Bario" className="h-6 w-auto" />
            </div>
            <p className="text-xs text-foreground/50">© 2025 Bario. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AIRemix;
