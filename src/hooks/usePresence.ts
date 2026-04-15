import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  user_id: string;
  online_at: string;
}

const CHANNEL_NAME = 'bario-presence';

let sharedChannel: RealtimeChannel | null = null;
let subscriberCount = 0;
let onlineUsersGlobal = new Set<string>();
let listeners: Set<() => void> = new Set();

const notifyListeners = () => listeners.forEach(fn => fn());

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(onlineUsersGlobal);
  const trackedRef = useRef(false);

  useEffect(() => {
    const listener = () => setOnlineUserIds(new Set(onlineUsersGlobal));
    listeners.add(listener);
    subscriberCount++;

    if (!sharedChannel) {
      sharedChannel = supabase.channel(CHANNEL_NAME, {
        config: { presence: { key: user?.id || 'anon' } },
      });

      sharedChannel
        .on('presence', { event: 'sync' }, () => {
          const state = sharedChannel!.presenceState<PresenceState>();
          const ids = new Set<string>();
          Object.values(state).forEach((arr) => {
            (arr as PresenceState[]).forEach((p) => ids.add(p.user_id));
          });
          onlineUsersGlobal = ids;
          notifyListeners();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && user && !trackedRef.current) {
            trackedRef.current = true;
            await sharedChannel!.track({ user_id: user.id, online_at: new Date().toISOString() });
          }
        });
    } else if (user && !trackedRef.current) {
      trackedRef.current = true;
      sharedChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
    }

    return () => {
      listeners.delete(listener);
      subscriberCount--;
      if (subscriberCount <= 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        subscriberCount = 0;
        onlineUsersGlobal = new Set();
        trackedRef.current = false;
      }
    };
  }, [user?.id]);

  const isOnline = useCallback((userId: string) => onlineUserIds.has(userId), [onlineUserIds]);

  return { onlineUserIds, isOnline, onlineCount: onlineUserIds.size };
};
