import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Flame, Heart, Star, Diamond, Crown, Coins } from 'lucide-react';
import { getFreshSession, isDemoSession, isDemoUser } from '@/lib/authUtils';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  hostId: string;
  hostName?: string;
}

// Updated gift definitions with correct USD earnings (same as TikTokGiftModal)
const GIFTS = [
  // TikTok-style image gifts (affordable)
  { type: 'rose', image: '/gifts/gift-rose.png', label: 'Rose', coins: 1, earningsUsd: 0.0128, color: 'text-red-400', bgColor: 'from-red-500/20 to-pink-500/20' },
  { type: 'heart', image: '/gifts/gift-red-heart.png', label: 'Heart', coins: 5, earningsUsd: 0.064, color: 'text-pink-400', bgColor: 'from-pink-500/20 to-rose-500/20' },
  { type: 'tofu', image: '/gifts/gift-tofu.png', label: 'Tofu', coins: 5, earningsUsd: 0.064, color: 'text-green-400', bgColor: 'from-green-500/20 to-emerald-500/20' },
  { type: 'flame_heart', image: '/gifts/gift-flame-heart.png', label: 'Flames', coins: 10, earningsUsd: 0.128, color: 'text-orange-400', bgColor: 'from-orange-500/20 to-red-500/20' },
  // Legacy video gifts (premium)
  { type: 'fire', icon: Flame, label: 'Fire', coins: 50, earningsUsd: 0.64, color: 'text-orange-500', bgColor: 'from-orange-500/20 to-red-500/20' },
  { type: 'star', icon: Star, label: 'Star', coins: 100, earningsUsd: 1.28, color: 'text-yellow-400', bgColor: 'from-yellow-400/20 to-amber-500/20' },
  { type: 'diamond', icon: Diamond, label: 'Diamond', coins: 200, earningsUsd: 2.56, color: 'text-cyan-400', bgColor: 'from-cyan-400/20 to-blue-500/20' },
  { type: 'crown', icon: Crown, label: 'Crown', coins: 500, earningsUsd: 6.40, color: 'text-purple-500', bgColor: 'from-purple-500/20 to-pink-500/20' },
];

const GiftModal = ({ isOpen, onClose, sessionId, hostId, hostName }: GiftModalProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState<number>(0);

  useEffect(() => {
    if (user && isOpen) {
      fetchUserCoins();
    }
  }, [user, isOpen]);

  const fetchUserCoins = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_coins')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserCoins(data.balance);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
    }
  };

  const sendGift = async (giftType: string, coins: number, earningsUsd: number) => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }

    // For demo sessions, just show success without database call
    if (isDemoSession(sessionId) || isDemoUser(hostId)) {
      toast.success(`Sent ${giftType} to ${hostName || 'host'}!`);
      onClose();
      return;
    }

    // Check balance
    if (userCoins < coins) {
      toast.error(`Not enough coins! Need ${coins} coins.`);
      return;
    }

    setSending(giftType);

    try {
      // Ensure fresh auth session
      const session = await getFreshSession();
      if (!session) {
        setSending(null);
        toast.error('Session expired. Please sign in again.');
        return;
      }

      // Use the gift-transaction edge function for atomic operations
      const { data, error } = await supabase.functions.invoke('gift-transaction', {
        body: {
          action: 'send_gift',
          senderId: user.id,
          recipientId: hostId,
          sessionId: sessionId,
          giftType: giftType,
          coinsCost: coins,
          earningsUsd: earningsUsd,
          giftCount: 1
        }
      });

      if (error) {
        console.error('Gift transaction error:', error);
        throw new Error(error.message || 'Failed to send gift');
      }

      if (data?.error) {
        if (data.error === 'Insufficient coins') {
          toast.error(`Not enough coins! You have ${data.balance} coins.`);
        } else {
          throw new Error(data.error);
        }
        return;
      }

      // Update local coin balance
      if (data?.new_balance !== undefined) {
        setUserCoins(data.new_balance);
      } else {
        setUserCoins(prev => prev - coins);
      }

      // Trigger local gift display immediately for instant feedback
      if (typeof (window as any).__addGift === 'function') {
        const senderName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
        const senderAvatar = user?.user_metadata?.avatar_url;
        (window as any).__addGift(giftType, 1, senderName, senderAvatar, `local-${Date.now()}`);
      }

      toast.success(`Sent ${giftType} to ${hostName || 'host'}!`);
      onClose();
    } catch (error: any) {
      console.error('Send gift error:', error);
      toast.error(error.message || 'Failed to send gift');
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-center">
            Send Gift{hostName ? ` to ${hostName}` : ''}
          </DialogTitle>
        </DialogHeader>

        {/* Coin Balance */}
        <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
          <Coins className="h-5 w-5 text-yellow-400" />
          <span className="text-yellow-400 font-bold">{userCoins.toLocaleString()}</span>
          <span className="text-white/60 text-sm">coins</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 py-4">
          {GIFTS.map((gift) => {
            const canAfford = userCoins >= gift.coins;
            const IconComponent = gift.icon;

            return (
              <button
                key={gift.type}
                onClick={() => sendGift(gift.type, gift.coins, gift.earningsUsd)}
                disabled={sending === gift.type || !canAfford}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b ${gift.bgColor} border border-white/10 hover:border-white/30 hover:scale-105 transition-all disabled:opacity-50`}
              >
                {gift.image ? (
                  <img 
                    src={gift.image} 
                    alt={gift.label}
                    className={`h-8 w-8 object-contain ${sending === gift.type ? 'animate-pulse' : ''}`}
                  />
                ) : IconComponent ? (
                  <IconComponent className={`h-8 w-8 ${gift.color} ${sending === gift.type ? 'animate-pulse' : ''}`} />
                ) : null}
                <span className="text-[10px] text-white/80 font-medium">{gift.label}</span>
                <div className="flex items-center gap-0.5">
                  <Coins className="h-3 w-3 text-yellow-400" />
                  <span className="text-[10px] text-yellow-400 font-bold">{gift.coins}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-center text-[10px] text-white/40">
          Gifts support your favorite hosts and unlock exclusive perks
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default GiftModal;