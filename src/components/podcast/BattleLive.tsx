import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Gift, Share2, Crown, MessageSquare, Swords,
  Volume2, VolumeX, Timer, Trophy, Heart, LogOut, Mic, MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwitchComments from './TwitchComments';
import GiftModal from './GiftModal';
import ShareModal from './ShareModal';
import { toast } from 'sonner';
import { isValidUUID } from '@/lib/authUtils';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';

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

interface TopGifter {
  user_id: string;
  avatar_url?: string;
  total_points: number;
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
  const [battleStatus, setBattleStatus] = useState(battle.status);
  const [winnerId, setWinnerId] = useState<string | null>(battle.winner_id);
  
  // Top gifters state
  const [hostTopGifters, setHostTopGifters] = useState<TopGifter[]>([]);
  const [opponentTopGifters, setOpponentTopGifters] = useState<TopGifter[]>([]);
  
  // Double-like state
  const [lastTapTime, setLastTapTime] = useState<{ host: number; opponent: number }>({ host: 0, opponent: 0 });
  const [showHeartAnimation, setShowHeartAnimation] = useState<{ host: boolean; opponent: boolean }>({ host: false, opponent: false });
  
  // Check if current user is a participant (host or challenger)
  const isParticipant = user?.id === battle.host_id || user?.id === battle.opponent_id;
  const isHost = user?.id === battle.host_id;

  // Agora audio hook for battle audio
  const {
    isConnected: audioConnected,
    participants,
    isMuted,
    connect: connectAudio,
    disconnect: disconnectAudio,
    toggleMute,
  } = useAgoraAudio({
    sessionId: battle.session_id || battle.id,
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'User',
    isHost: isParticipant, // Both host and opponent are publishers
  });

  // Connect audio when battle is active
  useEffect(() => {
    if (battle.session_id && user && isParticipant && battleStatus === 'active') {
      console.log('Connecting audio for battle participant');
      connectAudio();
    }
    
    return () => {
      if (audioConnected) {
        disconnectAudio();
      }
    };
  }, [battle.session_id, user, isParticipant, battleStatus]);

  // Calculate progress bar percentages
  const totalScore = hostScore + opponentScore || 1;
  const hostPercent = (hostScore / totalScore) * 100;
  const opponentPercent = (opponentScore / totalScore) * 100;

  // Countdown timer
  useEffect(() => {
    if (battleStatus !== 'active' || !battle.started_at) return;

    const startTime = new Date(battle.started_at).getTime();
    const endTime = startTime + (battle.duration_seconds * 1000);

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // Determine winner when time ends
        determineWinner();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battleStatus, battle.started_at, battle.duration_seconds]);

