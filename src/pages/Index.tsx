import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <Features />
      
      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-6">
        <div className="container mx-auto text-center text-muted-foreground">
          <p className="text-sm">© 2024 Bario. Transforming music with AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
