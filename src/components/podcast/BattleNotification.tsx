import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Swords, Clock, X } from 'lucide-react';

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
  const [invite, setInvite] = useState<BattleInvite | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
        await enrichInvite(data[0]);
      }
    };

    const enrichInvite = async (rawInvite: any) => {
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

      setInvite({
        ...rawInvite,
        from_user: profile || undefined,
        battle: battle || undefined
      });
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
          await enrichInvite(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAccept = async () => {
    if (!invite || !user) return;
    setIsLoading(true);

    try {
      // Update invite status
      await supabase
        .from('battle_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      // Update battle status to active and set start time
      await supabase
        .from('podcast_battles')
        .update({ 
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', invite.battle_id);

      // CRITICAL: Add opponent (accepting user) as speaker in podcast_participants
      // This ensures they get PUBLISHER token for audio
      if (invite.battle?.session_id) {
        console.log('Adding opponent as speaker to session:', invite.battle.session_id);
        
        await supabase
          .from('podcast_participants')
          .insert({
            session_id: invite.battle.session_id,
            user_id: user.id,
            role: 'speaker'
          });
      }

      toast.success('Battle accepted! Get ready!');
      onAccept(invite.battle_id);
      setInvite(null);
    } catch (error) {
      console.error('Error accepting battle:', error);
      toast.error('Failed to accept battle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!invite) return;
    setIsLoading(true);

    try {
      // Update invite status
      await supabase
        .from('battle_invites')
        .update({ status: 'declined' })
        .eq('id', invite.id);

      // Update battle status
      await supabase
        .from('podcast_battles')
        .update({ status: 'ended' })
        .eq('id', invite.battle_id);

      toast.info('Battle declined');
      setInvite(null);
    } catch (error) {
      console.error('Error declining battle:', error);
      toast.error('Failed to decline battle');
    } finally {
      setIsLoading(false);
    }
  };

  if (!invite) return null;

  const durationMinutes = Math.floor((invite.battle?.duration_seconds || 300) / 60);

  return (
    <Dialog open={!!invite} onOpenChange={() => setInvite(null)}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5 text-yellow-400 animate-pulse" />
            Battle Challenge!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Challenger Info */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
            <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-pink-500">
              {invite.from_user?.avatar_url ? (
                <img src={invite.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">
                {invite.from_user?.full_name || invite.from_user?.username || 'Creator'}
              </p>
              <p className="text-sm text-white/60">wants to battle you!</p>
            </div>
          </div>

          {/* Battle Details */}
          <div className="flex items-center justify-center gap-2 text-white/60">
            <Clock className="h-4 w-4" />
            <span className="text-sm">{durationMinutes} minute battle</span>
          </div>

          {/* Info about audio */}
          <p className="text-xs text-center text-white/40">
            Audio will start immediately when you accept
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
            >
              <Swords className="h-4 w-4 mr-1" />
              {isLoading ? 'Joining...' : 'Accept Battle'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BattleNotification;