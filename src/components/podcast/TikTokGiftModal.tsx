import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Coins, X, Flame, Star, Diamond, Crown } from 'lucide-react';
import { getFreshSession, isDemoSession, isDemoUser } from '@/lib/authUtils';
import { isDemoLiveSession } from '@/lib/authUtils';

interface Creator {
  id: string;
  name: string;
  avatar?: string | null;
}

interface TikTokGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  hostId: string;
  hostName?: string;
  // Battle mode - optional second creator
  battleMode?: boolean;
  creators?: Creator[];
}

// Gift definitions with coin costs and creator earnings
const GIFTS = [
  // Image-based gifts
  { type: 'rose', image: '/gifts/gift-rose.png', label: 'Rose', coins: 1, earnings: 0.0128, color: 'from-red-500/20 to-pink-500/20' },
  { type: 'heart', image: '/gifts/gift-red-heart.png', label: 'Heart', coins: 5, earnings: 0.064, color: 'from-pink-500/20 to-rose-500/20' },
  { type: 'tofu', image: '/gifts/gift-tofu.png', label: 'Tofu', coins: 5, earnings: 0.064, color: 'from-green-500/20 to-emerald-500/20' },
  { type: 'flame', image: '/gifts/gift-flame-heart.png', label: 'Flame', coins: 10, earnings: 0.128, color: 'from-orange-500/20 to-red-500/20' },
  // Video animation gifts (premium)
  { type: 'fire', icon: Flame, label: 'Fire', coins: 50, earnings: 0.64, color: 'from-orange-600/30 to-red-600/30', isVideo: true },
  { type: 'star', icon: Star, label: 'Star', coins: 100, earnings: 1.28, color: 'from-yellow-500/30 to-amber-500/30', isVideo: true },
  { type: 'diamond', icon: Diamond, label: 'Diamond', coins: 200, earnings: 2.56, color: 'from-cyan-500/30 to-blue-500/30', isVideo: true },
  { type: 'crown', icon: Crown, label: 'Crown', coins: 500, earnings: 6.40, color: 'from-purple-500/30 to-pink-500/30', isVideo: true },
];

// Image-only gifts for demo sessions (rose, tofu, flame heart)
const DEMO_GIFTS = GIFTS.filter(g => ['rose', 'tofu', 'flame'].includes(g.type));

