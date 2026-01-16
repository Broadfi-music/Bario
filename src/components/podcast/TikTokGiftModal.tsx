import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Coins, X, Flame, Star, Diamond, Crown } from 'lucide-react';
import { getFreshSession, isDemoSession, isDemoUser } from '@/lib/authUtils';

interface TikTokGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  hostId: string;
  hostName?: string;
}

// Gift definitions with coin costs and creator earnings
const GIFTS = [
  // Image-based gifts
  { type: 'rose', image: '/gifts/gift-rose.png', label: 'Rose', coins: 1, earnings: 0.0128, color: 'from-red-500/20 to-pink-500/20' },
  { type: 'heart', image: '/gifts/gift-red-heart.png', label: 'Heart', coins: 5, earnings: 0.064, color: 'from-pink-500/20 to-rose-500/20' },
  { type: 'tofu', image: '/gifts/gift-tofu.png', label: 'Tofu', coins: 5, earnings: 0.064, color: 'from-green-500/20 to-emerald-500/20' },
  { type: 'flame', image: '/gifts/gift-flame-heart.png', label: 'Flame', coins: 10, earnings: 0.128, color: 'from-orange-500/20 to-red-500/20' },
  // Video animation gifts (premium)
  { type: 'fire', icon: Flame, label: 'Fire', coins: 50, earnings: 0.64, color: 'from-orange-600/30 to-red-600/30', isVideo: true },
  { type: 'star', icon: Star, label: 'Star', coins: 100, earnings: 1.28, color: 'from-yellow-500/30 to-amber-500/30', isVideo: true },
  { type: 'diamond', icon: Diamond, label: 'Diamond', coins: 200, earnings: 2.56, color: 'from-cyan-500/30 to-blue-500/30', isVideo: true },
  { type: 'crown', icon: Crown, label: 'Crown', coins: 500, earnings: 6.40, color: 'from-purple-500/30 to-pink-500/30', isVideo: true },
];

const TikTokGiftModal = ({ isOpen, onClose, sessionId, hostId, hostName }: TikTokGiftModalProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);
  const [giftCount, setGiftCount] = useState<{ [key: string]: number }>({});
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; username?: string } | null>(null);

  useEffect(() => {
    if (user && isOpen) {
      fetchUserData();
    }
  }, [user, isOpen]);

  const fetchUserData = async () => {
    if (!user) return;
    
    // Fetch coin balance
    const { data: coinData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (coinData) {
      setUserCoins(coinData.balance);
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) {
      setUserProfile(profileData);
    }
  };

  const updateGiftCount = (giftType: string, delta: number) => {
    setGiftCount(prev => {
      const current = prev[giftType] || 1;
      const newCount = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [giftType]: newCount };
    });
  };

  const sendGift = async (giftType: string, coinsPerGift: number, earningsPerGift: number) => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }

    const count = giftCount[giftType] || 1;
    const totalCoins = coinsPerGift * count;
    const totalEarnings = earningsPerGift * count;

    // For demo sessions, just show success without database call
    if (isDemoSession(sessionId) || isDemoUser(hostId)) {
      toast.success(`Sent ${count}x ${giftType} to host!`);
      onClose();
      return;
    }

    // Check balance
    if (userCoins < totalCoins) {
      toast.error(`Not enough coins! Need ${totalCoins} coins.`);
      return;
    }

    setSending(giftType);

    // Ensure fresh auth session
    const session = await getFreshSession();
    if (!session) {
      setSending(null);
      toast.error('Session expired. Please sign in again.');
      return;
    }

    try {
      // Call edge function to handle the gift transaction
      // The edge function will insert into podcast_gifts which triggers real-time for everyone
      const { data, error } = await supabase.functions.invoke('gift-transaction', {
        body: {
          action: 'send_gift',
          senderId: user.id,
          recipientId: hostId,
          sessionId: sessionId,
          giftType: giftType,
          coinsCost: totalCoins,
          earningsUsd: totalEarnings,
          giftCount: count
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setUserCoins(data.new_balance || userCoins - totalCoins);
      toast.success(`Sent ${count}x ${giftType}! Creator earned $${totalEarnings.toFixed(2)}`);
      onClose();
    } catch (error) {
      console.error('Send gift error:', error);
      toast.error('Failed to send gift');
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-sm p-0 overflow-hidden">
        <div className="relative p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-white text-center text-lg font-semibold">
              Send Gift{hostName ? ` to ${hostName}` : ''}
            </DialogTitle>
          </DialogHeader>

          {/* Coin Balance */}
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{userCoins.toLocaleString()}</span>
            <span className="text-white/60 text-sm">coins</span>
          </div>

          {/* Gift Grid */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {GIFTS.map((gift) => {
              const count = giftCount[gift.type] || 1;
              const totalCost = gift.coins * count;
              const canAfford = userCoins >= totalCost;
              const IconComponent = (gift as any).icon;
              const isVideoGift = (gift as any).isVideo;

              return (
                <div key={gift.type} className="flex flex-col items-center">
                  <button
                    onClick={() => sendGift(gift.type, gift.coins, gift.earnings)}
                    disabled={sending === gift.type || !canAfford}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b ${gift.color} border ${isVideoGift ? 'border-yellow-500/50' : 'border-white/10'} hover:border-white/30 hover:scale-105 transition-all disabled:opacity-50 w-full aspect-square`}
                  >
                    {/* Premium badge for video gifts */}
                    {isVideoGift && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-[6px] font-bold text-black px-1 rounded">
                        VIP
                      </div>
                    )}
                    
                    {IconComponent ? (
                      <IconComponent className={`h-8 w-8 ${sending === gift.type ? 'animate-bounce' : ''} ${
                        gift.type === 'fire' ? 'text-orange-500' :
                        gift.type === 'star' ? 'text-yellow-400' :
                        gift.type === 'diamond' ? 'text-cyan-400' :
                        gift.type === 'crown' ? 'text-purple-400' : 'text-white'
                      }`} />
                    ) : (
                      <img 
                        src={(gift as any).image} 
                        alt={gift.label}
                        className={`h-8 w-8 object-contain ${sending === gift.type ? 'animate-bounce' : ''}`}
                      />
                    )}
                    <span className="text-[8px] text-white/80 font-medium">{gift.label}</span>
                    <div className="flex items-center gap-0.5">
                      <Coins className="h-2 w-2 text-yellow-400" />
                      <span className="text-[8px] text-yellow-400 font-bold">{gift.coins}</span>
                    </div>
                  </button>
                  
                  {/* Count selector */}
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => updateGiftCount(gift.type, -1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="text-[10px] text-white w-4 text-center font-semibold">{count}</span>
                    <button
                      onClick={() => updateGiftCount(gift.type, 1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-white/40">
            Tap a gift to send • Creators earn from your gifts • Everyone sees it!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TikTokGiftModal;
