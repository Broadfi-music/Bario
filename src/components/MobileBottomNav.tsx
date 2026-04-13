import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, Sparkles, Plus, Music, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import AuthPromptModal from '@/components/podcast/AuthPromptModal';

const MobileBottomNav = () => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authAction, setAuthAction] = useState('');

  // Show on mobile webapp (not just PWA)
  if (!isMobile) return null;

  // Hide on auth page
  if (location.pathname === '/auth') return null;

  const tabs = [
    { id: 'home', icon: House, label: 'Home', path: '/podcasts?tab=feed' },
    { id: 'feed', icon: Sparkles, label: 'Feed', path: '/feed' },
    { id: 'golive', icon: Plus, label: 'Go Live', path: null },
    { id: 'remix', icon: Music, label: 'AI Remix', path: '/ai-remix' },
    { id: 'mypage', icon: User, label: 'My Page', path: null },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === 'home') return location.pathname === '/podcasts';
    if (tab.id === 'feed') return location.pathname === '/feed';
    if (tab.id === 'remix') return location.pathname === '/ai-remix';
    if (tab.id === 'mypage') return location.pathname.startsWith('/host/');
    return false;
  };

  const handleTap = (tab: typeof tabs[0]) => {
    if (tab.id === 'golive') {
      if (!user) {
        setAuthAction('go live');
        setShowAuthPrompt(true);
      } else {
        // Navigate to podcasts and trigger quick go-live flow (skip host studio)
        navigate('/podcasts');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('open-host-studio'));
        }, 100);
      }
      return;
    }
    if (tab.id === 'mypage') {
      if (!user) {
        setAuthAction('view your profile');
        setShowAuthPrompt(true);
      } else {
        navigate(`/host/${user.id}`);
      }
      return;
    }
    if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0e0e10] border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-12">
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
                  <div className="w-10 h-7 rounded-lg bg-black border border-white/20 flex items-center justify-center -mt-1">
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
      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        action={authAction}
      />
    </>
  );
};

export default MobileBottomNav;
