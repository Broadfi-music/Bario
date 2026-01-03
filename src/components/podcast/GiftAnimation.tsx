import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame, Heart, Star, Diamond, Crown } from 'lucide-react';
import { isValidUUID, isDemoSession } from '@/lib/authUtils';

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

const GIFT_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
  size: string;
}> = {
  fire: { 
    icon: Flame, 
    color: 'text-orange-500', 
    bgColor: 'from-orange-500/30 to-red-500/30',
    label: 'Fire',
    size: 'h-10 w-10'
  },
  heart: { 
    icon: Heart, 
    color: 'text-pink-500', 
    bgColor: 'from-pink-500/30 to-rose-500/30',
    label: 'Heart',
    size: 'h-12 w-12'
  },
  star: { 
    icon: Star, 
    color: 'text-yellow-400', 
    bgColor: 'from-yellow-400/30 to-amber-500/30',
    label: 'Star',
    size: 'h-14 w-14'
  },
  diamond: { 
    icon: Diamond, 
    color: 'text-cyan-400', 
    bgColor: 'from-cyan-400/30 to-blue-500/30',
    label: 'Diamond',
    size: 'h-16 w-16'
  },
  crown: { 
    icon: Crown, 
    color: 'text-purple-500', 
    bgColor: 'from-purple-500/30 to-pink-500/30',
    label: 'Crown',
    size: 'h-20 w-20'
  },
};

// Demo gift events for testing
const generateDemoGift = (): GiftEvent => {
  const types = ['fire', 'heart', 'star', 'diamond', 'crown'];
  const names = ['MusicFan123', 'BeatMaster', 'VibeLord', 'SoundWave', 'GrooveKing'];
  const type = types[Math.floor(Math.random() * types.length)];
  const name = names[Math.floor(Math.random() * names.length)];
  
  return {
    id: `demo-${Date.now()}`,
    gift_type: type,
    points_value: type === 'fire' ? 10 : type === 'heart' ? 25 : type === 'star' ? 50 : type === 'diamond' ? 100 : 500,
    sender_id: `demo-user-${Math.random()}`,
    sender_name: name,
    created_at: new Date().toISOString(),
  };
};

const GiftAnimation = ({ sessionId }: GiftAnimationProps) => {
  const [giftEvents, setGiftEvents] = useState<GiftEvent[]>([]);
  const [comboCount, setComboCount] = useState<Record<string, number>>({});
  const [bigGift, setBigGift] = useState<GiftEvent | null>(null);

  const handleNewGift = (gift: GiftEvent) => {
    // Add gift to display queue
    setGiftEvents(prev => [...prev, gift]);

    // Track combo for same sender + gift type
    const comboKey = `${gift.sender_id}-${gift.gift_type}`;
    setComboCount(prev => ({
      ...prev,
      [comboKey]: (prev[comboKey] || 0) + 1,
    }));

    // Show big celebration for high-value gifts
    if (['diamond', 'crown'].includes(gift.gift_type)) {
      setBigGift(gift);
      setTimeout(() => setBigGift(null), 3000);
    }

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
                  <span className="text-white/70 text-xs">
                    sent {config.label}
                  </span>
                </div>

                {/* Gift Icon */}
                <div className="relative">
                  <Icon className={`${config.size} ${config.color} drop-shadow-lg animate-bounce`} />
                  
                  {/* Combo indicator */}
                  {combo > 1 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                      x{combo}
                    </div>
                  )}
                </div>

                {/* Points */}
                <span className={`text-lg font-bold ${config.color}`}>
                  +{gift.points_value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Big gift celebration for high-value gifts (Diamond, Crown) */}
      {bigGift && (
        <div className="absolute inset-0 flex items-center justify-center big-gift-container">
          {/* Particle effects */}
          <div className="absolute inset-0 flex items-center justify-center">
            {[...Array(12)].map((_, i) => {
              const config = GIFT_CONFIG[bigGift.gift_type];
              return (
                <div
                  key={i}
                  className={`absolute w-3 h-3 rounded-full ${config.color.replace('text-', 'bg-')} particle`}
                  style={{
                    animationDelay: `${i * 0.1}s`,
                    '--rotation': `${i * 30}deg`,
                  } as React.CSSProperties}
                />
              );
            })}
          </div>

          {/* Big icon */}
          <div className="relative big-icon-wrapper">
            {(() => {
              const config = GIFT_CONFIG[bigGift.gift_type];
              const Icon = config.icon;
              return (
                <>
                  <Icon className={`h-32 w-32 ${config.color} drop-shadow-2xl big-gift-icon`} />
                  
                  {/* Sender name shoutout */}
                  <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap shoutout-text">
                    <div className="bg-black/80 backdrop-blur-md rounded-lg px-6 py-3 border border-white/20">
                      <p className="text-white font-bold text-xl text-center">
                        🎉 {bigGift.sender_name}
                      </p>
                      <p className={`${config.color} font-semibold text-center text-sm`}>
                        sent a {config.label}!
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

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
          animation: bigGiftPulse 3s ease-out forwards;
        }

        @keyframes bigGiftPulse {
          0% { opacity: 0; }
          10% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }

        .big-gift-icon {
          animation: bigGiftIcon 1s ease-out forwards;
          filter: drop-shadow(0 0 30px currentColor);
        }

        @keyframes bigGiftIcon {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.2) rotate(10deg);
            opacity: 1;
          }
          70% {
            transform: scale(1) rotate(-5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        .shoutout-text {
          animation: shoutout 2.5s ease-out forwards;
        }

        @keyframes shoutout {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          20% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
        }

        .particle {
          animation: particle 1.5s ease-out forwards;
        }

        @keyframes particle {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(-150px) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GiftAnimation;
