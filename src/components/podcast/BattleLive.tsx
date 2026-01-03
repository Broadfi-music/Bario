import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Gift, Share2, Crown, MessageSquare, Swords,
  Volume2, VolumeX, Timer, Trophy, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwitchComments from './TwitchComments';
import GiftModal from './GiftModal';
import GiftAnimation from './GiftAnimation';
import ShareModal from './ShareModal';
import { toast } from 'sonner';
import { isValidUUID } from '@/lib/authUtils';

interface BattleSession {
  id: string;
  session_id: string | null;
  host_id: string;
  opponent_id: string;
  status: 'pending' | 'active' | 'ended';
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  winner_id: string | null;
  host_score: number;
  opponent_score: number;
  host_name?: string;
  host_avatar?: string | null;
  opponent_name?: string;
  opponent_avatar?: string | null;
}

interface BattleLiveProps {
  battle: BattleSession;
  onClose: () => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const BattleLive = ({ battle, onClose }: BattleLiveProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<'host' | 'opponent'>('host');
  const [hostScore, setHostScore] = useState(battle.host_score);
  const [opponentScore, setOpponentScore] = useState(battle.opponent_score);
  const [timeRemaining, setTimeRemaining] = useState(battle.duration_seconds);
  const [showChat, setShowChat] = useState(false);
  const [hostMuted, setHostMuted] = useState(false);
  const [opponentMuted, setOpponentMuted] = useState(false);

  // Calculate progress bar percentages
  const totalScore = hostScore + opponentScore || 1;
  const hostPercent = (hostScore / totalScore) * 100;
  const opponentPercent = (opponentScore / totalScore) * 100;

  // Countdown timer
  useEffect(() => {
    if (battle.status !== 'active' || !battle.started_at) return;

    const startTime = new Date(battle.started_at).getTime();
    const endTime = startTime + (battle.duration_seconds * 1000);

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battle.status, battle.started_at, battle.duration_seconds]);

  // Real-time score updates
  useEffect(() => {
    const channel = supabase
      .channel(`battle-scores-${battle.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcast_battles',
          filter: `id=eq.${battle.id}`
        },
        (payload: any) => {
          setHostScore(payload.new.host_score);
          setOpponentScore(payload.new.opponent_score);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle.id]);

  // Listen for gifts and update scores
  useEffect(() => {
    if (!battle.session_id) return;

    const channel = supabase
      .channel(`battle-gifts-${battle.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'podcast_gifts',
          filter: `session_id=eq.${battle.session_id}`
        },
        async (payload: any) => {
          const gift = payload.new;
          // Update battle scores based on who received the gift
          if (gift.recipient_id === battle.host_id) {
            const newScore = hostScore + gift.points_value;
            setHostScore(newScore);
            await supabase
              .from('podcast_battles')
              .update({ host_score: newScore })
              .eq('id', battle.id);
          } else if (gift.recipient_id === battle.opponent_id) {
            const newScore = opponentScore + gift.points_value;
            setOpponentScore(newScore);
            await supabase
              .from('podcast_battles')
              .update({ opponent_score: newScore })
              .eq('id', battle.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle.id, battle.session_id, battle.host_id, battle.opponent_id, hostScore, opponentScore]);

  const handleGiftCreator = (creator: 'host' | 'opponent') => {
    setSelectedCreator(creator);
    setShowGiftModal(true);
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#0e0e10] flex flex-col">
      {/* Top Bar - Timer and Score */}
      <div className="shrink-0 bg-gradient-to-b from-black/80 to-transparent pt-14 pb-4 px-3 z-10">
        {/* Battle Timer */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1.5 rounded-full">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-bold tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Score Bar */}
        <div className="relative">
          {/* Scores */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[#53fc18] font-bold text-lg">{hostScore}</span>
              <span className="text-xs text-white/60">WIN x{Math.floor(hostScore / 1000)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Swords className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/60">WIN x{Math.floor(opponentScore / 1000)}</span>
              <span className="text-pink-500 font-bold text-lg">{opponentScore}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-2 rounded-full overflow-hidden bg-neutral-800 flex">
            <div 
              className="h-full bg-gradient-to-r from-[#53fc18] to-green-400 transition-all duration-500"
              style={{ width: `${hostPercent}%` }}
            />
            <div 
              className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500"
              style={{ width: `${opponentPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Split Screen - Two Creators */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* Left Creator (Host) */}
        <div className="flex-1 relative border-r border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#53fc18]/10 to-transparent" />
          
          {/* Host Avatar/Video Area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {battle.host_avatar ? (
                <img 
                  src={battle.host_avatar} 
                  alt="" 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover ring-4 ring-[#53fc18]/50"
                />
              ) : (
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-[#53fc18] to-green-600 flex items-center justify-center">
                  <Users className="w-12 h-12 text-black" />
                </div>
              )}
              {/* Speaking indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                <div className="w-1 h-3 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-4 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <div className="w-1 h-2 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-1 h-5 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                <div className="w-1 h-3 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>

          {/* Host Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-[#53fc18]">
                  {battle.host_avatar ? (
                    <img src={battle.host_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#53fc18] to-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white truncate max-w-[80px]">{battle.host_name}</p>
                  <p className="text-[10px] text-[#53fc18]">Host</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHostMuted(!hostMuted)}
                  className="h-7 w-7 p-0 text-white/60 hover:text-white"
                >
                  {hostMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleGiftCreator('host')}
                  className="h-7 bg-[#53fc18] hover:bg-[#45d914] text-black text-[10px] px-2"
                >
                  <Gift className="h-3 w-3 mr-1" />
                  Gift
                </Button>
              </div>
            </div>
            {/* Top gifters for host */}
            <div className="flex items-center gap-1 mt-2">
              <Crown className="h-3 w-3 text-yellow-400" />
              <div className="flex -space-x-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-neutral-700 border border-black flex items-center justify-center text-[8px] text-white">
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Creator (Opponent) */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-500/10 to-transparent" />
          
          {/* Opponent Avatar/Video Area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {battle.opponent_avatar ? (
                <img 
                  src={battle.opponent_avatar} 
                  alt="" 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-full object-cover ring-4 ring-pink-500/50"
                />
              ) : (
                <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-12 h-12 text-white" />
                </div>
              )}
              {/* Speaking indicator */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                <div className="w-1 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '50ms' }} />
                <div className="w-1 h-4 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
                <div className="w-1 h-5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '350ms' }} />
                <div className="w-1 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
              </div>
            </div>
          </div>

          {/* Opponent Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() => handleGiftCreator('opponent')}
                  className="h-7 bg-pink-500 hover:bg-pink-600 text-white text-[10px] px-2"
                >
                  <Gift className="h-3 w-3 mr-1" />
                  Gift
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpponentMuted(!opponentMuted)}
                  className="h-7 w-7 p-0 text-white/60 hover:text-white"
                >
                  {opponentMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs font-semibold text-white truncate max-w-[80px]">{battle.opponent_name}</p>
                  <p className="text-[10px] text-pink-400">Challenger</p>
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-pink-500">
                  {battle.opponent_avatar ? (
                    <img src={battle.opponent_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                  )}
                </div>
              </div>
            </div>
            {/* Top gifters for opponent */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <div className="flex -space-x-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-5 h-5 rounded-full bg-neutral-700 border border-black flex items-center justify-center text-[8px] text-white">
                    {i}
                  </div>
                ))}
              </div>
              <Crown className="h-3 w-3 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 bg-[#18181b] border-t border-white/10 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChat(!showChat)}
              className="h-9 text-white/60 hover:text-white"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="h-9 bg-white/10 hover:bg-white/20 text-white"
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="h-9 bg-black hover:bg-black/80 text-white"
            >
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Chat Overlay */}
      {showChat && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 h-[50vh] bg-[#18181b] border-t border-white/10 z-50">
          <div className="flex items-center justify-between p-2 border-b border-white/10">
            <span className="text-xs font-semibold">Battle Chat</span>
            <Button size="sm" variant="ghost" onClick={() => setShowChat(false)} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
          {battle.session_id && (
            <TwitchComments 
              sessionId={battle.session_id} 
              hostId={battle.host_id}
              onSendGift={() => setShowGiftModal(true)}
            />
          )}
        </div>
      )}

      {/* Gift Modal */}
      <GiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={battle.session_id || ''}
        hostId={selectedCreator === 'host' ? battle.host_id : battle.opponent_id}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        sessionId={battle.session_id || ''}
        title={`${battle.host_name} vs ${battle.opponent_name} Battle!`}
      />
    </div>
  );
};

export default BattleLive;
