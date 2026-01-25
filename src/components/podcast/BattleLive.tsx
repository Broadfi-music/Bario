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

const WINNER_THRESHOLD = 650; // Score threshold to win early
const ROUND_DURATION = 300; // 5 minutes per round

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
  
  // Two-round battle system
  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [showRoundWinner, setShowRoundWinner] = useState(false);
  const [roundWinnerName, setRoundWinnerName] = useState<string>('');
  const roundStartTimeRef = useRef<number>(Date.now());
  
  // Winner celebration state for 650 threshold
  const [showWinnerCelebration, setShowWinnerCelebration] = useState(false);
  const [earlyWinner, setEarlyWinner] = useState<{ side: 'host' | 'opponent'; name: string; score: number } | null>(null);
  const celebrationTriggeredRef = useRef(false);
  
  // Top gifters state
  const [hostTopGifters, setHostTopGifters] = useState<TopGifter[]>([]);
  const [opponentTopGifters, setOpponentTopGifters] = useState<TopGifter[]>([]);
  
  // Double-like state - USE REF FOR INSTANT ACCESS (no state delay)
  const lastTapTimeRef = useRef<{ host: number; opponent: number }>({ host: 0, opponent: 0 });
  const [showHeartAnimation, setShowHeartAnimation] = useState<{ host: boolean; opponent: boolean }>({ host: false, opponent: false });
  const doubleTapDebounceRef = useRef<{ host: boolean; opponent: boolean }>({ host: false, opponent: false });
  
  // FIXED: Track WHICH SIDE we updated - only skip realtime for OUR taps, not all
  const pendingOptimisticRef = useRef<{ side: 'host' | 'opponent' | null; timestamp: number }>({ side: null, timestamp: 0 });
  
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
    startRecording,
    saveEpisode,
  } = useAgoraAudio({
    sessionId: battle.session_id || battle.id,
    userId: user?.id || '',
    userName: user?.email?.split('@')[0] || 'User',
    isHost: isParticipant, // Both host and opponent are publishers
  });

  // Track if we've initiated audio connection
  const audioConnectionRef = useRef(false);
  const connectionAttemptRef = useRef(0);

  // Auto-connect audio immediately for ALL authenticated users (participants publish, listeners subscribe)
  useEffect(() => {
    // FIXED: Allow ALL authenticated users to connect - not just participants
    // Participants will publish audio, listeners will only subscribe
    const shouldConnect = battle.session_id && user;
    
    if (shouldConnect && !audioConnected) {
      const attemptId = ++connectionAttemptRef.current;
      console.log('🎙️ Auto-connecting audio for battle viewer... Attempt:', attemptId, 'isParticipant:', isParticipant);
      audioConnectionRef.current = true;
      
      const connectTimeout = setTimeout(async () => {
        if (attemptId === connectionAttemptRef.current) {
          console.log('🎙️ Executing audio connection for attempt:', attemptId);
          // Pass isParticipant to determine if user should publish (speak) or just listen
          await connectAudio(battle.session_id || battle.id, isParticipant);
          
          // Auto-start recording for battles (only host)
          if (isHost) {
            console.log('🎙️ Auto-starting recording for battle host...');
            setTimeout(() => {
              startRecording();
            }, 1500);
          }
        }
      }, 500);
      
      return () => clearTimeout(connectTimeout);
    }
  }, [battle.session_id, battle.id, user?.id, isParticipant, audioConnected, connectAudio, isHost, startRecording]);

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

  // FIXED: Fetch fresh battle data on mount to prevent stale scores (like 1025 from old battles)
  useEffect(() => {
    const fetchFreshBattleData = async () => {
      console.log('🔄 Fetching fresh battle data for:', battle.id);
      const { data, error } = await supabase
        .from('podcast_battles')
        .select('host_score, opponent_score, status, winner_id')
        .eq('id', battle.id)
        .single();
      
      if (error) {
        console.error('❌ Failed to fetch fresh battle data:', error);
        return;
      }
      
      if (data) {
        console.log('✅ Fresh battle data:', data);
        setHostScore(data.host_score);
        setOpponentScore(data.opponent_score);
        setBattleStatus(data.status as 'pending' | 'active' | 'ended');
        if (data.winner_id) setWinnerId(data.winner_id);
      }
    };
    
    fetchFreshBattleData();
  }, [battle.id]);

  // Calculate progress bar percentages
  const totalScore = hostScore + opponentScore || 1;
  const hostPercent = (hostScore / totalScore) * 100;
  const opponentPercent = (opponentScore / totalScore) * 100;

  // Countdown timer with two rounds
  useEffect(() => {
    if (battleStatus !== 'active' || showRoundWinner) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - roundStartTimeRef.current) / 1000);
      const remaining = Math.max(0, ROUND_DURATION - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        
        if (currentRound === 1) {
          // End of Round 1 - announce round winner and start Round 2
          const roundWinner = hostScore > opponentScore 
            ? battle.host_name 
            : opponentScore > hostScore 
              ? battle.opponent_name 
              : 'Tie';
          setRoundWinnerName(roundWinner || 'Tie');
          setShowRoundWinner(true);
          
          // After 5 seconds, start Round 2
          setTimeout(() => {
            setShowRoundWinner(false);
            setCurrentRound(2);
            roundStartTimeRef.current = Date.now();
            setTimeRemaining(ROUND_DURATION);
          }, 5000);
        } else {
          // End of Round 2 - determine final winner
          determineWinner();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [battleStatus, currentRound, showRoundWinner, hostScore, opponentScore, battle.host_name, battle.opponent_name]);

  // Determine winner function - saves episode and ends battle
  // FIXED: Fetch fresh scores from database to ensure accuracy
  const determineWinner = async () => {
    if (!isParticipant) return;
    
    // Fetch the ACTUAL final scores from database to ensure accuracy
    const { data: freshBattle } = await supabase
      .from('podcast_battles')
      .select('host_score, opponent_score')
      .eq('id', battle.id)
      .single();
    
    const finalHostScore = freshBattle?.host_score ?? hostScore;
    const finalOpponentScore = freshBattle?.opponent_score ?? opponentScore;
    
    // Update local state with fresh scores
    setHostScore(finalHostScore);
    setOpponentScore(finalOpponentScore);
    
    const winner = finalHostScore > finalOpponentScore 
      ? battle.host_id 
      : finalOpponentScore > finalHostScore 
        ? battle.opponent_id 
        : null;
    
    setWinnerId(winner);
    setBattleStatus('ended');
    
    // Save episode with recorded audio (only host saves)
    if (isHost) {
      console.log('🎙️ Saving battle episode...');
      try {
        await saveEpisode(
          `Battle: ${battle.host_name} vs ${battle.opponent_name}`,
          `Live battle recording. Winner: ${winner === battle.host_id ? battle.host_name : winner === battle.opponent_id ? battle.opponent_name : 'Tie'}. Final score: ${finalHostScore} - ${finalOpponentScore}`
        );
      } catch (err) {
        console.error('Failed to save battle episode:', err);
      }
    }
    
    await supabase
      .from('podcast_battles')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        winner_id: winner
      })
      .eq('id', battle.id);
    
    // Also end the session
    if (battle.session_id) {
      await supabase
        .from('podcast_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', battle.session_id);
    }
    
    const winnerName = winner === battle.host_id 
      ? battle.host_name 
      : winner === battle.opponent_id 
        ? battle.opponent_name 
        : null;
    
    if (winner === user?.id) {
      toast.success(`🏆 Congratulations! ${winnerName} wins the battle!`);
    } else if (winner) {
      toast.info(`🏆 ${winnerName} wins the battle!`);
    } else {
      toast.info("It's a tie!");
    }
    
    // Navigate away after showing winner - NO Host Studio
    setTimeout(() => {
      disconnectAudio();
      onClose();
      navigate('/podcasts');
    }, 5000);
  };

  // Check for winner at 650 threshold
  const checkWinnerThreshold = useCallback(async (newHostScore: number, newOpponentScore: number) => {
    if (celebrationTriggeredRef.current || battleStatus === 'ended') return;
    
    if (newHostScore >= WINNER_THRESHOLD) {
      celebrationTriggeredRef.current = true;
      console.log('🏆 Host reached 650 - WINNER!');
      setEarlyWinner({ side: 'host', name: battle.host_name || 'Host', score: newHostScore });
      setShowWinnerCelebration(true);
      
      // Update database to end battle with winner
      await supabase
        .from('podcast_battles')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winner_id: battle.host_id
        })
        .eq('id', battle.id);
        
    } else if (newOpponentScore >= WINNER_THRESHOLD) {
      celebrationTriggeredRef.current = true;
      console.log('🏆 Opponent reached 650 - WINNER!');
      setEarlyWinner({ side: 'opponent', name: battle.opponent_name || 'Opponent', score: newOpponentScore });
      setShowWinnerCelebration(true);
      
      // Update database to end battle with winner
      await supabase
        .from('podcast_battles')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winner_id: battle.opponent_id
        })
        .eq('id', battle.id);
    }
  }, [battle.id, battle.host_id, battle.host_name, battle.opponent_id, battle.opponent_name, battleStatus]);

  // Use refs for score values to avoid stale closures in realtime handler
  const hostScoreRef = useRef(hostScore);
  const opponentScoreRef = useRef(opponentScore);
  
  // Keep refs in sync with state
  useEffect(() => {
    hostScoreRef.current = hostScore;
    opponentScoreRef.current = opponentScore;
  }, [hostScore, opponentScore]);

  // Real-time battle status updates - AUTO CLOSE WHEN BATTLE ENDS
  // FIXED: Use refs instead of state to avoid stale closure issues
  // Real-time battle status updates - SIMPLIFIED for reliable sync across ALL users
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
          const newHostScore = payload.new.host_score;
          const newOpponentScore = payload.new.opponent_score;
          
          console.log('🔴 Battle realtime update - DB:', newHostScore, newOpponentScore);
          
          // Check if we recently made an optimistic update
          const pending = pendingOptimisticRef.current;
          const timeSinceOptimistic = Date.now() - pending.timestamp;
          
          // Only skip if WE just tapped within the last 500ms
          // This prevents our own UI from flickering, while ensuring ALL OTHER viewers see the update
          if (pending.side !== null && timeSinceOptimistic < 500) {
            console.log('⏳ Skipping realtime - we just tapped:', pending.side, timeSinceOptimistic, 'ms ago');
            // Still check for winner threshold
            checkWinnerThreshold(newHostScore, newOpponentScore);
            return;
          }
          
          // ALWAYS apply database values for everyone else
          console.log('✅ Applying realtime scores:', newHostScore, newOpponentScore);
          setHostScore(newHostScore);
          setOpponentScore(newOpponentScore);
          
          // Check for 650 threshold winner
          checkWinnerThreshold(newHostScore, newOpponentScore);
          
          // Handle status changes
          if (payload.new.status === 'ended') {
            setBattleStatus('ended');
            setWinnerId(payload.new.winner_id);
            disconnectAudio();
            
            if (!payload.new.winner_id) {
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
      .subscribe((status) => {
        console.log('📡 Battle realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle.id, disconnectAudio, navigate, onClose, checkWinnerThreshold]);

  // POLLING FALLBACK: Fetch scores every 2 seconds to ensure sync across ALL devices
  // This guarantees opponents see each other's scores even if realtime has issues
  useEffect(() => {
    if (battleStatus === 'ended') return;
    
    const pollScores = async () => {
      const { data, error } = await supabase
        .from('podcast_battles')
        .select('host_score, opponent_score, status, winner_id')
        .eq('id', battle.id)
        .single();
      
      if (error) {
        console.warn('Polling error:', error);
        return;
      }
      
      if (data) {
        // Only update if we haven't recently made an optimistic update (within 1 second)
        const pending = pendingOptimisticRef.current;
        const timeSinceOptimistic = Date.now() - pending.timestamp;
        
        if (pending.side === null || timeSinceOptimistic > 1000) {
          console.log('📊 Polling sync:', data.host_score, data.opponent_score);
          setHostScore(data.host_score);
          setOpponentScore(data.opponent_score);
        }
        
        // Check for winner threshold
        checkWinnerThreshold(data.host_score, data.opponent_score);
        
        // Handle ended battle
        if (data.status === 'ended') {
          setBattleStatus('ended');
          setWinnerId(data.winner_id);
        }
      }
    };
    
    // Poll every 2 seconds as fallback for realtime
    const pollInterval = setInterval(pollScores, 2000);
    
    return () => clearInterval(pollInterval);
  }, [battle.id, battleStatus, checkWinnerThreshold]);

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

  // Listen for gifts - UPDATE SCORES ON SERVER SIDE, just refresh top gifters here
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
        async () => {
          // Just refresh top gifters - scores are synced via battle status subscription
          // This prevents race conditions where local state gets out of sync
          fetchTopGifters();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battle.id, battle.session_id, fetchTopGifters]);

  // Double-tap handler - FIXED: Works on both mobile (touch) and desktop (click)
  // Now with OPTIMISTIC LOCAL UPDATE so the tapper sees the score immediately
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
      const boostPoints = 25; // Changed from 5 to 25 for faster battles
      
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
      
      // FIXED: Mark WHICH SIDE we're updating so realtime knows to skip only OUR tap
      pendingOptimisticRef.current = { side, timestamp: Date.now() };
      
      // OPTIMISTIC LOCAL UPDATE - show score immediately to the tapper
      if (side === 'host') {
        setHostScore(prev => prev + boostPoints);
      } else {
        setOpponentScore(prev => prev + boostPoints);
      }
      
      // Visual feedback for successful boost
      toast.success(`+${boostPoints} boost!`, { duration: 1000 });
      
      try {
        // Use atomic database function to prevent race conditions
        // This ensures ALL viewers see the same score in real-time
        console.log('🎯 Calling increment_battle_score RPC:', { battle_uuid: battle.id, score_side: side, increment_by: boostPoints });
        
        const { data, error } = await supabase.rpc('increment_battle_score', {
          battle_uuid: battle.id,
          score_side: side,
          increment_by: boostPoints
        });
        
        if (error) {
          console.error('❌ Score increment RPC error:', error.message, error);
          // Rollback optimistic update on error
          if (side === 'host') {
            setHostScore(prev => prev - boostPoints);
          } else {
            setOpponentScore(prev => prev - boostPoints);
          }
          return;
        }
        
        console.log('✅ Score increment success:', data);
        
        // USE RPC RESPONSE AS SOURCE OF TRUTH - sync both scores for all viewers
        if (data) {
          const { host_score, opponent_score } = data as { host_score: number; opponent_score: number };
          setHostScore(host_score);
          setOpponentScore(opponent_score);
          // FIXED: Clear pending optimistic after RPC success - realtime can now take over
          pendingOptimisticRef.current = { side: null, timestamp: Date.now() };
        }
      } catch (error) {
        console.error('❌ Double-tap update error:', error);
        // Rollback optimistic update on error
        if (side === 'host') {
          setHostScore(prev => prev - boostPoints);
        } else {
          setOpponentScore(prev => prev - boostPoints);
        }
      }
    }
  }, [user, battle.id]);

  // Touch handler for mobile - prevents 300ms delay
  const handleTouchEnd = useCallback((side: 'host' | 'opponent', e: React.TouchEvent) => {
    e.preventDefault(); // Prevent ghost clicks
    handleDoubleTap(side);
  }, [handleDoubleTap]);

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
      {/* 🎉 WINNER CELEBRATION at 650 Score - Full screen animated overlay */}
      {showWinnerCelebration && earlyWinner && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 overflow-hidden">
          {/* Confetti particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][i % 8],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
          
          <div className="text-center animate-in zoom-in-50 duration-700 relative z-10">
            {/* Glowing ring */}
            <div className="relative mx-auto mb-6">
              <div className={`absolute inset-0 rounded-full blur-xl ${earlyWinner.side === 'host' ? 'bg-[#53fc18]' : 'bg-pink-500'} opacity-50 animate-pulse`} 
                   style={{ width: '140px', height: '140px', marginLeft: '-10px', marginTop: '-10px' }} />
              <Trophy className="h-28 w-28 text-yellow-400 mx-auto animate-bounce relative z-10" 
                      style={{ filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' }} />
            </div>
            
            {/* Winner text with glow */}
            <div className="mb-4">
              <span className="text-6xl mb-2 block">🎉</span>
              <h1 className={`text-4xl md:text-5xl font-black mb-2 ${earlyWinner.side === 'host' ? 'text-[#53fc18]' : 'text-pink-500'}`}
                  style={{ textShadow: `0 0 30px ${earlyWinner.side === 'host' ? '#53fc18' : '#ec4899'}` }}>
                WINNER!
              </h1>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 animate-pulse">
              {earlyWinner.name}
            </h2>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              <Crown className="h-6 w-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{earlyWinner.score} pts</span>
              <Crown className="h-6 w-6 text-yellow-400" />
            </div>
            
            <p className="text-white/60 text-lg mb-8">
              Reached {WINNER_THRESHOLD} first! 🔥
            </p>
            
            <Button 
              onClick={() => {
                setShowWinnerCelebration(false);
                onClose();
                navigate('/podcasts');
              }} 
              size="lg"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold hover:from-yellow-500 hover:to-orange-600 px-8 py-3 text-lg shadow-xl"
            >
              🏆 Close Battle
            </Button>
          </div>
        </div>
      )}

      {/* Standard Winner Overlay (for timer-based wins) */}
      {battleStatus === 'ended' && winnerId && !showWinnerCelebration && (
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

      {/* Round Winner Announcement Overlay */}
      {showRoundWinner && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/80 animate-in fade-in duration-300">
          <div className="text-center animate-in zoom-in-50 duration-500">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-yellow-400 mb-2">Round 1 Winner!</h2>
            <p className="text-4xl font-black text-white mb-4">{roundWinnerName}</p>
            <p className="text-white/60 text-lg">Round 2 starting in 5 seconds...</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="text-[#53fc18] font-bold">{hostScore}</span>
              <Swords className="h-5 w-5 text-yellow-400" />
              <span className="text-pink-500 font-bold">{opponentScore}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Timer, Round Indicator, Scores, Mic */}
      <div className="shrink-0 bg-gradient-to-b from-black/90 to-transparent pt-14 pb-3 px-3 z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Round indicator */}
          <div className="bg-purple-600/90 text-white px-2 py-0.5 rounded-full">
            <span className="text-[10px] font-bold">ROUND {currentRound}</span>
          </div>
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
        {/* Host vs Opponent Split - Enlarged with Mobile Touch Support */}
        <div className="shrink-0 flex flex-row h-48 lg:h-56 border-b border-white/10 relative">
          {/* Host Side - MOBILE TOUCH FIX: onTouchEnd + touch-action: manipulation */}
          <div 
            className="flex-1 relative border-r border-white/10 flex items-center justify-center bg-gradient-to-br from-[#53fc18]/5 to-transparent cursor-pointer select-none"
            style={{ touchAction: 'manipulation' }}
            onClick={() => handleDoubleTap('host')}
            onTouchEnd={(e) => handleTouchEnd('host', e)}
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

          {/* Opponent Side - MOBILE TOUCH FIX: onTouchEnd + touch-action: manipulation */}
          <div 
            className="flex-1 relative flex items-center justify-center bg-gradient-to-bl from-pink-500/5 to-transparent cursor-pointer select-none"
            style={{ touchAction: 'manipulation' }}
            onClick={() => handleDoubleTap('opponent')}
            onTouchEnd={(e) => handleTouchEnd('opponent', e)}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎁 Host gift button clicked');
              // Use requestAnimationFrame to ensure modal opens after all events processed
              requestAnimationFrame(() => {
                setSelectedCreator('host');
                setShowGiftModal(true);
              });
            }}
            className="h-10 bg-[#53fc18] hover:bg-[#45d914] active:bg-[#3ec512] text-black text-sm px-6 shadow-xl"
          >
            <Gift className="h-4 w-4 mr-2" />
            Gift {battle.host_name?.split(' ')[0]}
          </Button>
          
          <Button
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🎁 Opponent gift button clicked');
              requestAnimationFrame(() => {
                setSelectedCreator('opponent');
                setShowGiftModal(true);
              });
            }}
            className="h-10 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white text-sm px-6 shadow-xl"
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
              hideGiftButton={true}
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

      {/* Gift Modal - Battle mode with creator selection */}
      <TikTokGiftModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        sessionId={battle.session_id || ''}
        hostId={selectedCreator === 'host' ? battle.host_id : battle.opponent_id}
        hostName={selectedCreator === 'host' ? battle.host_name : battle.opponent_name}
        battleMode={true}
        creators={[
          { id: battle.host_id, name: battle.host_name || 'Host', avatar: battle.host_avatar },
          { id: battle.opponent_id, name: battle.opponent_name || 'Opponent', avatar: battle.opponent_avatar }
        ]}
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
