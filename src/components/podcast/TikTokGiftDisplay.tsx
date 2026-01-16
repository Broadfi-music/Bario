import { useState, useEffect, useCallback, useRef } from 'react';
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
  flame: '/gifts/gift-flame-heart.png',
  tofu: '/gifts/gift-tofu.png',
  // Legacy gifts
  fire: '/gifts/gift-fire.mp4',
  star: '/gifts/gift-star.mp4',
  diamond: '/gifts/gift-diamond.mp4',
  crown: '/gifts/gift-crown.mp4',
};

const TikTokGiftDisplay = ({ sessionId }: TikTokGiftDisplayProps) => {
  const [gifts, setGifts] = useState<GiftEvent[]>([]);
  const giftQueueRef = useRef<GiftEvent[]>([]);
  const processingRef = useRef(false);

  // Add gift with fast TikTok-style display
  const addGift = useCallback((giftType: string, count: number, senderName: string) => {
    const newGift: GiftEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      giftType,
      count,
      senderName,
      timestamp: Date.now()
    };

    // Add to queue and process
    giftQueueRef.current.push(newGift);
    processGiftQueue();
  }, []);

  // Process gift queue - show gifts quickly like TikTok
  const processGiftQueue = useCallback(() => {
    if (processingRef.current || giftQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    const gift = giftQueueRef.current.shift()!;
    
    setGifts(prev => {
      // Keep max 5 gifts visible at once
      const updated = [...prev, gift].slice(-5);
      return updated;
    });

    // Remove after animation (3.5s total display time)
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== gift.id));
    }, 3500);

    // Process next gift after short delay (stagger display)
    setTimeout(() => {
      processingRef.current = false;
      if (giftQueueRef.current.length > 0) {
        processGiftQueue();
      }
    }, 200);
  }, []);

  // Expose addGift to parent via window for local sender feedback
  useEffect(() => {
    (window as any).__addGift = addGift;
    return () => {
      delete (window as any).__addGift;
    };
  }, [addGift]);

  // Subscribe to real-time gifts - THIS IS THE KEY FIX
  // Everyone connected to this session will see gifts via real-time subscription
  useEffect(() => {
    if (!sessionId || isDemoSession(sessionId)) return;

    console.log('🎁 TikTokGiftDisplay: Subscribing to gifts for session:', sessionId);

    const channel = supabase
      .channel(`tiktok-gifts-display-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_gifts',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log('🎁 Real-time gift received:', payload.new);
          const gift = payload.new as any;
          
          // Fetch sender profile for name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('user_id', gift.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || 'Anonymous';
          
          // Get gift count from the payload (if available) or default to 1
          const giftCount = gift.gift_count || 1;
          
          // Display the gift for everyone!
          addGift(gift.gift_type, giftCount, senderName);
        }
      )
      .subscribe((status) => {
        console.log('🎁 TikTokGiftDisplay subscription status:', status);
      });

    return () => {
      console.log('🎁 TikTokGiftDisplay: Unsubscribing from gifts');
      supabase.removeChannel(channel);
    };
  }, [sessionId, addGift]);

  if (gifts.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-28 z-50 flex flex-col gap-1.5 pointer-events-none max-w-[200px]">
      {gifts.map((gift, index) => (
        <div
          key={gift.id}
          className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg"
          style={{
            animation: 'giftSlideIn 0.15s ease-out forwards',
            opacity: 1 - (index * 0.1), // Fade older gifts slightly
          }}
        >
          {/* Sender name with shoutout styling */}
          <span className="text-white text-xs font-semibold max-w-16 truncate">
            {gift.senderName}
          </span>
          
          <span className="text-white/50 text-[10px]">sent</span>
          
          {/* Gift icon - larger for visibility */}
          <div className="relative flex-shrink-0">
            <img 
              src={GIFT_IMAGES[gift.giftType] || '/gifts/gift-rose.png'} 
              alt={gift.giftType}
              className="h-7 w-7 object-contain animate-bounce"
              style={{ animationDuration: '0.5s' }}
            />
          </div>
          
          {/* Count badge - TikTok style with animation */}
          {gift.count > 1 ? (
            <div className="flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-1.5 py-0.5">
              <span className="text-black text-[10px] font-bold">x</span>
              <span className="text-black font-black text-sm animate-count-pop">
                {gift.count}
              </span>
            </div>
          ) : (
            <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      ))}
      
      <style>{`
        @keyframes giftSlideIn {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes countPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.4); }
        }
        
        .animate-count-pop {
          animation: countPop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TikTokGiftDisplay;
