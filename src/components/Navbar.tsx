import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-accent via-pink-500 to-accent bg-clip-text text-transparent">
              BARIO
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground hover:text-accent">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-accent to-pink-500 hover:opacity-90 text-foreground shadow-glow">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