  // Determine winner function
  const determineWinner = async () => {
    if (!isParticipant) return; // Only participants can trigger this
    
    const winner = hostScore > opponentScore 
      ? battle.host_id 
      : opponentScore > hostScore 
        ? battle.opponent_id 
        : null; // Tie
    
    setWinnerId(winner);
    setBattleStatus('ended');
    
    await supabase
      .from('podcast_battles')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        winner_id: winner
      })
      .eq('id', battle.id);
    
    if (winner === user?.id) {
      toast.success('🏆 You won the battle!');
    } else if (winner) {
      toast.info('Battle ended!');
    } else {
      toast.info("It's a tie!");
    }
  };

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
          if (payload.new.status) {
            setBattleStatus(payload.new.status);
          }
          if (payload.new.winner_id) {
            setWinnerId(payload.new.winner_id);
          }
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
          // Refresh top gifters
          fetchTopGifters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle.id, battle.session_id, battle.host_id, battle.opponent_id, hostScore, opponentScore]);

  // Fetch top gifters
  const fetchTopGifters = useCallback(async () => {
    if (!battle.session_id) return;

    const { data: gifts } = await supabase
      .from('podcast_gifts')
      .select('sender_id, recipient_id, points_value')
      .eq('session_id', battle.session_id);

    if (!gifts) return;

    // Aggregate by sender for each recipient
    const hostGifts: Record<string, number> = {};
    const opponentGifts: Record<string, number> = {};

    gifts.forEach(gift => {
      if (gift.recipient_id === battle.host_id) {
        hostGifts[gift.sender_id] = (hostGifts[gift.sender_id] || 0) + gift.points_value;
      } else if (gift.recipient_id === battle.opponent_id) {
        opponentGifts[gift.sender_id] = (opponentGifts[gift.sender_id] || 0) + gift.points_value;
      }
    });

    // Get top 3 for each
    const getTopGifters = async (giftsMap: Record<string, number>): Promise<TopGifter[]> => {
      const sorted = Object.entries(giftsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      if (sorted.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, avatar_url')
        .in('user_id', sorted.map(s => s[0]));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.avatar_url]) || []);
      
      return sorted.map(([userId, points]) => ({
        user_id: userId,
        avatar_url: profileMap.get(userId) || undefined,
        total_points: points
      }));
    };

    setHostTopGifters(await getTopGifters(hostGifts));
    setOpponentTopGifters(await getTopGifters(opponentGifts));
  }, [battle.session_id, battle.host_id, battle.opponent_id]);

  // Fetch top gifters on mount
  useEffect(() => {
    fetchTopGifters();
  }, [fetchTopGifters]);

  // Double-like handler
  const handleDoubleTap = async (side: 'host' | 'opponent') => {
    if (!user) {
      toast.error('Please sign in to boost');
      return;
    }

    const now = Date.now();
    const lastTap = lastTapTime[side];
    
    if (now - lastTap < 300) {
      // Double tap detected - add boost points
      const boostPoints = 5;
      const recipientId = side === 'host' ? battle.host_id : battle.opponent_id;
      
      // Show heart animation
      setShowHeartAnimation(prev => ({ ...prev, [side]: true }));
      setTimeout(() => {
        setShowHeartAnimation(prev => ({ ...prev, [side]: false }));
      }, 800);
      
      // Update score
      if (side === 'host') {
        const newScore = hostScore + boostPoints;
        setHostScore(newScore);
        await supabase
          .from('podcast_battles')
          .update({ host_score: newScore })
          .eq('id', battle.id);
      } else {
        const newScore = opponentScore + boostPoints;
        setOpponentScore(newScore);
        await supabase
          .from('podcast_battles')
          .update({ opponent_score: newScore })
          .eq('id', battle.id);
      }
    }
    
    setLastTapTime(prev => ({ ...prev, [side]: now }));
  };

  const handleGiftCreator = (creator: 'host' | 'opponent') => {
    setSelectedCreator(creator);
    setShowGiftModal(true);
  };

  // Handle leave battle
  const handleLeave = async () => {
    if (isHost && battleStatus === 'active' && timeRemaining > 0) {
      // Host leaving early - promote challenger to host and invite new opponent
      await supabase
        .from('podcast_battles')
        .update({
          host_id: battle.opponent_id,
          opponent_id: null,
          status: 'pending'
        })
        .eq('id', battle.id);
      
      // Find random active user to invite
      const { data: activeUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .neq('user_id', battle.opponent_id)
        .neq('user_id', user?.id)
        .limit(10);
      
      if (activeUsers && activeUsers.length > 0) {
        const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
        await supabase
          .from('battle_invites')
          .insert({
            battle_id: battle.id,
            from_user_id: battle.opponent_id,
            to_user_id: randomUser.user_id,
            status: 'pending'
          });
      }
      
      toast.info('You left the battle. Challenger promoted to host.');
    }
    
    disconnectAudio();
    onClose();
  };

  // Check if participant is speaking based on Agora audio levels
  const isHostSpeaking = participants.find(p => p.identity === battle.host_id)?.isSpeaking || false;
  const isOpponentSpeaking = participants.find(p => p.identity === battle.opponent_id)?.isSpeaking || false;

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#0e0e10] flex flex-col">
      {/* Winner Overlay */}
      {battleStatus === 'ended' && winnerId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-center animate-in zoom-in-50 duration-500">
            <Trophy className="h-20 w-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {winnerId === battle.host_id ? battle.host_name : battle.opponent_name} Wins!
            </h2>
            <p className="text-white/60 mb-6">
              {hostScore} - {opponentScore}
            </p>
            <Button onClick={onClose} className="bg-[#53fc18] text-black hover:bg-[#45d914]">
              Close Battle
            </Button>
          </div>
        </div>
      )}

      {/* Top Bar - Timer and Score */}
      <div className="shrink-0 bg-gradient-to-b from-black/80 to-transparent pt-14 pb-4 px-3 z-10">
        {/* Battle Timer */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1.5 rounded-full">
            <Timer className="h-4 w-4" />
            <span className="text-sm font-bold tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
          {audioConnected && isParticipant && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className={`h-8 w-8 p-0 ${isMuted ? 'text-red-500' : 'text-green-500'}`}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
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
        <div 
          className="flex-1 relative border-r border-white/10"
          onClick={() => handleDoubleTap('host')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#53fc18]/10 to-transparent" />
          
          {/* Double-like heart animation */}
          {showHeartAnimation.host && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Heart className="h-24 w-24 text-red-500 animate-ping" fill="currentColor" />
            </div>
          )}
          
          {/* Host Avatar/Video Area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {battle.host_avatar ? (
                <img 
                  src={battle.host_avatar} 
                  alt="" 
                  className={`w-20 h-20 lg:w-28 lg:h-28 rounded-full object-cover ring-4 ${isHostSpeaking ? 'ring-[#53fc18] animate-pulse' : 'ring-[#53fc18]/50'}`}
                />
              ) : (
                <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-[#53fc18] to-green-600 flex items-center justify-center">
                  <Users className="w-10 h-10 text-black" />
                </div>
              )}
              {/* Speaking indicator */}
              {isHostSpeaking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <div className="w-1 h-3 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-4 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                  <div className="w-1 h-2 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                  <div className="w-1 h-5 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="w-1 h-3 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
                </div>
              )}
            </div>
          </div>

          {/* Host Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-[#53fc18]">
                  {battle.host_avatar ? (
                    <img src={battle.host_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#53fc18] to-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-white truncate max-w-[60px]">{battle.host_name}</p>
                  <p className="text-[8px] text-[#53fc18]">Host</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleGiftCreator('host'); }}
                className="h-6 bg-[#53fc18] hover:bg-[#45d914] text-black text-[9px] px-2"
              >
                <Gift className="h-2.5 w-2.5 mr-0.5" />
                Gift
              </Button>
            </div>
            {/* Top gifters for host */}
            <div className="flex items-center gap-1 mt-1.5">
              <Crown className="h-2.5 w-2.5 text-yellow-400" />
              <div className="flex -space-x-1">
                {hostTopGifters.length > 0 ? hostTopGifters.map((gifter, i) => (
                  <div key={gifter.user_id} className="w-4 h-4 rounded-full bg-neutral-700 border border-black overflow-hidden">
                    {gifter.avatar_url ? (
                      <img src={gifter.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[6px] text-white">{i + 1}</div>
                    )}
                  </div>
                )) : [1, 2, 3].map((i) => (
                  <div key={i} className="w-4 h-4 rounded-full bg-neutral-700 border border-black flex items-center justify-center text-[6px] text-white/40">
                    {i}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Creator (Opponent) */}
        <div 
          className="flex-1 relative"
          onClick={() => handleDoubleTap('opponent')}
        >
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-500/10 to-transparent" />
          
          {/* Double-like heart animation */}
          {showHeartAnimation.opponent && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Heart className="h-24 w-24 text-red-500 animate-ping" fill="currentColor" />
            </div>
          )}
          
          {/* Opponent Avatar/Video Area */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {battle.opponent_avatar ? (
                <img 
                  src={battle.opponent_avatar} 
                  alt="" 
                  className={`w-20 h-20 lg:w-28 lg:h-28 rounded-full object-cover ring-4 ${isOpponentSpeaking ? 'ring-pink-500 animate-pulse' : 'ring-pink-500/50'}`}
                />
              ) : (
                <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Users className="w-10 h-10 text-white" />
                </div>
              )}
              {/* Speaking indicator */}
              {isOpponentSpeaking && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <div className="w-1 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '50ms' }} />
                  <div className="w-1 h-4 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '250ms' }} />
                  <div className="w-1 h-5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '350ms' }} />
                  <div className="w-1 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                </div>
              )}
            </div>
          </div>

          {/* Opponent Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); handleGiftCreator('opponent'); }}
                className="h-6 bg-pink-500 hover:bg-pink-600 text-white text-[9px] px-2"
              >
                <Gift className="h-2.5 w-2.5 mr-0.5" />
                Gift
              </Button>
              <div className="flex items-center gap-1.5">
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-white truncate max-w-[60px]">{battle.opponent_name}</p>
                  <p className="text-[8px] text-pink-400">Challenger</p>
                </div>
                <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-pink-500">
                  {battle.opponent_avatar ? (
                    <img src={battle.opponent_avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
                  )}
                </div>
              </div>
            </div>
            {/* Top gifters for opponent */}
            <div className="flex items-center justify-end gap-1 mt-1.5">
              <div className="flex -space-x-1">
                {opponentTopGifters.length > 0 ? opponentTopGifters.map((gifter, i) => (
                  <div key={gifter.user_id} className="w-4 h-4 rounded-full bg-neutral-700 border border-black overflow-hidden">
                    {gifter.avatar_url ? (
                      <img src={gifter.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[6px] text-white">{i + 1}</div>
                    )}
                  </div>
                )) : [1, 2, 3].map((i) => (
                  <div key={i} className="w-4 h-4 rounded-full bg-neutral-700 border border-black flex items-center justify-center text-[6px] text-white/40">
                    {i}
                  </div>
                ))}
              </div>
              <Crown className="h-2.5 w-2.5 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 bg-[#18181b] border-t border-white/10 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChat(!showChat)}
              className="h-8 text-white/60 hover:text-white text-xs"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Chat
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="h-8 bg-white/10 hover:bg-white/20 text-white text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" />
              Share
            </Button>
            {/* Only show leave button for participants */}
            {isParticipant && (
              <Button
                size="sm"
                onClick={handleLeave}
                className="h-8 bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Leave
              </Button>
            )}
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