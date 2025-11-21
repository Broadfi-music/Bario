import { ThreeTextAnimation } from './ThreeTextAnimation';
import { FloatingAlbumCard } from './FloatingAlbumCard';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Three.js Animation Background */}
      <div className="absolute inset-0 opacity-40">
        <ThreeTextAnimation text="BARIO" />
      </div>

      {/* Floating Album Cards */}
      <FloatingAlbumCard
        image="https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
        title="Neon Dreams"
        artist="SynthWave Master"
        position="left"
        delay={0}
      />
      
      <FloatingAlbumCard
        image="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop"
        title="Jazz Fusion"
        artist="RetroGroove"
        position="right"
        delay={0.5}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight">
            Make any song you can imagine
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto">
            Start with a simple prompt or dive into our pro editing tools, your next track is just a step away.
          </p>

          {/* Input Area */}
          <div className="pt-6">
            <div className="max-w-3xl mx-auto bg-background/40 backdrop-blur-sm border border-foreground/10 rounded-2xl p-4 flex items-center gap-3">
              <input 
                type="text" 
                placeholder="Chat to make music"
                className="flex-1 bg-transparent text-foreground placeholder:text-foreground/40 outline-none text-base md:text-lg"
              />
              <button className="text-foreground/60 hover:text-foreground transition-colors text-sm px-3 py-2 border border-foreground/10 rounded-lg">
                Advanced
              </button>
              <Button className="bg-accent hover:bg-accent/90 text-foreground rounded-full px-6">
                <Sparkles className="mr-2 h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};
