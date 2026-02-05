import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Heart, Star, Diamond, Crown, Coins } from 'lucide-react';
 import { isValidUUID, isDemoSession, isDemoLiveSession } from '@/lib/authUtils';

interface GiftAnimationProps {
  sessionId: string;
}

interface GiftEvent {
  id: string;
  gift_type: string;
  points_value: number;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  created_at: string;
}

// PREMIUM video gifts only - these are the only gifts that show full-screen video animation
// Image-based gifts (rose, heart, tofu, flame_heart) are handled by TikTokGiftDisplay with static icons
const PREMIUM_VIDEO_GIFTS = ['fire', 'star', 'diamond', 'crown'];

const GIFT_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  size: string;
  videoUrl: string;
  coins: number;
  isVideoGift: boolean;
}> = {
  // Image-based affordable gifts - NO video animation, just icon display
  rose: {
    icon: Heart,
    color: 'text-red-400',
    bgColor: 'from-red-500/30 to-pink-500/30',
    label: 'Rose',
    size: 'h-8 w-8',
    videoUrl: '', // No video
    coins: 1,
    isVideoGift: false
  },
  heart: {
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'from-pink-500/30 to-rose-500/30',
    label: 'Heart',
    size: 'h-8 w-8',
    videoUrl: '', // No video - this is the icon-based heart
    coins: 5,
    isVideoGift: false
  },
  tofu: {
    icon: Heart,
    color: 'text-green-400',
    bgColor: 'from-green-500/30 to-emerald-500/30',
    label: 'Tofu',
    size: 'h-8 w-8',
    videoUrl: '', // No video
    coins: 5,
    isVideoGift: false
  },
  flame_heart: {
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/30 to-red-500/30',
    label: 'Flames',
    size: 'h-8 w-8',
    videoUrl: '', // No video
    coins: 10,
    isVideoGift: false
  },
  flame: {
    icon: Flame,
    color: 'text-orange-400',
    bgColor: 'from-orange-500/30 to-red-500/30',
    label: 'Flame',
    size: 'h-8 w-8',
    videoUrl: '', // No video
    coins: 10,
    isVideoGift: false
  },
  // Premium video gifts - these show full-screen video animation
  fire: { 
    icon: Flame, 
    color: 'text-orange-500', 
    bgColor: 'from-orange-500/30 to-red-500/30',
    label: 'Fire',
    size: 'h-10 w-10',
    videoUrl: '/gifts/gift-fire.mp4',
    coins: 50,
    isVideoGift: true
  },
  star: { 
    icon: Star, 
    color: 'text-yellow-400', 
    bgColor: 'from-yellow-400/30 to-amber-500/30',
    label: 'Star',
    size: 'h-14 w-14',
    videoUrl: '/gifts/gift-star.mp4',
    coins: 100,
    isVideoGift: true
  },
  diamond: { 
    icon: Diamond, 
    color: 'text-cyan-400', 
    bgColor: 'from-cyan-400/30 to-blue-500/30',
    label: 'Diamond',
    size: 'h-16 w-16',
    videoUrl: '/gifts/gift-diamond.mp4',
    coins: 200,
    isVideoGift: true
  },
  crown: { 
    icon: Crown, 
    color: 'text-purple-500', 
    bgColor: 'from-purple-500/30 to-pink-500/30',
    label: 'Crown',
    size: 'h-20 w-20',
    videoUrl: '/gifts/gift-crown.mp4',
    coins: 500,
    isVideoGift: true
  },
};

