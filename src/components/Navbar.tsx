import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              BARIO
            </div>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground hover:bg-foreground/10 text-sm sm:text-base px-2 sm:px-4">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full text-sm sm:text-base px-3 sm:px-4">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
