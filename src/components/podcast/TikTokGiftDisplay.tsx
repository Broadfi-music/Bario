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
  fire: '/gifts/gift-fire.mp4',
  star: '/gifts/gift-star.mp4',
  diamond: '/gifts/gift-diamond.mp4',
  crown: '/gifts/gift-crown.mp4',
};

const TikTokGiftDisplay = ({ sessionId }: TikTokGiftDisplayProps) => {
  const [gifts, setGifts] = useState<GiftEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const giftQueueRef = useRef<GiftEvent[]>([]);
  const processingRef = useRef(false);
  const channelRef = useRef<any>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastGiftIdRef = useRef<string | null>(null);

  // Add gift with fast TikTok-style display
  const addGift = useCallback((giftType: string, count: number, senderName: string, giftId?: string) => {
    // Prevent duplicate gifts
    if (giftId && giftId === lastGiftIdRef.current) {
      console.log('🎁 Skipping duplicate gift:', giftId);
      return;
    }
    if (giftId) lastGiftIdRef.current = giftId;

    const newGift: GiftEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      giftType,
      count,
      senderName,
      timestamp: Date.now()
    };

    console.log('🎁 Adding gift to display:', newGift);
    giftQueueRef.current.push(newGift);
    processGiftQueue();
  }, []);

  // Process gift queue - show gifts quickly like TikTok
  const processGiftQueue = useCallback(() => {
    if (processingRef.current || giftQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    const gift = giftQueueRef.current.shift()!;
    
    setGifts(prev => {
      const updated = [...prev, gift].slice(-5);
      return updated;
    });

    // Remove after animation (3.5s total display time)
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== gift.id));
    }, 3500);

    // Process next gift after short delay
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

  // Fallback polling for gifts (in case real-time fails)
  const startPolling = useCallback(async () => {
    if (pollingIntervalRef.current || !sessionId || isDemoSession(sessionId)) return;
    
    console.log('🎁 Starting fallback polling for gifts');
    
    const poll = async () => {
      try {
        const { data: recentGifts } = await supabase
          .from('podcast_gifts')
          .select('*, profiles:sender_id(full_name, username)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (recentGifts && recentGifts.length > 0) {
          const latestGift = recentGifts[0];
          const giftTime = new Date(latestGift.created_at).getTime();
          const now = Date.now();
          
          // Only show gifts from the last 5 seconds
          if (now - giftTime < 5000) {
            const profile = latestGift.profiles as any;
            const senderName = profile?.full_name || profile?.username || 'Anonymous';
            const giftCount = (latestGift as any).gift_count || 1;
            addGift(latestGift.gift_type, giftCount, senderName, latestGift.id);
          }
        }
      } catch (error) {
        console.error('🎁 Polling error:', error);
      }
    };
    
    pollingIntervalRef.current = setInterval(poll, 3000);
  }, [sessionId, addGift]);

  // Subscribe to real-time gifts
  useEffect(() => {
    if (!sessionId || isDemoSession(sessionId)) {
      console.log('🎁 Skipping subscription for demo session');
      return;
    }

    console.log('🎁 Setting up real-time gift subscription for session:', sessionId);
    setConnectionStatus('connecting');

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`tiktok-gifts-${sessionId}-${Date.now()}`)
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
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('user_id', gift.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || 'Anonymous';
          const giftCount = gift.gift_count || 1;
          
          addGift(gift.gift_type, giftCount, senderName, gift.id);
        }
      )
      .subscribe((status, err) => {
        console.log('🎁 Subscription status:', status, err);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          // Stop polling if real-time works
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('🎁 Real-time subscription failed, starting polling fallback');
          setConnectionStatus('error');
          startPolling();
        }
      });

    channelRef.current = channel;

    // Start polling as backup after 3 seconds if not connected
    const pollingTimeout = setTimeout(() => {
      if (connectionStatus !== 'connected') {
        console.log('🎁 Real-time not connected after 3s, starting polling');
        startPolling();
      }
    }, 3000);

    return () => {
      console.log('🎁 Cleaning up gift subscriptions');
      clearTimeout(pollingTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sessionId, addGift, startPolling, connectionStatus]);

  if (gifts.length === 0) return null;

  return (
    <div className="fixed left-4 bottom-28 z-50 flex flex-col gap-1.5 pointer-events-none max-w-[200px]">
      {gifts.map((gift, index) => (
        <div
          key={gift.id}
          className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg"
          style={{
            animation: 'giftSlideIn 0.15s ease-out forwards',
            opacity: 1 - (index * 0.1),
          }}
        >
          <span className="text-white text-xs font-semibold max-w-16 truncate">
            {gift.senderName}
          </span>
          
          <span className="text-white/50 text-[10px]">sent</span>
          
          <div className="relative flex-shrink-0">
            <img 
              src={GIFT_IMAGES[gift.giftType] || '/gifts/gift-rose.png'} 
              alt={gift.giftType}
              className="h-7 w-7 object-contain animate-bounce"
              style={{ animationDuration: '0.5s' }}
            />
          </div>
          
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
