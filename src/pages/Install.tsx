import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Share2, MoreVertical, Plus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-medium">Install Bario</span>
          <div className="w-5" />
        </div>
      </div>

      <div className="pt-16 pb-8 px-4 max-w-md mx-auto">
        {/* App Icon + Info */}
        <div className="flex flex-col items-center mt-8 mb-8">
          <div className="w-24 h-24 rounded-[22px] overflow-hidden mb-4 shadow-lg ring-1 ring-white/10">
            <img src="/bario-logo.png" alt="Bario" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Bario</h1>
          <p className="text-muted-foreground text-sm text-center">
            Music Discovery • AI Remixes • Live Spaces
          </p>
        </div>

        {isInstalled ? (
          <div className="bg-[#4ade80]/10 border border-[#4ade80]/30 rounded-2xl p-6 text-center mb-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-[#4ade80] font-semibold text-lg">Bario is installed!</p>
            <p className="text-muted-foreground text-sm mt-1">
              Open it from your home screen
            </p>
          </div>
        ) : (
          <>
            {/* Install button for Android/Desktop */}
            {deferredPrompt && (
              <Button
                onClick={handleInstall}
                className="w-full h-14 rounded-2xl bg-[#4ade80] text-black font-bold text-base hover:bg-[#4ade80]/90 mb-6"
              >
                <Download className="w-5 h-5 mr-2" />
                Install Bario App
              </Button>
            )}

            {/* Platform Instructions */}
            <div className="space-y-4">
              {platform === 'ios' && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#4ade80]" />
                    Install on iPhone
                  </h2>
                  <div className="space-y-4">
                    <Step number={1} icon={<Share2 className="w-4 h-4" />}>
                      Tap the <strong>Share</strong> button at the bottom of Safari
                    </Step>
                    <Step number={2} icon={<Plus className="w-4 h-4" />}>
                      Scroll and tap <strong>"Add to Home Screen"</strong>
                    </Step>
                    <Step number={3}>
                      Tap <strong>"Add"</strong> in the top right
                    </Step>
                  </div>
                </div>
              )}

              {platform === 'android' && !deferredPrompt && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#4ade80]" />
                    Install on Android
                  </h2>
                  <div className="space-y-4">
                    <Step number={1} icon={<MoreVertical className="w-4 h-4" />}>
                      Tap the <strong>menu</strong> (⋮) in Chrome
                    </Step>
                    <Step number={2} icon={<Download className="w-4 h-4" />}>
                      Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>
                    </Step>
                    <Step number={3}>
                      Tap <strong>"Install"</strong> to confirm
                    </Step>
                  </div>
                </div>
              )}

              {platform === 'desktop' && !deferredPrompt && (
                <div className="bg-card border border-border rounded-2xl p-5">
                  <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#4ade80]" />
                    Install on Desktop
                  </h2>
                  <div className="space-y-4">
                    <Step number={1}>
                      Look for the <strong>install icon</strong> in the browser address bar
                    </Step>
                    <Step number={2}>
                      Click <strong>"Install"</strong> to add Bario to your desktop
                    </Step>
                  </div>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Why install?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <FeatureCard emoji="⚡" title="Instant Access" desc="Launch from home screen" />
                <FeatureCard emoji="📱" title="Full Screen" desc="No browser bar" />
                <FeatureCard emoji="🔔" title="Notifications" desc="Never miss a live space" />
                <FeatureCard emoji="🎵" title="Quick Play" desc="Faster music streaming" />
              </div>
            </div>
          </>
        )}

        {/* Back to app */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
            ← Back to Bario
          </Link>
        </div>
      </div>
    </div>
  );
};

const Step = ({ number, icon, children }: { number: number; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="w-7 h-7 rounded-full bg-[#4ade80]/20 text-[#4ade80] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
      {number}
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {icon && <span className="inline-block mr-1 align-middle">{icon}</span>}
      {children}
    </p>
  </div>
);

const FeatureCard = ({ emoji, title, desc }: { emoji: string; title: string; desc: string }) => (
  <div className="bg-card border border-border rounded-xl p-3 text-center">
    <div className="text-2xl mb-1">{emoji}</div>
    <p className="text-sm font-medium">{title}</p>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </div>
);

export default Install;
