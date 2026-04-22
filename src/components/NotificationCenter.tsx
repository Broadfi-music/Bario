import { useNavigate } from 'react-router-dom';
import { Bell, Gift, UserPlus, Radio, Swords, Trophy, Music, CheckCheck, Trash2, Mic, MessageCircle, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification } from '@/hooks/useNotifications';

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  loading: boolean;
}

const typeIcons: Record<string, React.ReactNode> = {
  new_follower: <UserPlus className="w-4 h-4 text-blue-400" />,
  gift_received: <Gift className="w-4 h-4 text-pink-400" />,
  live_session: <Radio className="w-4 h-4 text-red-400" />,
  follow_live: <Radio className="w-4 h-4 text-red-400" />,
  direct_message: <MessageCircle className="w-4 h-4 text-foreground" />,
  battle_invite: <Swords className="w-4 h-4 text-purple-400" />,
  join_accepted: <Mic className="w-4 h-4 text-green-400" />,
  chart_topper: <Trophy className="w-4 h-4 text-yellow-400" />,
  mystery_drop_highlight: <Music className="w-4 h-4 text-purple-400" />,
  weekly_recap: <Trophy className="w-4 h-4 text-orange-400" />,
  achievement: <Trophy className="w-4 h-4 text-yellow-400" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const NotificationCenter = ({
  open,
  onOpenChange,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  loading,
}: NotificationCenterProps) => {
  const navigate = useNavigate();

  const handleClick = (notif: Notification) => {
    onMarkAsRead(notif.id);
    if (notif.action_url) {
      navigate(notif.action_url);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-[#0e0e10] border-white/10 w-[340px] sm:w-[380px] p-0 [&>button]:hidden"
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="text-white text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </SheetTitle>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close notifications"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              className="flex-1 text-white/70 hover:text-white hover:bg-white/10 text-[11px] h-7 px-2 justify-center"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="flex-1 text-white/70 hover:text-white hover:bg-white/10 text-[11px] h-7 px-2 justify-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear all
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/40">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You'll see updates here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                    !notif.is_read ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  {/* Icon or avatar */}
                  <div className="mt-0.5 shrink-0">
                    {notif.icon_url ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10">
                        <img src={notif.icon_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                        {typeIcons[notif.type] || <Bell className="w-4 h-4 text-white/40" />}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{notif.title}</p>
                    <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5">{notif.message}</p>
                    <span className="text-[10px] text-white/30 mt-1 block">{timeAgo(notif.created_at)}</span>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div className="mt-2 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationCenter;
