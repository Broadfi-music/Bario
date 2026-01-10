import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isDemoSession } from '@/lib/authUtils';

interface GiftEvent {
  id: string;
  giftType: string;
  count: number;
  senderName: string;
  timestamp: number;
}

interface TikTokGiftDisplayProps {
  sessionId: string;
}

const GIFT_IMAGES: { [key: string]: string } = {
  rose: '/gifts/gift-rose.png',
  heart: '/gifts/gift-red-heart.png',
  flame_heart: '/gifts/gift-flame-heart.png',
  tofu: '/gifts/gift-tofu.png',
  // Legacy gifts
  fire: '/gifts/gift-fire.mp4',
  star: '/gifts/gift-star.mp4',
  diamond: '/gifts/gift-diamond.mp4',
  crown: '/gifts/gift-crown.mp4',
};

const TikTokGiftDisplay = ({ sessionId }: TikTokGiftDisplayProps) => {
  const [gifts, setGifts] = useState<GiftEvent[]>([]);

  const addGift = (giftType: string, count: number, senderName: string) => {
    const newGift: GiftEvent = {
      id: `${Date.now()}-${Math.random()}`,
      giftType,
      count,
      senderName,
      timestamp: Date.now()
    };

    setGifts(prev => [...prev, newGift]);

    // Remove after animation
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== newGift.id));
    }, 4000);
  };

  // Expose addGift to parent via window for demo purposes
  useEffect(() => {
    (window as any).__addGift = addGift;
    return () => {
      delete (window as any).__addGift;
    };
  }, []);

  // Subscribe to real-time gifts
  useEffect(() => {
    if (isDemoSession(sessionId)) return;

    const channel = supabase
      .channel(`gifts-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_gifts',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          const gift = payload.new as any;
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('user_id', gift.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || 'Anonymous';
          addGift(gift.gift_type, 1, senderName);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (gifts.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-28 z-50 flex flex-col gap-2 pointer-events-none">
      {gifts.map((gift) => (
        <div
          key={gift.id}
          className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 animate-gift-slide-in"
          style={{
            animation: 'giftSlideIn 0.3s ease-out forwards, giftFadeOut 0.5s ease-in 3.5s forwards'
          }}
        >
          {/* Sender name */}
          <span className="text-white text-xs font-medium max-w-20 truncate">
            {gift.senderName}
          </span>
          
          <span className="text-white/60 text-[10px]">sent</span>
          
          {/* Gift icon */}
          <div className="relative">
            <img 
              src={GIFT_IMAGES[gift.giftType] || '/gifts/gift-rose.png'} 
              alt={gift.giftType}
              className="h-8 w-8 object-contain"
            />
          </div>
          
          {/* Count badge */}
          {gift.count > 1 && (
            <div className="flex items-center">
              <span className="text-white text-xs">x</span>
              <span className="text-yellow-400 font-bold text-sm animate-count-pop">
                {gift.count}
              </span>
            </div>
          )}
        </div>
      ))}
      
      <style>{`
        @keyframes giftSlideIn {
          from {
            opacity: 0;
            transform: translateX(-50px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes giftFadeOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(-20px);
          }
        }
        
        @keyframes countPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
        
        .animate-count-pop {
          animation: countPop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TikTokGiftDisplay;
