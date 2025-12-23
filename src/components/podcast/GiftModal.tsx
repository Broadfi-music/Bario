import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Flame, Heart, Star, Diamond, Crown } from 'lucide-react';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  hostId: string;
}

const GIFTS = [
  { type: 'fire', icon: Flame, label: 'Fire', points: 10, color: 'text-orange-500' },
  { type: 'heart', icon: Heart, label: 'Heart', points: 25, color: 'text-pink-500' },
  { type: 'star', icon: Star, label: 'Star', points: 50, color: 'text-yellow-500' },
  { type: 'diamond', icon: Diamond, label: 'Diamond', points: 100, color: 'text-cyan-400' },
  { type: 'crown', icon: Crown, label: 'Crown', points: 500, color: 'text-purple-500' },
];

const GiftModal = ({ isOpen, onClose, sessionId, hostId }: GiftModalProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);

  const sendGift = async (giftType: string, points: number) => {
    if (!user) {
      toast.error('Please login to send gifts');
      return;
    }

    setSending(giftType);

    // Ensure fresh auth session before database operations
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        await supabase.auth.refreshSession();
      }
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
        
        <div className="grid grid-cols-5 gap-3 py-4">
          {GIFTS.map((gift) => (
            <button
              key={gift.type}
              onClick={() => sendGift(gift.type, gift.points)}
              disabled={sending === gift.type}
              className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <gift.icon className={`h-8 w-8 ${gift.color} ${sending === gift.type ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] text-white/60">{gift.points}</span>
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
