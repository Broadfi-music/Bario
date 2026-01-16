import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Swords, Loader2 } from 'lucide-react';

interface BattleInvite {
  id: string;
  battle_id: string;
  from_user_id: string;
  status: string;
  created_at: string;
  from_user?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  battle?: {
    duration_seconds: number;
    session_id: string | null;
  };
}

interface BattleNotificationProps {
  onAccept: (battleId: string) => void;
}

const BattleNotification = ({ onAccept }: BattleNotificationProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const processedInvitesRef = useRef<Set<string>>(new Set());

  // Auto-accept battle invite
  const autoAcceptBattle = useCallback(async (invite: BattleInvite) => {
    if (!user || isProcessing) return;
    if (processedInvitesRef.current.has(invite.id)) return;
    
    processedInvitesRef.current.add(invite.id);
    setIsProcessing(true);

    const senderName = invite.from_user?.full_name || invite.from_user?.username || 'Someone';
    
    // Show toast notification
    toast.info(
      <div className="flex items-center gap-2">
        <Swords className="h-4 w-4 text-yellow-400" />
        <span><strong>{senderName}</strong> challenged you!</span>
        <Loader2 className="h-3 w-3 animate-spin ml-2" />
      </div>,
      { duration: 2000 }
    );

    try {
      // Update invite status
      await supabase
        .from('battle_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      let sessionId = invite.battle?.session_id;

      // Create session if it doesn't exist
      if (!sessionId) {
        console.log('No session_id found, creating one for battle...');
        const { data: newSession, error: sessionError } = await supabase
          .from('podcast_sessions')
          .insert({
            host_id: invite.from_user_id,
            title: `Battle Session`,
            status: 'live',
            started_at: new Date().toISOString()
          })
          .select()
          .single();

        if (sessionError || !newSession) {
          console.error('Failed to create session:', sessionError);
          toast.error('Failed to create battle session');
          setIsProcessing(false);
          return;
        }

        sessionId = newSession.id;
        console.log('Created new session:', sessionId);

        // Update battle with the new session_id
        await supabase
          .from('podcast_battles')
          .update({ session_id: sessionId })
          .eq('id', invite.battle_id);
      }

      // Update battle status to active and set start time
      await supabase
        .from('podcast_battles')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', invite.battle_id);

      // Add opponent (accepting user) as speaker in podcast_participants
      console.log('Adding opponent as speaker to session:', sessionId);
      await supabase
        .from('podcast_participants')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'speaker',
          is_muted: false
        });

      toast.success('Battle started!', { duration: 1500 });
      onAccept(invite.battle_id);
    } catch (error) {
      console.error('Error auto-accepting battle:', error);
      toast.error('Failed to accept battle');
    } finally {
      setIsProcessing(false);
    }
  }, [user, onAccept, isProcessing]);

  // Listen for incoming battle invites
  useEffect(() => {
    if (!user) return;

    // Check for existing pending invites
    const checkPendingInvites = async () => {
      const { data } = await supabase
        .from('battle_invites')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        await enrichAndAcceptInvite(data[0]);
      }
    };

    const enrichAndAcceptInvite = async (rawInvite: any) => {
      // Skip if already processed
      if (processedInvitesRef.current.has(rawInvite.id)) return;
      
      // Get sender's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username, avatar_url')
        .eq('user_id', rawInvite.from_user_id)
        .single();

      // Get battle details
      const { data: battle } = await supabase
        .from('podcast_battles')
        .select('duration_seconds, session_id')
        .eq('id', rawInvite.battle_id)
        .single();

      const enrichedInvite: BattleInvite = {
        ...rawInvite,
        from_user: profile || undefined,
        battle: battle || undefined
      };

      // Auto-accept immediately
      autoAcceptBattle(enrichedInvite);
    };

    checkPendingInvites();

    // Subscribe to new invites
    const channel = supabase
      .channel(`battle-invites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_invites',
          filter: `to_user_id=eq.${user.id}`
        },
        async (payload: any) => {
          console.log('📩 New battle invite received:', payload);
          await enrichAndAcceptInvite(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Battle invite subscription:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, autoAcceptBattle]);

  // No visible UI - auto-accepts in background
  return null;
};

export default BattleNotification;
