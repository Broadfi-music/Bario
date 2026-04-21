import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserCredits {
  balance: number;
  total_earned: number;
  total_spent: number;
  total_purchased: number;
  plan: 'free' | 'basic' | 'pro';
  monthly_allowance: number;
  daily_free_credits: number;
}

const DEFAULT_CREDITS: UserCredits = {
  balance: 0,
  total_earned: 0,
  total_spent: 0,
  total_purchased: 0,
  plan: 'free',
  monthly_allowance: 0,
  daily_free_credits: 5,
};

export const useUserCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits>(DEFAULT_CREDITS);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(DEFAULT_CREDITS);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('useUserCredits error:', error);
    }

    if (data) {
      setCredits({
        balance: data.balance,
        total_earned: data.total_earned,
        total_spent: data.total_spent,
        total_purchased: data.total_purchased,
        plan: (data.plan as UserCredits['plan']) || 'free',
        monthly_allowance: data.monthly_allowance,
        daily_free_credits: data.daily_free_credits,
      });
    } else {
      // Auto-create row with 5 free credits if it doesn't exist (e.g. legacy users)
      const { data: created } = await supabase
        .from('user_credits')
        .insert({ user_id: user.id, balance: 5, total_earned: 5 })
        .select('*')
        .maybeSingle();
      if (created) {
        setCredits({
          balance: created.balance,
          total_earned: created.total_earned,
          total_spent: created.total_spent,
          total_purchased: created.total_purchased,
          plan: (created.plan as UserCredits['plan']) || 'free',
          monthly_allowance: created.monthly_allowance,
          daily_free_credits: created.daily_free_credits,
        });
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredits();

    if (!user) return;

    // Realtime updates so the balance refreshes after generations
    const channel = supabase
      .channel(`user-credits-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_credits', filter: `user_id=eq.${user.id}` },
        () => fetchCredits(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCredits]);

  return { credits, loading, refresh: fetchCredits };
};
