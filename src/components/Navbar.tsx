import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 border-b border-white/10 backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="text-lg sm:text-xl font-bold text-white tracking-tight">
              BARIO
            </div>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/global-heatmap">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                Heatmap
              </Button>
            </Link>
            <Link to="/radio-stations">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                Radio
              </Button>
            </Link>
            <Link to="/podcasts">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                Podcast
              </Button>
            </Link>
            <Link to="/music-alpha">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-2 sm:px-3 h-7 sm:h-8">
                Alpha
              </Button>
            </Link>
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