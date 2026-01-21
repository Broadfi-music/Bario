import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isDemoSession } from '@/lib/authUtils';

interface GiftEvent {
  id: string;
  giftType: string;
  count: number;
  senderName: string;
  senderAvatar?: string;
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
  const mountedRef = useRef(true);

  // Add gift with TikTok-style display
  const addGift = useCallback((giftType: string, count: number, senderName: string, senderAvatar?: string, giftId?: string) => {
    if (!mountedRef.current) return;
    
    // Prevent duplicate gifts
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
      senderAvatar,
      timestamp: Date.now()
    };

    console.log('🎁 Adding gift to display:', newGift);
    giftQueueRef.current.push(newGift);
    processGiftQueue();
  }, []);

  // Process gift queue - show gifts like TikTok
  const processGiftQueue = useCallback(() => {
    if (!mountedRef.current) return;
    if (processingRef.current || giftQueueRef.current.length === 0) return;
    
    processingRef.current = true;
    const gift = giftQueueRef.current.shift()!;
    
    setGifts(prev => {
      const updated = [...prev, gift].slice(-4); // Show max 4 gifts
      return updated;
    });

    // Remove after animation (5 seconds total display time)
    setTimeout(() => {
      if (mountedRef.current) {
        setGifts(prev => prev.filter(g => g.id !== gift.id));
      }
    }, 5000);

    // Process next gift after short delay
    setTimeout(() => {
      processingRef.current = false;
      if (giftQueueRef.current.length > 0 && mountedRef.current) {
        processGiftQueue();
      }
    }, 400);
  }, []);

  // Expose addGift globally for local sender feedback
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
      if (!mountedRef.current) return;
      
      try {
        // Fetch gifts from the last 10 seconds or since last poll
        const since = lastPollTimeRef.current || new Date(Date.now() - 10000).toISOString();
        
        const { data: recentGifts, error } = await supabase
          .from('podcast_gifts')
          .select('id, gift_type, sender_id, created_at, points_value, gift_count')
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
            if (!mountedRef.current) break;
            
            // Skip if already processed
            if (processedGiftIdsRef.current.has(gift.id)) continue;
            
            // Fetch sender profile with avatar
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username, avatar_url')
              .eq('user_id', gift.sender_id)
              .single();
            
            const senderName = profile?.full_name || profile?.username || 'Fan';
            const senderAvatar = profile?.avatar_url || undefined;
            // Use gift_count from database for proper multiplier display (e.g., "2x rose")
            addGift(gift.gift_type, gift.gift_count || 1, senderName, senderAvatar, gift.id);
          }
        }
      } catch (error) {
        console.error('🎁 Polling exception:', error);
      }
    };
    
    // Poll immediately, then every 500ms for faster gift detection
    poll();
    pollingIntervalRef.current = setInterval(poll, 500);
  }, [sessionId, addGift]);

  // Subscribe to real-time gifts + start polling
  useEffect(() => {
    mountedRef.current = true;
    
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

    // Real-time subscription for instant updates
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
          if (!mountedRef.current) return;
          console.log('🎁 Real-time gift received:', payload.new);
          const gift = payload.new as any;
          
          // Skip if already processed by polling
          if (processedGiftIdsRef.current.has(gift.id)) {
            console.log('🎁 Gift already shown via polling, skipping');
            return;
          }
          
          // Fetch sender profile with avatar
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_url')
            .eq('user_id', gift.sender_id)
            .single();
          
          const senderName = profile?.full_name || profile?.username || 'Fan';
          const senderAvatar = profile?.avatar_url || undefined;
          // Use gift_count from realtime payload for proper multiplier display
          addGift(gift.gift_type, gift.gift_count || 1, senderName, senderAvatar, gift.id);
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
      mountedRef.current = false;
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

  // Always render container
  return (
    <div className="fixed left-3 top-[35%] z-[9999] flex flex-col gap-3 pointer-events-none max-w-[280px]">
      {/* Connection status - tiny indicator */}
      <div className="flex items-center gap-1 mb-0.5">
        <div 
          className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'error' ? 'bg-yellow-500' : 
            'bg-blue-500 animate-pulse'
          }`}
        />
        <span className="text-[8px] text-white/30">
          {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'error' ? 'Polling' : '...'}
        </span>
      </div>
      
      {gifts.map((gift, index) => {
        const isVideoGift = GIFT_IMAGES[gift.giftType]?.endsWith('.mp4');
        
        return (
          <div
            key={gift.id}
            className="flex items-center gap-2 bg-black/85 backdrop-blur-md rounded-full pl-1 pr-4 py-1.5 shadow-2xl border border-white/20 animate-gift-slide-in"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Sender Avatar - TikTok style */}
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-pink-500/50">
              {gift.senderAvatar ? (
                <img 
                  src={gift.senderAvatar} 
                  alt={gift.senderName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {gift.senderName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            
            {/* Sender name + "sent" text with quantity */}
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-bold truncate max-w-[90px]">
                {gift.senderName}
              </span>
              <span className="text-white/50 text-[9px]">
                sent {gift.count > 1 ? `${gift.count}x ` : ''}{gift.giftType}
              </span>
            </div>
            
            {/* Gift image/video */}
            <div className="relative flex-shrink-0 ml-auto">
              {isVideoGift ? (
                <video 
                  src={GIFT_IMAGES[gift.giftType]} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <img 
                  src={GIFT_IMAGES[gift.giftType] || '/gifts/gift-rose.png'} 
                  alt={gift.giftType}
                  className="h-10 w-10 object-contain animate-gift-bounce"
                />
              )}
            </div>
            
            {/* Count badge - ALWAYS show for quantity display */}
            <div className={`flex items-center rounded-full px-2 py-0.5 ${gift.count > 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-white/20'}`}>
              <span className={`text-[9px] font-bold ${gift.count > 1 ? 'text-black' : 'text-white/70'}`}>x</span>
              <span className={`font-black text-sm ${gift.count > 1 ? 'text-black animate-count-pop' : 'text-white/70'}`}>
                {gift.count}
              </span>
            </div>
          </div>
        );
      })}
      
      <style>{`
        @keyframes giftSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-60px) scale(0.7);
          }
          50% {
            transform: translateX(10px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        .animate-gift-slide-in {
          animation: giftSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes giftBounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.2) rotate(-10deg); }
          50% { transform: scale(1.1) rotate(5deg); }
          75% { transform: scale(1.15) rotate(-5deg); }
        }
        
        .animate-gift-bounce {
          animation: giftBounce 0.6s ease-in-out infinite;
        }
        
        @keyframes countPop {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.5); }
        }
        
        .animate-count-pop {
          animation: countPop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TikTokGiftDisplay;
