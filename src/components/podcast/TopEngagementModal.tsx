import { useState, useEffect } from 'react';
import { X, Gift, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isValidUUID } from '@/lib/authUtils';

interface Engager {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  score: number;
  rank: number;
}

interface TopEngagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSendGift?: () => void;
}

const rankColors: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-orange-400',
};

const rankBadges: Record<number, string> = {
  1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  2: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
  3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const TopEngagementModal = ({ isOpen, onClose, sessionId, onSendGift }: TopEngagementModalProps) => {
  const [engagers, setEngagers] = useState<Engager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    fetchEngagement();

    // Real-time updates
    const giftChannel = supabase
      .channel(`engagement-gifts-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'podcast_gifts',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchEngagement())
      .subscribe();

    const commentChannel = supabase
      .channel(`engagement-comments-${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'podcast_comments',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchEngagement())
      .subscribe();

    return () => {
      supabase.removeChannel(giftChannel);
      supabase.removeChannel(commentChannel);
    };
  }, [isOpen, sessionId]);

  const fetchEngagement = async () => {
    setLoading(true);

    // Fetch gifts and comments in parallel
    const [giftsRes, commentsRes] = await Promise.all([
      supabase
        .from('podcast_gifts')
        .select('sender_id, points_value')
        .eq('session_id', sessionId),
      supabase
        .from('podcast_comments')
        .select('user_id')
        .eq('session_id', sessionId),
    ]);

    // Aggregate scores: gifts = points_value, comments = 1 each
    const scoreMap = new Map<string, number>();

    giftsRes.data?.forEach(g => {
      scoreMap.set(g.sender_id, (scoreMap.get(g.sender_id) || 0) + g.points_value);
    });

    commentsRes.data?.forEach(c => {
      scoreMap.set(c.user_id, (scoreMap.get(c.user_id) || 0) + 1);
    });

    if (scoreMap.size === 0) {
      setEngagers([]);
      setLoading(false);
      return;
    }

    // Sort by score descending
    const sorted = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1]);

    // Fetch profiles
    const userIds = sorted.map(([id]) => id).filter(isValidUUID);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url')
      .in('user_id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setEngagers(sorted.map(([userId, score], i) => {
      const profile = profileMap.get(userId);
      return {
        user_id: userId,
        user_name: profile?.full_name || profile?.username || 'Listener',
        user_avatar: profile?.avatar_url || undefined,
        score,
        rank: i + 1,
      };
    }));

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1a1a1d] rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-white font-bold text-base">Top Engagement</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : engagers.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-sm">
              No engagement yet. Be the first!
            </div>
          ) : (
            <div className="space-y-1">
              {engagers.map((e) => (
                <div
                  key={e.user_id}
                  className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/5"
                >
                  {/* Rank */}
                  <span className={`w-5 text-sm font-bold ${rankColors[e.rank] || 'text-white/40'}`}>
                    {e.rank <= 3 ? e.rank : e.rank}
                  </span>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                    {e.user_avatar ? (
                      <img src={e.user_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{e.user_name.charAt(0)}</span>
                      </div>
                    )}
                  </div>

                  {/* Name + Badge */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{e.user_name}</p>
                    {e.rank <= 3 && (
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${rankBadges[e.rank]}`}>
                        <Crown className="w-2.5 h-2.5" />
                        No. {e.rank}
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  <span className="text-white/60 text-sm font-medium">
                    {e.score >= 10 ? '10+' : e.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/50 text-xs truncate">Send a Gift to be a top viewer</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onSendGift?.();
            }}
            className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-full transition-colors"
          >
            Send Gift
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopEngagementModal;
