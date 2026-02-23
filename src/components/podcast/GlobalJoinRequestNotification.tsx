import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

interface JoinRequest {
  id: string;
  session_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  status: string;
  created_at: string;
}

const GlobalJoinRequestNotification = () => {
  const { user } = useAuth();
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Only show requests for sessions where this user is the host
    const checkAndSubscribe = async () => {
      // Get sessions where this user is the host
      const { data: sessions } = await supabase
        .from('podcast_sessions')
        .select('id')
        .eq('host_id', user.id)
        .eq('status', 'live');

      const hostSessionIds = sessions?.map(s => s.id) || [];
      
      if (hostSessionIds.length === 0) {
        // User is not hosting any live session, no need to listen
        return () => {};
      }

      const showRequest = (request: JoinRequest) => {
        if (request.user_id === user.id) return;
        if (shownIds.has(request.id)) return;
        // Only show if the request is for one of the user's hosted sessions
        if (!hostSessionIds.includes(request.session_id)) return;

        setShownIds(prev => new Set(prev).add(request.id));

        const userName = request.user_name || 'A listener';
        
        toast(
          `${userName} wants to join your space`,
          {
            icon: <UserPlus className="h-4 w-4 text-green-400" />,
            duration: 30000,
            action: {
              label: 'Accept',
              onClick: () => handleAccept(request.id, request.session_id, request.user_id),
            },
            style: {
              background: '#1a1a1a',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: 'white',
            },
          }
        );
      };

      // Subscribe to new join requests in real-time
      const channel = supabase
        .channel('global-join-requests')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'space_join_requests',
            filter: 'status=eq.pending',
          },
          (payload) => {
            const request = payload.new as JoinRequest;
            showRequest(request);
          }
        )
        .subscribe();

      // Also fetch any existing pending requests on mount
      for (const sid of hostSessionIds) {
        const { data: pendingRequests } = await supabase
          .from('space_join_requests')
          .select('*')
          .eq('session_id', sid)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);

        pendingRequests?.forEach((request: any) => showRequest(request));
      }

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = checkAndSubscribe();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [user]);

  const handleAccept = async (requestId: string, sessionId: string, requestUserId: string) => {
    // 1. Update request status
    const { error } = await supabase
      .from('space_join_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to accept request');
      return;
    }

    // 2. Promote user to speaker in podcast_participants
    // First check if they're already a participant
    const { data: existing } = await supabase
      .from('podcast_participants')
      .select('id, role')
      .eq('session_id', sessionId)
      .eq('user_id', requestUserId)
      .maybeSingle();

    if (existing) {
      // Update their role to speaker
      await supabase
        .from('podcast_participants')
        .update({ role: 'speaker', is_muted: false })
        .eq('id', existing.id);
    } else {
      // Insert them as a speaker
      await supabase.from('podcast_participants').insert({
        session_id: sessionId,
        user_id: requestUserId,
        role: 'speaker',
        is_muted: false,
      });
    }

    toast.success('Speaker accepted! Their mic is now live.');
  };

  return null; // This component only renders toasts
};

export default GlobalJoinRequestNotification;
