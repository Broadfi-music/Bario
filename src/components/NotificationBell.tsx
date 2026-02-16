import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '@/contexts/AuthContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter
        open={open}
        onOpenChange={setOpen}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAll}
        loading={loading}
      />
    </>
  );
};

export default NotificationBell;
