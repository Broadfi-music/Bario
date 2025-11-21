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
