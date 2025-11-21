import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="text-2xl font-bold text-foreground tracking-tight">
              BARIO
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-foreground hover:bg-foreground/10">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-full">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};
