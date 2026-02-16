import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushSubscriptionManager = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.ready;
        if (!('pushManager' in registration)) return;

        const pushManager = (registration as any).pushManager;
        const subscription = await pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const subJson = subscription.toJSON();
        if (!subJson.endpoint || !subJson.keys) return;

        // Upsert - avoid duplicates
        const { data: existing } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subJson.endpoint)
          .limit(1);

        if (existing && existing.length > 0) return;

        await supabase.from('push_subscriptions').insert({
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth_key: subJson.keys.auth,
        });

        console.log('Push subscription registered for user:', user.id);
      } catch (err) {
        // Silently fail - push is optional
        console.log('Push subscription skipped:', err);
      }
    };

    // Small delay to not block initial render
    const timer = setTimeout(register, 2000);
    return () => clearTimeout(timer);
  }, [user]);

  return null;
};

export default PushSubscriptionManager;
