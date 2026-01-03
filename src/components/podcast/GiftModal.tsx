import { useState } from 'react';
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
}

const GIFTS = [
  { type: 'fire', icon: Flame, label: 'Fire', points: 10, coins: 50, color: 'text-orange-500', bgColor: 'from-orange-500/20 to-red-500/20' },
  { type: 'heart', icon: Heart, label: 'Heart', points: 25, coins: 100, color: 'text-pink-500', bgColor: 'from-pink-500/20 to-rose-500/20' },
  { type: 'star', icon: Star, label: 'Star', points: 50, coins: 299, color: 'text-yellow-400', bgColor: 'from-yellow-400/20 to-amber-500/20' },
  { type: 'diamond', icon: Diamond, label: 'Diamond', points: 100, coins: 999, color: 'text-cyan-400', bgColor: 'from-cyan-400/20 to-blue-500/20' },
  { type: 'crown', icon: Crown, label: 'Crown', points: 500, coins: 2999, color: 'text-purple-500', bgColor: 'from-purple-500/20 to-pink-500/20' },
];

const GiftModal = ({ isOpen, onClose, sessionId, hostId }: GiftModalProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);

  const sendGift = async (giftType: string, points: number) => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }

    // For demo sessions, just show success without database call
    if (isDemoSession(sessionId) || isDemoUser(hostId)) {
      toast.success(`Sent ${giftType} to host!`);
      onClose();
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

    const { error } = await supabase.from('podcast_gifts').insert({
      session_id: sessionId,
      sender_id: user.id,
      recipient_id: hostId,
      gift_type: giftType,
      points_value: points
    });

    setSending(null);

    if (error) {
      console.error('Send gift error:', error);
      toast.error('Failed to send gift');
    } else {
      toast.success(`Sent ${giftType} to host!`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white text-center">Send a Gift</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-5 gap-2 py-4">
          {GIFTS.map((gift) => (
            <button
              key={gift.type}
              onClick={() => sendGift(gift.type, gift.points)}
              disabled={sending === gift.type}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b ${gift.bgColor} border border-white/10 hover:border-white/30 hover:scale-105 transition-all disabled:opacity-50`}
            >
              <gift.icon className={`h-8 w-8 ${gift.color} ${sending === gift.type ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] text-white/80 font-medium">{gift.label}</span>
              <div className="flex items-center gap-0.5">
                <Coins className="h-3 w-3 text-yellow-400" />
                <span className="text-[10px] text-yellow-400 font-bold">{gift.coins}</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[10px] text-white/40">
          Gifts support your favorite hosts and unlock exclusive perks
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default GiftModal;