const TikTokGiftModal = ({ 
  isOpen, 
  onClose, 
  sessionId, 
  hostId, 
  hostName,
  battleMode = false,
  creators = []
}: TikTokGiftModalProps) => {
  const { user } = useAuth();
  const [sending, setSending] = useState<string | null>(null);
  const [giftCount, setGiftCount] = useState<{ [key: string]: number }>({});
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; username?: string } | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(hostId);
  
  // Use limited gifts for demo sessions
  const isDemo = isDemoLiveSession(sessionId);
  const availableGifts = isDemo ? DEMO_GIFTS : GIFTS;

  useEffect(() => {
    if (user && isOpen) {
      fetchUserData();
      // Reset selected creator when modal opens
      setSelectedCreatorId(hostId);
    }
  }, [user, isOpen, hostId]);

  const fetchUserData = async () => {
    if (!user) return;
    
    // Fetch coin balance
    const { data: coinData } = await supabase
      .from('user_coins')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (coinData) {
      setUserCoins(coinData.balance);
    }

    // Fetch profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('user_id', user.id)
      .single();
    
    if (profileData) {
      setUserProfile(profileData);
    }
  };

  const updateGiftCount = (giftType: string, delta: number) => {
    setGiftCount(prev => {
      const current = prev[giftType] || 1;
      const newCount = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [giftType]: newCount };
    });
  };

  const sendGift = async (giftType: string, coinsPerGift: number, earningsPerGift: number) => {
    if (!user) {
      toast.error('Please sign in to send gifts');
      return;
    }

    const count = giftCount[giftType] || 1;
    const totalCoins = coinsPerGift * count;
    const totalEarnings = earningsPerGift * count;

    // Use selected creator in battle mode, otherwise use hostId
    const recipientId = battleMode && selectedCreatorId ? selectedCreatorId : hostId;

    // For demo sessions, just show success without database call
    if (isDemoSession(sessionId) || isDemoUser(recipientId)) {
      toast.success(`Sent ${count}x ${giftType}!`);
      onClose();
      return;
    }

    // Check balance
    if (userCoins < totalCoins) {
      toast.error(`Not enough coins! Need ${totalCoins} coins.`);
      return;
    }

    setSending(giftType);

    // NOTE: Removed instant local feedback - now ALL viewers see gift at the same time
    // via real-time database subscription after the gift is saved

    // Ensure fresh auth session
    const session = await getFreshSession();
    if (!session) {
      setSending(null);
      toast.error('Session expired. Please sign in again.');
      return;
    }

    try {
      console.log('🎁 [TikTokGiftModal] Calling gift-transaction edge function...', {
        senderId: user.id,
        recipientId: recipientId,
        sessionId: sessionId,
        giftType: giftType,
        coinsCost: totalCoins,
        earningsUsd: totalEarnings,
        giftCount: count
      });
      
      // Call edge function to handle the gift transaction
      const { data, error } = await supabase.functions.invoke('gift-transaction', {
        body: {
          action: 'send_gift',
          senderId: user.id,
          recipientId: recipientId,
          sessionId: sessionId,
          giftType: giftType,
          coinsCost: totalCoins,
          earningsUsd: totalEarnings,
          giftCount: count
        }
      });

      if (error) {
        console.error('❌ [TikTokGiftModal] Edge function error:', error);
        throw error;
      }
      
      if (data?.error) {
        console.error('❌ [TikTokGiftModal] Gift transaction error:', data.error);
        toast.error(data.error);
        return;
      }

      console.log('✅ [TikTokGiftModal] Gift sent successfully:', data);
      setUserCoins(data.new_balance || userCoins - totalCoins);
      
      // Get recipient name for toast
      const recipientName = battleMode 
        ? creators.find(c => c.id === recipientId)?.name || 'Creator'
        : hostName || 'Host';
      
      toast.success(`Sent ${count}x ${giftType} to ${recipientName}! Creator earns $${totalEarnings.toFixed(4)}`);
      onClose();
    } catch (error) {
      console.error('❌ [TikTokGiftModal] Send gift error:', error);
      toast.error('Failed to send gift');
    } finally {
      setSending(null);
    }
  };

  // Get selected creator name for display
  const getSelectedCreatorName = () => {
    if (battleMode && creators.length > 0) {
      return creators.find(c => c.id === selectedCreatorId)?.name || 'Creator';
    }
    return hostName || 'Host';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-white/10 max-w-sm p-0 overflow-hidden z-[100]">
        <div className="relative p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-white text-center text-lg font-semibold">
              Send Gift to {getSelectedCreatorName()}
            </DialogTitle>
          </DialogHeader>

          {/* Creator Selector for Battle Mode */}
          {battleMode && creators.length > 0 && (
            <div className="flex items-center justify-center gap-3 mb-4">
              {creators.map((creator) => (
                <button
                  key={creator.id}
                  onClick={() => setSelectedCreatorId(creator.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                    selectedCreatorId === creator.id 
                      ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 ring-2 ring-pink-500' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
                    {creator.avatar ? (
                      <img src={creator.avatar} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white font-bold">
                          {creator.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-white/80 font-medium truncate max-w-[60px]">
                    {creator.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Coin Balance */}
          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
            <Coins className="h-5 w-5 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{userCoins.toLocaleString()}</span>
            <span className="text-white/60 text-sm">coins</span>
          </div>

          {/* Gift Grid */}
          <div className={`grid ${isDemo ? 'grid-cols-3' : 'grid-cols-4'} gap-2 mb-4`}>
            {availableGifts.map((gift) => {
              const count = giftCount[gift.type] || 1;
              const totalCost = gift.coins * count;
              const canAfford = userCoins >= totalCost;
              const IconComponent = (gift as any).icon;
              const isVideoGift = (gift as any).isVideo;

              return (
                <div key={gift.type} className="flex flex-col items-center">
                  <button
                    onClick={() => sendGift(gift.type, gift.coins, gift.earnings)}
                    disabled={sending === gift.type || !canAfford}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-b ${gift.color} border ${isVideoGift ? 'border-yellow-500/50' : 'border-white/10'} hover:border-white/30 hover:scale-105 transition-all disabled:opacity-50 w-full aspect-square`}
                  >
                    {/* Premium badge for video gifts */}
                    {isVideoGift && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-[6px] font-bold text-black px-1 rounded">
                        VIP
                      </div>
                    )}
                    
                    {IconComponent ? (
                      <IconComponent className={`h-8 w-8 ${sending === gift.type ? 'animate-bounce' : ''} ${
                        gift.type === 'fire' ? 'text-orange-500' :
                        gift.type === 'star' ? 'text-yellow-400' :
                        gift.type === 'diamond' ? 'text-cyan-400' :
                        gift.type === 'crown' ? 'text-purple-400' : 'text-white'
                      }`} />
                    ) : (
                      <img 
                        src={(gift as any).image} 
                        alt={gift.label}
                        className={`h-8 w-8 object-contain ${sending === gift.type ? 'animate-bounce' : ''}`}
                      />
                    )}
                    <span className="text-[8px] text-white/80 font-medium">{gift.label}</span>
                    <div className="flex items-center gap-0.5">
                      <Coins className="h-2 w-2 text-yellow-400" />
                      <span className="text-[8px] text-yellow-400 font-bold">{gift.coins}</span>
                    </div>
                  </button>
                  
                  {/* Count selector */}
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      onClick={() => updateGiftCount(gift.type, -1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="text-[10px] text-white w-4 text-center font-semibold">{count}</span>
                    <button
                      onClick={() => updateGiftCount(gift.type, 1)}
                      className="w-5 h-5 rounded bg-white/10 text-white/60 text-xs hover:bg-white/20 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-white/40">
            Tap a gift to send • Everyone sees it live!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TikTokGiftModal;
