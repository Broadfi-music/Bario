import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronUp, ChevronDown } from 'lucide-react';
import BattleLive from './BattleLive';

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

interface BattleReelScrollerProps {
  initialBattle?: BattleSession;
  onClose: () => void;
}

const BattleReelScroller = ({ initialBattle, onClose }: BattleReelScrollerProps) => {
  const { user } = useAuth();
  const [battles, setBattles] = useState<BattleSession[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // Fetch active battles
  const fetchBattles = useCallback(async () => {
    const { data } = await supabase
      .from('podcast_battles')
      .select('*')
      .eq('status', 'active')
      .order('started_at', { ascending: false });

    if (data && data.length > 0) {
      // Fetch profiles for all hosts and opponents
      const userIds = [...new Set(data.flatMap(b => [b.host_id, b.opponent_id]))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enrichedBattles: BattleSession[] = data.map(battle => ({
        id: battle.id,
        session_id: battle.session_id,
        host_id: battle.host_id,
        opponent_id: battle.opponent_id,
        status: battle.status as 'pending' | 'active' | 'ended',
        duration_seconds: battle.duration_seconds,
        started_at: battle.started_at,
        ended_at: battle.ended_at,
        winner_id: battle.winner_id,
        host_score: battle.host_score,
        opponent_score: battle.opponent_score,
        host_name: profileMap.get(battle.host_id)?.full_name || profileMap.get(battle.host_id)?.username || 'Host',
        host_avatar: profileMap.get(battle.host_id)?.avatar_url,
        opponent_name: profileMap.get(battle.opponent_id)?.full_name || profileMap.get(battle.opponent_id)?.username || 'Opponent',
        opponent_avatar: profileMap.get(battle.opponent_id)?.avatar_url,
      }));

      // If we have an initial battle, put it first
      if (initialBattle) {
        const initialIndex = enrichedBattles.findIndex(b => b.id === initialBattle.id);
        if (initialIndex > 0) {
          const [battle] = enrichedBattles.splice(initialIndex, 1);
          enrichedBattles.unshift(battle);
        } else if (initialIndex === -1) {
          enrichedBattles.unshift(initialBattle);
        }
      }

      setBattles(enrichedBattles);
    } else if (initialBattle) {
      setBattles([initialBattle]);
    }
  }, [initialBattle]);

  useEffect(() => {
    fetchBattles();

    // Subscribe to battle updates
    const channel = supabase
      .channel('battle-reel-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_battles'
        },
        () => {
          fetchBattles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBattles]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (diff > threshold) {
      // Swipe up - next battle
      setCurrentIndex(prev => Math.min(prev + 1, battles.length - 1));
    } else if (diff < -threshold) {
      // Swipe down - previous battle
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  const handleScroll = (direction: 'up' | 'down') => {
    if (direction === 'up') {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    } else {
      setCurrentIndex(prev => Math.min(prev + 1, battles.length - 1));
    }
  };

  const currentBattle = battles[currentIndex];

  if (!currentBattle) {
    return (
      <div className="h-[100dvh] bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-lg mb-2">No active battles</p>
          <button onClick={onClose} className="text-[#53fc18] underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Battle View */}
      <BattleLive 
        battle={currentBattle}
        onClose={onClose}
      />

      {/* Navigation Indicators - Desktop */}
      <div className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-50">
        <button
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className="p-2 bg-black/50 rounded-full text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        
        {/* Dots indicator */}
        <div className="flex flex-col items-center gap-1 py-2">
          {battles.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => {
            const actualIndex = Math.max(0, currentIndex - 2) + i;
            return (
              <div
                key={actualIndex}
                className={`w-1.5 transition-all duration-200 rounded-full ${
                  actualIndex === currentIndex 
                    ? 'h-4 bg-[#53fc18]' 
                    : 'h-1.5 bg-white/30'
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={() => handleScroll('down')}
          disabled={currentIndex === battles.length - 1}
          className="p-2 bg-black/50 rounded-full text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {/* Swipe hint for mobile */}
      {battles.length > 1 && (
        <div className="lg:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-50 text-white/40 text-xs flex flex-col items-center animate-bounce">
          <ChevronUp className="h-4 w-4" />
          <span>Swipe for more battles</span>
        </div>
      )}

      {/* Battle counter */}
      <div className="absolute top-20 right-4 z-50 bg-black/50 px-2 py-1 rounded-full text-xs text-white/60">
        {currentIndex + 1} / {battles.length}
      </div>
    </div>
  );
};

export default BattleReelScroller;