import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Play } from 'lucide-react';
import { useState } from 'react';
import track1 from '@/assets/track-1.jpeg';
import track2 from '@/assets/track-2.jpeg';
import track3 from '@/assets/track-3.jpeg';
import track4 from '@/assets/track-4.jpeg';
import track5 from '@/assets/track-5.jpeg';
import track6 from '@/assets/track-6.jpeg';
import track7 from '@/assets/track-7.jpeg';
import track8 from '@/assets/track-8.jpeg';

const Index = () => {
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);

  const tracks = [
    { id: 1, image: track1 },
    { id: 2, image: track2 },
    { id: 3, image: track3 },
    { id: 4, image: track4 },
    { id: 5, image: track5 },
    { id: 6, image: track6 },
    { id: 7, image: track7 },
    { id: 8, image: track8 },
  ];

  const handleTrackClick = (trackId: number) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
      console.log(`Playing track ${trackId}`);
    }
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
              Advanced AI processing delivers your remix in seconds, not hours. Lightning-fast transformation.
            </p>
          </div>

          {/* Track Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handleTrackClick(track.id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-foreground/5 hover:scale-[1.02] transition-transform duration-200"
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
                    <Play className="h-8 w-8 text-background fill-background" />
                  </div>
                </div>
              </button>
            ))}
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
