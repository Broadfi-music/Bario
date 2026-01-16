import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Gift, Share2, Crown, Swords,
  Timer, Trophy, Heart, LogOut, Mic, MicOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TwitchComments from './TwitchComments';
import TikTokGiftModal from './TikTokGiftModal';
import TikTokGiftDisplay from './TikTokGiftDisplay';
import GiftAnimation from './GiftAnimation';
import ShareModal from './ShareModal';
import { toast } from 'sonner';
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
  const [battleStatus, setBattleStatus] = useState(battle.status);
  const [winnerId, setWinnerId] = useState<string | null>(battle.winner_id);
  
  // Top gifters state
  const [hostTopGifters, setHostTopGifters] = useState<TopGifter[]>([]);
  const [opponentTopGifters, setOpponentTopGifters] = useState<TopGifter[]>([]);
  
  // Double-like state - USE REF FOR INSTANT ACCESS (no state delay)
  const lastTapTimeRef = useRef<{ host: number; opponent: number }>({ host: 0, opponent: 0 });
  const [showHeartAnimation, setShowHeartAnimation] = useState<{ host: boolean; opponent: boolean }>({ host: false, opponent: false });
  const doubleTapDebounceRef = useRef<{ host: boolean; opponent: boolean }>({ host: false, opponent: false });
  
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

  // Track if we've initiated audio connection
  const audioConnectionRef = useRef(false);
  const connectionAttemptRef = useRef(0);

  // Auto-connect audio immediately for participants
  useEffect(() => {
    const shouldConnect = battle.session_id && user && isParticipant;
    
    if (shouldConnect && !audioConnected) {
      const attemptId = ++connectionAttemptRef.current;
      console.log('🎙️ Auto-connecting audio for battle participant... Attempt:', attemptId);
      audioConnectionRef.current = true;
      
      const connectTimeout = setTimeout(() => {
        if (attemptId === connectionAttemptRef.current) {
          console.log('🎙️ Executing audio connection for attempt:', attemptId);
          connectAudio(battle.session_id || battle.id, true);
        }
      }, 500);
      
      return () => clearTimeout(connectTimeout);
    }
  }, [battle.session_id, battle.id, user?.id, isParticipant, audioConnected, connectAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioConnectionRef.current) {
        console.log('🧹 Disconnecting audio on cleanup');
        audioConnectionRef.current = false;
        disconnectAudio();
      }
    };
  }, [disconnectAudio]);

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
        determineWinner();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battleStatus, battle.started_at, battle.duration_seconds]);

  // Determine winner function
  const determineWinner = async () => {
    if (!isParticipant) return;
    
    const winner = hostScore > opponentScore 
      ? battle.host_id 
      : opponentScore > hostScore 
        ? battle.opponent_id 
        : null;
    
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

  // Real-time battle status updates - AUTO CLOSE WHEN BATTLE ENDS
  useEffect(() => {
    const channel = supabase
      .channel(`battle-status-${battle.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'podcast_battles',
          filter: `id=eq.${battle.id}`
        },
        (payload: any) => {
          console.log('🔴 Battle status update:', payload.new.status);
          setHostScore(payload.new.host_score);
          setOpponentScore(payload.new.opponent_score);
          
          if (payload.new.status === 'ended') {
            setBattleStatus('ended');
            setWinnerId(payload.new.winner_id);
            
            // Disconnect audio and navigate away after showing winner
            disconnectAudio();
            
            if (!payload.new.winner_id) {
              // No winner means someone left - close immediately
              toast.info('Battle ended');
              setTimeout(() => {
                onClose();
                navigate('/podcasts');
              }, 1000);
            }
          } else if (payload.new.status) {
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
  }, [battle.id, disconnectAudio, navigate, onClose]);

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

    const hostGifts: Record<string, number> = {};
    const opponentGifts: Record<string, number> = {};

    gifts.forEach(gift => {
      if (gift.recipient_id === battle.host_id) {
        hostGifts[gift.sender_id] = (hostGifts[gift.sender_id] || 0) + gift.points_value;
      } else if (gift.recipient_id === battle.opponent_id) {
        opponentGifts[gift.sender_id] = (opponentGifts[gift.sender_id] || 0) + gift.points_value;
      }
    });

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

  useEffect(() => {
    fetchTopGifters();
  }, [fetchTopGifters]);

  // Double-tap handler - FIXED with useRef for instant timing
  const handleDoubleTap = useCallback(async (side: 'host' | 'opponent') => {
    if (!user) {
      toast.error('Please sign in to boost');
      return;
    }

    // Debounce to prevent rapid fire
    if (doubleTapDebounceRef.current[side]) return;

    const now = Date.now();
    const lastTap = lastTapTimeRef.current[side];
    
    // Update tap time immediately using ref (no state delay)
    lastTapTimeRef.current[side] = now;
    
    // Check for double-tap within 400ms window (increased from 300ms)
    if (now - lastTap < 400 && lastTap > 0) {
      const boostPoints = 5;
      
      // Set debounce
      doubleTapDebounceRef.current[side] = true;
      setTimeout(() => {
        doubleTapDebounceRef.current[side] = false;
      }, 300);
      
      // Show animation
      setShowHeartAnimation(prev => ({ ...prev, [side]: true }));
      setTimeout(() => {
        setShowHeartAnimation(prev => ({ ...prev, [side]: false }));
      }, 800);
      
      try {
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
        
        // Visual feedback for successful boost
        toast.success(`+${boostPoints} boost!`, { duration: 1000 });
      } catch (error) {
        console.error('Double-tap update error:', error);
      }
    }
  }, [user, hostScore, opponentScore, battle.id]);

  // Gift button handler - FIXED to work properly
  const handleGiftCreator = useCallback((creator: 'host' | 'opponent', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('🎁 Opening gift modal for:', creator);
    setSelectedCreator(creator);
    setShowGiftModal(true);
  }, []);

  // Handle leave battle - end battle and session immediately
  const handleLeave = async () => {
    // End the battle immediately
    await supabase
      .from('podcast_battles')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', battle.id);

    // End the session too
    if (battle.session_id) {
      await supabase
        .from('podcast_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', battle.session_id);
    }
    
    disconnectAudio();
    toast.info('You left the battle.');
    onClose();
    navigate('/podcasts');
  };

  // Check if participant is speaking
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
            <Button 
              onClick={() => {
                onClose();
                navigate('/podcasts');
              }} 
              className="bg-[#53fc18] text-black hover:bg-[#45d914]"
            >
              Close Battle
            </Button>
          </div>
        </div>
      )}

      {/* Top Bar - Timer, Scores, Mic */}
      <div className="shrink-0 bg-gradient-to-b from-black/90 to-transparent pt-14 pb-3 px-3 z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1 rounded-full">
            <Timer className="h-3.5 w-3.5" />
            <span className="text-xs font-bold tabular-nums">{formatTime(timeRemaining)}</span>
          </div>
          {audioConnected && isParticipant && (
            <Button
              size="sm"
              variant="ghost"
              onClick={toggleMute}
              className={`h-7 w-7 p-0 ${isMuted ? 'text-red-500' : 'text-green-500'}`}
            >
              {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>

        {/* Score Bar */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[#53fc18] font-bold text-sm">{hostScore}</span>
          </div>
          <Swords className="h-4 w-4 text-yellow-400" />
          <div className="flex items-center gap-1.5">
            <span className="text-pink-500 font-bold text-sm">{opponentScore}</span>
          </div>
        </div>

        <div className="h-1.5 rounded-full overflow-hidden bg-neutral-800 flex">
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

      {/* Battle Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Host vs Opponent Split - Enlarged */}
        <div className="shrink-0 flex flex-row h-48 lg:h-56 border-b border-white/10 relative">
          {/* Host Side */}
          <div 
            className="flex-1 relative border-r border-white/10 flex items-center justify-center bg-gradient-to-br from-[#53fc18]/5 to-transparent cursor-pointer"
            onClick={() => handleDoubleTap('host')}
          >
            {showHeartAnimation.host && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Heart className="h-16 w-16 text-red-500 animate-ping" fill="currentColor" />
              </div>
            )}
            
            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
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
                {isHostSpeaking && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-0.5 h-2 bg-[#53fc18] rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs lg:text-sm font-bold text-white truncate max-w-[100px]">{battle.host_name}</p>
              <div className="flex items-center gap-1">
                <Crown className="h-2.5 w-2.5 text-yellow-400" />
                <div className="flex -space-x-1">
                  {hostTopGifters.length > 0 ? hostTopGifters.slice(0, 3).map((g, i) => (
                    <div key={g.user_id} className="w-3.5 h-3.5 rounded-full bg-neutral-700 border border-black overflow-hidden">
                      {g.avatar_url ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                  )) : [1, 2, 3].map(i => (
                    <div key={i} className="w-3.5 h-3.5 rounded-full bg-neutral-700 border border-black" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Opponent Side */}
          <div 
            className="flex-1 relative flex items-center justify-center bg-gradient-to-bl from-pink-500/5 to-transparent cursor-pointer"
            onClick={() => handleDoubleTap('opponent')}
          >
            {showHeartAnimation.opponent && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Heart className="h-16 w-16 text-red-500 animate-ping" fill="currentColor" />
              </div>
            )}
            
            <div className="flex flex-col items-center gap-1.5 pointer-events-none">
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
                {isOpponentSpeaking && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs lg:text-sm font-bold text-white truncate max-w-[100px]">{battle.opponent_name}</p>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {opponentTopGifters.length > 0 ? opponentTopGifters.slice(0, 3).map((g) => (
                    <div key={g.user_id} className="w-3.5 h-3.5 rounded-full bg-neutral-700 border border-black overflow-hidden">
                      {g.avatar_url ? <img src={g.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                  )) : [1, 2, 3].map(i => (
                    <div key={i} className="w-3.5 h-3.5 rounded-full bg-neutral-700 border border-black" />
                  ))}
                </div>
                <Crown className="h-2.5 w-2.5 text-yellow-400" />
              </div>
            </div>
          </div>

        </div>

        {/* MOBILE GIFT BUTTONS - Separate action bar above chat */}
        <div className="shrink-0 flex items-center justify-center gap-4 py-2 px-4 bg-black/50 border-y border-white/5">
          <Button
            size="sm"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎁 Host gift button pressed (mobile/desktop)');
              setSelectedCreator('host');
              setShowGiftModal(true);
            }}
            className="h-10 bg-[#53fc18] hover:bg-[#45d914] active:bg-[#3ec512] text-black text-sm px-6 shadow-xl touch-none select-none"
          >
            <Gift className="h-4 w-4 mr-2" />
            Gift {battle.host_name?.split(' ')[0]}
          </Button>
          
          <Button
            size="sm"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎁 Opponent gift button pressed (mobile/desktop)');
              setSelectedCreator('opponent');
              setShowGiftModal(true);
            }}
            className="h-10 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white text-sm px-6 shadow-xl touch-none select-none"
          >
            <Gift className="h-4 w-4 mr-2" />
            Gift {battle.opponent_name?.split(' ')[0]}
          </Button>
        </div>

        {/* Chat Section - Always Visible */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {battle.session_id && (
            <TwitchComments 
              sessionId={battle.session_id} 
              hostId={battle.host_id}
              onSendGift={() => setShowGiftModal(true)}
              sessionTitle={`${battle.host_name} vs ${battle.opponent_name}`}
            />
          )}
        </div>

        {/* Bottom Action Bar - Only Leave for participants */}
        {isParticipant && (
          <div className="shrink-0 bg-[#18181b] border-t border-white/10 px-3 py-2 flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="h-7 bg-white/10 hover:bg-white/20 text-white text-[10px]"
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
            <Button
              size="sm"
              onClick={handleLeave}
              className="h-7 bg-red-600 hover:bg-red-700 text-white text-[10px]"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Leave
            </Button>
          </div>
        )}
      </div>

      {/* TikTok-style Gift Display */}
      {battle.session_id && <TikTokGiftDisplay sessionId={battle.session_id} />}
      
      {/* Full-screen Video Gift Animations */}
      {battle.session_id && <GiftAnimation sessionId={battle.session_id} />}

      {/* Gift Modal - Show creator name */}
      <TikTokGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={battle.session_id || ''}
        hostId={selectedCreator === 'host' ? battle.host_id : battle.opponent_id}
        hostName={selectedCreator === 'host' ? battle.host_name : battle.opponent_name}
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
