import { ThreeTextAnimation } from './ThreeTextAnimation';
import { Button } from '@/components/ui/button';
import { Upload, Sparkles } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
      
      {/* Three.js Animation */}
      <div className="absolute inset-0 opacity-60">
        <ThreeTextAnimation text="BARIO" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
            <span className="block text-foreground mb-4">Remix Your Songs</span>
            <span className="block bg-gradient-to-r from-accent via-pink-500 to-accent bg-clip-text text-transparent">
              Across Time & Genre
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Upload your track, pick an era or genre, and watch as AI transforms your music into something entirely new. From 80s synthwave to modern trap, the possibilities are endless.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-accent to-pink-500 hover:opacity-90 text-foreground text-lg px-8 py-6 shadow-glow group"
            >
              <Upload className="mr-2 group-hover:scale-110 transition-transform" />
              Upload Track
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-accent/50 text-foreground hover:bg-accent/10 text-lg px-8 py-6 group"
            >
              <Sparkles className="mr-2 group-hover:rotate-12 transition-transform" />
              Explore Demos
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-16 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="text-4xl font-bold text-accent">50+</div>
              <div className="text-sm text-muted-foreground">Music Eras</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-accent">100+</div>
              <div className="text-sm text-muted-foreground">Genres</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-accent">AI</div>
              <div className="text-sm text-muted-foreground">Powered</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
