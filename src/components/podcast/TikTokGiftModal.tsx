import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Coins, X } from 'lucide-react';
import { getFreshSession, isDemoSession, isDemoUser } from '@/lib/authUtils';

interface TikTokGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  hostId: string;
  onGiftSent?: (giftType: string, count: number, senderName: string) => void;
}

const GIFTS = [
  { type: 'rose', image: '/gifts/gift-rose.png', label: 'Rose', coins: 1, color: 'from-red-500/20 to-pink-500/20' },
  { type: 'heart', image: '/gifts/gift-red-heart.png', label: 'Heart', coins: 5, color: 'from-pink-500/20 to-rose-500/20' },
  { type: 'flame_heart', image: '/gifts/gift-flame-heart.png', label: 'Flames', coins: 10, color: 'from-orange-500/20 to-red-500/20' },
  { type: 'tofu', image: '/gifts/gift-tofu.png', label: 'Tofu', coins: 3, color: 'from-green-500/20 to-emerald-500/20' },
];

const TikTokGiftModal = ({ isOpen, onClose, sessionId, hostId, onGiftSent }: TikTokGiftModalProps) => {
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

  const sendGift = async (giftType: string, coinsPerGift: number) => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }

    const count = giftCount[giftType] || 1;
    const totalCoins = coinsPerGift * count;

    // For demo sessions, just show success without database call
    if (isDemoSession(sessionId) || isDemoUser(hostId)) {
      const senderName = userProfile?.full_name || userProfile?.username || 'Anonymous';
      onGiftSent?.(giftType, count, senderName);
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
      // Deduct coins from sender
      const { error: coinError } = await supabase
        .from('user_coins')
        .update({ 
          balance: userCoins - totalCoins,
          total_spent: userCoins + totalCoins 
        })
        .eq('user_id', user.id);

      if (coinError) throw coinError;

      // Record transaction
      await supabase.from('coin_transactions').insert({
        user_id: user.id,
        type: 'gift_sent',
        amount: totalCoins,
        coins: -totalCoins,
        description: `Sent ${count}x ${giftType} gift`,
        reference_id: sessionId
      });

      // Send gift(s)
      for (let i = 0; i < count; i++) {
        await supabase.from('podcast_gifts').insert({
          session_id: sessionId,
          sender_id: user.id,
          recipient_id: hostId,
          gift_type: giftType,
          points_value: coinsPerGift
        });
      }

      // Update creator earnings
      const { data: creatorEarnings } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('user_id', hostId)
        .single();

      const earningsUsd = totalCoins * 0.007; // Each coin = $0.007 to creator
      const creatorData = creatorEarnings as any;

      if (creatorData) {
        await supabase
          .from('creator_earnings')
          .update({
            total_coins_received: (creatorData.total_coins_received || 0) + totalCoins,
            total_earnings_usd: parseFloat(String(creatorData.total_earnings_usd || 0)) + earningsUsd,
            pending_earnings_usd: parseFloat(String(creatorData.pending_earnings_usd || 0)) + earningsUsd
          })
          .eq('user_id', hostId);
      } else {
        await supabase.from('creator_earnings').insert({
          user_id: hostId,
          total_coins_received: totalCoins,
          total_earnings_usd: earningsUsd,
          pending_earnings_usd: earningsUsd
        });
      }

      const senderName = userProfile?.full_name || userProfile?.username || 'Anonymous';
      onGiftSent?.(giftType, count, senderName);
      setUserCoins(prev => prev - totalCoins);
      toast.success(`Sent ${count}x ${giftType} to host!`);
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
            <DialogTitle className="text-white text-center text-lg font-semibold">Send Gift</DialogTitle>
          </DialogHeader>

          {/* Coin Balance */}
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{userCoins.toLocaleString()}</span>
            <span className="text-white/60 text-sm">coins</span>
          </div>

          {/* Gift Grid */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {GIFTS.map((gift) => {
              const count = giftCount[gift.type] || 1;
              const totalCost = gift.coins * count;
              const canAfford = userCoins >= totalCost;

              return (
                <div key={gift.type} className="flex flex-col items-center">
                  <button
                    onClick={() => sendGift(gift.type, gift.coins)}
                    disabled={sending === gift.type || !canAfford}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b ${gift.color} border border-white/10 hover:border-white/30 hover:scale-105 transition-all disabled:opacity-50 w-full aspect-square`}
                  >
                    <img 
                      src={gift.image} 
                      alt={gift.label}
                      className={`h-10 w-10 object-contain ${sending === gift.type ? 'animate-bounce' : ''}`}
                    />
                    <span className="text-[9px] text-white/80 font-medium">{gift.label}</span>
                    <div className="flex items-center gap-0.5">
                      <Coins className="h-2.5 w-2.5 text-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-bold">{gift.coins}</span>
                    </div>
                  </button>
                  
                  {/* Count selector */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => updateGiftCount(gift.type, -1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-[10px] text-white w-4 text-center">{count}</span>
                    <button
                      onClick={() => updateGiftCount(gift.type, 1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-white/40">
            Tap a gift to send • Creators earn from your gifts
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TikTokGiftModal;
