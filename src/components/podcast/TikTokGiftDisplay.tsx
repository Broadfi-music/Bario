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
  const processedGiftIdsRef = useRef<Set<string>>(new Set());
  const lastPollTimeRef = useRef<string | null>(null);

  // Add gift with fast TikTok-style display
  const addGift = useCallback((giftType: string, count: number, senderName: string, giftId?: string) => {
    // Prevent duplicate gifts using a Set for O(1) lookup
    if (giftId) {
      if (processedGiftIdsRef.current.has(giftId)) {
        console.log('🎁 Skipping duplicate gift:', giftId);
        return;
      }
      processedGiftIdsRef.current.add(giftId);
      // Keep set size manageable
      if (processedGiftIdsRef.current.size > 100) {
        const arr = Array.from(processedGiftIdsRef.current);
        processedGiftIdsRef.current = new Set(arr.slice(-50));
      }
    }

    const newGift: GiftEvent = {
      id: giftId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    // Remove after animation (4 seconds total display time)
    setTimeout(() => {
      setGifts(prev => prev.filter(g => g.id !== gift.id));
    }, 4000);

    // Process next gift after short delay
    setTimeout(() => {
      processingRef.current = false;
      if (giftQueueRef.current.length > 0) {
        processGiftQueue();
      }
    }, 300);
  }, []);

  // Expose addGift to parent via window for local sender feedback
  useEffect(() => {
    (window as any).__addGift = addGift;
    return () => {
      delete (window as any).__addGift;
    };
  }, [addGift]);

  // POLLING - Primary method for reliability
  const startPolling = useCallback(async () => {
    if (pollingIntervalRef.current || !sessionId || isDemoSession(sessionId)) return;
    
    console.log('🎁 Starting gift polling for session:', sessionId);
    
    const poll = async () => {
      try {
        // Fetch gifts from the last 10 seconds or since last poll
        const since = lastPollTimeRef.current || new Date(Date.now() - 10000).toISOString();
        
        const { data: recentGifts, error } = await supabase
          .from('podcast_gifts')
          .select('id, gift_type, sender_id, created_at, points_value')
          .eq('session_id', sessionId)
          .gt('created_at', since)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('🎁 Polling error:', error);
          return;
        }
        
        if (recentGifts && recentGifts.length > 0) {
          console.log('🎁 Polled gifts:', recentGifts.length);
          
          // Update last poll time
          lastPollTimeRef.current = recentGifts[recentGifts.length - 1].created_at;
          
          // Process each gift
          for (const gift of recentGifts) {
            // Skip if already processed
            if (processedGiftIdsRef.current.has(gift.id)) continue;
            
            // Fetch sender profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('user_id', gift.sender_id)
              .single();
            
            const senderName = profile?.full_name || profile?.username || 'Anonymous';
            addGift(gift.gift_type, 1, senderName, gift.id);
          }
        }
      } catch (error) {
        console.error('🎁 Polling exception:', error);
      }
    };
    
    // Poll immediately, then every 2 seconds
    poll();
    pollingIntervalRef.current = setInterval(poll, 2000);
  }, [sessionId, addGift]);

  // Subscribe to real-time gifts + start polling as backup
  useEffect(() => {
    if (!sessionId || isDemoSession(sessionId)) {
      console.log('🎁 Skipping subscription for demo session');
      return;
    }

    console.log('🎁 Setting up gift system for session:', sessionId);
    setConnectionStatus('connecting');
    
    // Initialize last poll time
    lastPollTimeRef.current = new Date(Date.now() - 5000).toISOString();

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Real-time subscription
    const channel = supabase
      .channel(`gifts-realtime-${sessionId}-${Date.now()}`)
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
          
          // Skip if already processed by polling
          if (processedGiftIdsRef.current.has(gift.id)) {
            console.log('🎁 Gift already shown via polling, skipping');
            return;
          }
          
          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('user_id', gift.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || 'Anonymous';
          addGift(gift.gift_type, 1, senderName, gift.id);
        }
      )
      .subscribe((status, err) => {
        console.log('🎁 Subscription status:', status, err);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('🎁 Real-time subscription failed');
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    // ALWAYS start polling as primary method (more reliable)
    startPolling();

    return () => {
      console.log('🎁 Cleaning up gift subscriptions');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      processedGiftIdsRef.current.clear();
    };
  }, [sessionId, addGift, startPolling]);

  // Always render container - show status indicator when no gifts
  return (
    <div className="fixed left-2 top-1/3 z-[100] flex flex-col gap-2 pointer-events-none max-w-[220px]">
      {/* Connection status indicator - small dot */}
      <div className="flex items-center gap-1.5 mb-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'error' ? 'bg-yellow-500' : 
            'bg-blue-500 animate-pulse'
          }`}
        />
        <span className="text-[9px] text-white/40">
          {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'error' ? 'Polling' : '...'}
        </span>
      </div>
      
      {gifts.map((gift, index) => (
        <div
          key={gift.id}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-full px-3 py-2 shadow-2xl border border-white/10"
          style={{
            animation: 'giftSlideIn 0.2s ease-out forwards',
            opacity: 1 - (index * 0.1),
          }}
        >
          {/* Sender name with shoutout */}
          <span className="text-white text-xs font-bold max-w-20 truncate">
            {gift.senderName}
          </span>
          
          <span className="text-white/50 text-[10px]">sent</span>
          
          {/* Gift image */}
          <div className="relative flex-shrink-0">
            {GIFT_IMAGES[gift.giftType]?.endsWith('.mp4') ? (
              <video 
                src={GIFT_IMAGES[gift.giftType]} 
                autoPlay 
                loop 
                muted 
                playsInline
                className="h-8 w-8 object-contain"
              />
            ) : (
              <img 
                src={GIFT_IMAGES[gift.giftType] || '/gifts/gift-rose.png'} 
                alt={gift.giftType}
                className="h-8 w-8 object-contain animate-bounce"
                style={{ animationDuration: '0.5s' }}
              />
            )}
          </div>
          
          {gift.count > 1 ? (
            <div className="flex items-center bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full px-2 py-0.5">
              <span className="text-black text-[10px] font-bold">x</span>
              <span className="text-black font-black text-sm animate-count-pop">
                {gift.count}
              </span>
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>
      ))}
      
      <style>{`
        @keyframes giftSlideIn {
          from {
            opacity: 0;
            transform: translateX(-40px) scale(0.8);
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
