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

    // Check if this user is a host of any active session
    const checkAndSubscribe = async () => {
      // Get sessions where this user is the host
      const { data: sessions } = await supabase
        .from('podcast_sessions')
        .select('id')
        .eq('host_id', user.id)
        .eq('status', 'live');

      const hostSessionIds = sessions?.map(s => s.id) || [];

      // Also check demo sessions - if user has created any content as host
      // For now, subscribe to ALL pending join requests and filter client-side

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
            // Don't notify for own requests
            if (request.user_id === user.id) return;
            // Don't show duplicate notifications
            if (shownIds.has(request.id)) return;

            setShownIds(prev => new Set(prev).add(request.id));

            const userName = request.user_name || 'A listener';
            
            toast(
              `${userName} wants to join your space`,
              {
                icon: <UserPlus className="h-4 w-4 text-green-400" />,
                duration: 15000,
                action: {
                  label: 'Accept',
                  onClick: () => handleAccept(request.id),
                },
                style: {
                  background: '#1a1a1a',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: 'white',
                },
              }
            );
          }
        )
        .subscribe();

      // Also fetch any existing pending requests on mount
      const { data: pendingRequests } = await supabase
        .from('space_join_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingRequests && pendingRequests.length > 0) {
        pendingRequests.forEach((request: any) => {
          if (request.user_id === user.id) return;
          if (shownIds.has(request.id)) return;

          setShownIds(prev => new Set(prev).add(request.id));

          const userName = request.user_name || 'A listener';
          toast(
            `${userName} wants to join your space`,
            {
              icon: <UserPlus className="h-4 w-4 text-green-400" />,
              duration: 15000,
              action: {
                label: 'Accept',
                onClick: () => handleAccept(request.id),
              },
              style: {
                background: '#1a1a1a',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: 'white',
              },
            }
          );
        });
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

  const handleAccept = async (requestId: string) => {
    const { error } = await supabase
      .from('space_join_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to accept request');
    } else {
      toast.success('Listener accepted! They can now speak.');
    }
  };

  return null; // This component only renders toasts
};

export default GlobalJoinRequestNotification;
