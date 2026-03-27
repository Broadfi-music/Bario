import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from './NotificationBell';

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-white/10 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/bario-logo.png" 
              alt="Bario" 
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/podcasts">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                Spaces
              </Button>
            </Link>
            <NotificationBell />
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 rounded-full text-[10px] sm:text-xs px-3 sm:px-4 h-7 sm:h-8 font-medium">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-[#4ade80] text-black hover:bg-[#4ade80]/90 rounded-full text-[10px] sm:text-xs px-3 sm:px-4 h-7 sm:h-8 font-medium">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};