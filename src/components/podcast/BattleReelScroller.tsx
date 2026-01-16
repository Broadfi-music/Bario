import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  // Fetch active battles (include both 'active' and 'pending' status)
  const fetchBattles = useCallback(async () => {
    console.log('🔍 Fetching active battles...');
    
    const { data, error } = await supabase
      .from('podcast_battles')
      .select('*')
      .in('status', ['active', 'pending']) // Include both pending and active
      .order('started_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('❌ Error fetching battles:', error);
      return;
    }

    console.log('📦 Battles found:', data?.length || 0, data);

    if (data && data.length > 0) {
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

      if (initialBattle) {
        const initialIndex = enrichedBattles.findIndex(b => b.id === initialBattle.id);
        if (initialIndex > 0) {
          const [battle] = enrichedBattles.splice(initialIndex, 1);
          enrichedBattles.unshift(battle);
        } else if (initialIndex === -1) {
          // Add initial battle if not in list
          enrichedBattles.unshift(initialBattle);
        }
      }

      console.log('✅ Enriched battles:', enrichedBattles.length);
      setBattles(enrichedBattles);
    } else if (initialBattle) {
      console.log('📦 Using initial battle only');
      setBattles([initialBattle]);
    } else {
      console.log('⚠️ No battles found');
      setBattles([]);
    }
  }, [initialBattle]);

  useEffect(() => {
    fetchBattles();

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
      setCurrentIndex(prev => Math.min(prev + 1, battles.length - 1));
    } else if (diff < -threshold) {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  };

  // Wheel handler for desktop scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 30) {
      setCurrentIndex(prev => Math.min(prev + 1, battles.length - 1));
    } else if (e.deltaY < -30) {
      setCurrentIndex(prev => Math.max(prev - 1, 0));
    }
  }, [battles.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

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
      className="h-[100dvh] overflow-hidden relative scrollbar-hide"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Battle View */}
      <BattleLive 
        battle={currentBattle}
        onClose={onClose}
      />

      {/* Battle counter - subtle indicator */}
      {battles.length > 1 && (
        <div className="absolute top-20 right-3 z-50 bg-black/50 px-2 py-1 rounded-full text-[10px] text-white/50">
          {currentIndex + 1} / {battles.length}
        </div>
      )}
    </div>
  );
};

export default BattleReelScroller;