// Demo gift events for testing
const generateDemoGift = (): GiftEvent => {
  const types = ['fire', 'heart', 'star', 'diamond', 'crown'];
  const names = ['MusicFan123', 'BeatMaster', 'VibeLord', 'SoundWave', 'GrooveKing'];
  const type = types[Math.floor(Math.random() * types.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  const config = GIFT_CONFIG[type];
  
  return {
    id: `demo-${Date.now()}`,
    gift_type: type,
    points_value: config.coins,
    sender_id: `demo-user-${Math.random()}`,
    sender_name: name,
    created_at: new Date().toISOString(),
  };
};

const GiftAnimation = ({ sessionId }: GiftAnimationProps) => {
   // Early return for demo live sessions - no video animations allowed
   if (isDemoLiveSession(sessionId)) {
     return null;
   }
 
  const [giftEvents, setGiftEvents] = useState<GiftEvent[]>([]);
  const [comboCount, setComboCount] = useState<Record<string, number>>({});
  const [bigGift, setBigGift] = useState<GiftEvent | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadedVideos = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Preload all gift videos on mount for instant playback
  useEffect(() => {
    Object.entries(GIFT_CONFIG).forEach(([type, config]) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = config.videoUrl;
      video.muted = false;
      video.load();
      preloadedVideos.current.set(type, video);
    });
  }, []);

  const handleNewGift = (gift: GiftEvent) => {
    const config = GIFT_CONFIG[gift.gift_type];
    
    // Only process premium video gifts in this component
    // Image-based gifts (rose, heart, tofu, flame_heart, flame) are handled by TikTokGiftDisplay
    if (!config?.isVideoGift) {
      console.log(`🎁 Non-video gift "${gift.gift_type}" - skipping video animation`);
      return;
    }

    console.log(`🎬 Premium video gift "${gift.gift_type}" - showing video animation`);

    // Add gift to display queue
    setGiftEvents(prev => [...prev, gift]);

    // Track combo for same sender + gift type
    const comboKey = `${gift.sender_id}-${gift.gift_type}`;
    setComboCount(prev => ({
      ...prev,
      [comboKey]: (prev[comboKey] || 0) + 1,
    }));

    // Show big video celebration ONLY for premium video gifts
    setBigGift(gift);

    // Remove gift after animation completes (4 seconds)
    setTimeout(() => {
      setGiftEvents(prev => prev.filter(g => g.id !== gift.id));
    }, 4000);

    // Reset combo after 5 seconds of no activity
    setTimeout(() => {
      setComboCount(prev => {
        const newCount = { ...prev };
        if (newCount[comboKey] === 1) {
          delete newCount[comboKey];
        } else if (newCount[comboKey]) {
          newCount[comboKey] -= 1;
        }
        return newCount;
      });
    }, 5000);
  };

  // Clear big gift when video ends
  const handleVideoEnded = () => {
    setBigGift(null);
  };

  // Subscribe to real-time gift events
  useEffect(() => {
    if (isDemoSession(sessionId)) {
      // Demo mode: show random gifts every few seconds
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const demoGift = generateDemoGift();
          handleNewGift(demoGift);
        }
      }, 3000);
      return () => clearInterval(interval);
    }

    const channel = supabase
      .channel(`gift-animations-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_gifts',
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          const gift = payload.new as {
            id: string;
            gift_type: string;
            points_value: number;
            sender_id: string;
            created_at: string;
          };

          // Fetch sender profile
          let senderName = 'Anonymous';
          let senderAvatar: string | undefined;

          if (isValidUUID(gift.sender_id)) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, username, avatar_url')
              .eq('user_id', gift.sender_id)
              .single();

            if (profile) {
              senderName = profile.full_name || profile.username || 'Anonymous';
              senderAvatar = profile.avatar_url || undefined;
            }
          }

          const giftEvent: GiftEvent = {
            id: gift.id,
            gift_type: gift.gift_type,
            points_value: gift.points_value,
            sender_id: gift.sender_id,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            created_at: gift.created_at,
          };

          handleNewGift(giftEvent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (giftEvents.length === 0 && !bigGift) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Gift notifications - TikTok style left side */}
      <div className="absolute left-4 bottom-32 flex flex-col-reverse gap-2 max-h-[60vh] overflow-hidden">
        {giftEvents.slice(-5).map((gift, index) => {
          const config = GIFT_CONFIG[gift.gift_type] || GIFT_CONFIG.fire;
          const Icon = config.icon;
          const comboKey = `${gift.sender_id}-${gift.gift_type}`;
          const combo = comboCount[comboKey] || 1;

          return (
            <div
              key={gift.id}
              className="gift-notification"
              style={{ 
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className={`flex items-center gap-3 bg-gradient-to-r ${config.bgColor} backdrop-blur-md rounded-full pl-1 pr-4 py-1 border border-white/20 shadow-lg`}>
                {/* Sender Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex-shrink-0 ring-2 ring-white/30">
                  {gift.sender_avatar ? (
                    <img src={gift.sender_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {gift.sender_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Gift Info */}
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-semibold text-sm truncate max-w-32">
                    {gift.sender_name}
                  </span>
                  <span className="text-white/70 text-xs flex items-center gap-1">
                    sent {config.label} 
                    <span className="flex items-center text-yellow-400">
                      <Coins className="h-3 w-3 mr-0.5" />
                      {config.coins}
                    </span>
                  </span>
                </div>

                {/* Gift Icon with points display */}
                <div className="relative">
                  <Icon className={`${config.size} ${config.color} drop-shadow-lg animate-bounce`} />
                  
                  {/* Combo indicator */}
                  {combo > 1 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      x{combo}
                    </div>
                  )}
                </div>

                {/* Coins amount */}
                <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">
                    {config.coins}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BIG TikTok-style full-screen gift video celebration */}
      {bigGift && (() => {
        const config = GIFT_CONFIG[bigGift.gift_type];
        return (
          <div className="absolute inset-0 flex items-center justify-center big-gift-container bg-black/60">
            {/* Full-screen Video Animation with SOUND */}
            <div className="relative flex flex-col items-center justify-center w-full h-full">
              <video
                ref={videoRef}
                src={config.videoUrl}
                autoPlay
                playsInline
                preload="auto"
                onEnded={handleVideoEnded}
                onCanPlay={(e) => {
                  // Ensure video plays immediately when ready
                  (e.target as HTMLVideoElement).play().catch(() => {});
                }}
                className="w-[80vw] h-[80vh] max-w-[600px] max-h-[600px] object-contain"
                style={{ 
                  filter: 'drop-shadow(0 0 60px rgba(255,255,255,0.4))',
                }}
              />
              
              {/* Sender name + coin amount overlay - TikTok style */}
              <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 whitespace-nowrap shoutout-text">
                <div className="bg-black/90 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/30 shadow-2xl">
                  <p className="text-white font-bold text-3xl md:text-4xl text-center mb-2">
                    🎉 {bigGift.sender_name}
                  </p>
                  <p className={`${config.color} font-bold text-center text-xl md:text-2xl mb-3`}>
                    sent a {config.label}!
                  </p>
                  {/* Coin amount display */}
                  <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full px-6 py-2 border border-yellow-400/30">
                    <Coins className="h-6 w-6 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-2xl">{config.coins}</span>
                    <span className="text-yellow-300/80 text-lg">coins</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Particle effects around video */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-4 h-4 rounded-full ${config.color.replace('text-', 'bg-')} particle`}
                  style={{
                    animationDelay: `${i * 0.08}s`,
                    '--rotation': `${i * 22.5}deg`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* CSS Keyframes */}
      <style>{`
        .gift-notification {
          animation: giftSlideIn 0.5s ease-out forwards, giftFadeOut 0.5s ease-in 3.5s forwards;
        }

        @keyframes giftSlideIn {
          from {
            opacity: 0;
            transform: translateX(-100px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes giftFadeOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-50px);
          }
        }

        .big-gift-container {
          animation: bigGiftAppear 0.3s ease-out forwards;
        }

        @keyframes bigGiftAppear {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .shoutout-text {
          animation: shoutout 0.5s ease-out forwards;
        }

        @keyframes shoutout {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(30px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        .particle {
          animation: particle 2s ease-out forwards;
        }

        @keyframes particle {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(-200px) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GiftAnimation;
