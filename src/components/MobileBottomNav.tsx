import { useLocation, useNavigate } from 'react-router-dom';
import { Radio, Home, Plus, Globe } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

const MobileBottomNav = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only show in PWA standalone mode, not regular mobile browser
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

  if (!isMobile || !isPWA) return null;

  // Hide on auth page
  if (location.pathname === '/auth') return null;

  const tabs = [
    { id: 'live', icon: Radio, label: 'Live', path: '/podcasts' },
    { id: 'feed', icon: Home, label: 'Feed', path: '/podcasts?tab=feed' },
    { id: 'golive', icon: Plus, label: 'Go Live', path: null },
    { id: 'heatmap', icon: Globe, label: 'Heatmap', path: '/heatmap' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === 'live') return location.pathname === '/podcasts' && !location.search.includes('tab=feed');
    if (tab.id === 'feed') return location.pathname === '/podcasts' && location.search.includes('tab=feed');
    if (tab.id === 'heatmap') return location.pathname === '/heatmap' || location.pathname === '/global-heatmap';
    return false;
  };

  const handleTap = (tab: typeof tabs[0]) => {
    if (tab.id === 'golive') {
      if (!user) {
        navigate('/auth');
      } else {
        navigate('/podcasts');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-host-studio'));
        }, 100);
      }
      return;
    }
    if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const isGoLive = tab.id === 'golive';

          return (
            <button
              key={tab.id}
              onClick={() => handleTap(tab)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isGoLive ? '' : active ? 'text-white' : 'text-white/40'
              }`}
            >
              {isGoLive ? (
                <div className="w-10 h-7 rounded-lg bg-gradient-to-r from-[#ff2d55] to-[#c237eb] flex items-center justify-center -mt-1">
                  <Plus className="h-5 w-5 text-white" strokeWidth={3} />
                </div>
              ) : (
                <tab.icon className={`h-5 w-5 ${active ? 'text-white' : ''}`} />
              )}
              <span className={`text-[10px] ${isGoLive ? 'text-white/70' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
