import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      
      {/* Logo Cloud */}
      <div className="py-12 px-6 border-t border-foreground/5">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-12 flex-wrap opacity-40">
            <span className="text-foreground/60 text-sm font-semibold">Rolling Stone</span>
            <span className="text-foreground/60 text-sm font-semibold">Variety</span>
            <span className="text-foreground/60 text-sm font-semibold">Wired</span>
            <span className="text-foreground/60 text-sm font-semibold">Billboard</span>
            <span className="text-foreground/60 text-sm font-semibold">Complex</span>
            <span className="text-foreground/60 text-sm font-semibold">Forbes</span>
          </div>
        </div>
      </div>
      
      <Features />
      
      {/* Footer */}
      <footer className="border-t border-foreground/5 py-12 px-6">
        <div className="container mx-auto text-center text-foreground/60">
          <p className="text-sm">© 2024 Bario. Transforming music with AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
