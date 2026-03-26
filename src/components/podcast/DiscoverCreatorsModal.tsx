import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Creator {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DiscoverCreatorsModal = ({ isOpen, onClose }: Props) => {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchCreators();
      if (user) fetchFollowed();
    }
  }, [isOpen, user]);

  const fetchCreators = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, username, avatar_url, bio')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setCreators(data);
  };

  const fetchFollowed = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);
    if (data) setFollowedIds(new Set(data.map(f => f.following_id)));
  };

  const toggleFollow = async (creatorId: string) => {
    if (!user) return;
    setLoadingFollow(creatorId);
    if (followedIds.has(creatorId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', creatorId);
      setFollowedIds(prev => { const n = new Set(prev); n.delete(creatorId); return n; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: creatorId });
      setFollowedIds(prev => new Set(prev).add(creatorId));
    }
    setLoadingFollow(null);
  };

  const filtered = searchQuery.trim()
    ? creators.filter(c =>
        (c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : creators;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#111] w-full max-w-md max-h-[80vh] rounded-t-2xl md:rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-2 md:hidden">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/5">
          <h2 className="text-xs font-bold text-white">Discover Creators</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Enter creator name"
              className="bg-white/5 border-white/10 text-white text-[11px] h-8 pl-7 placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {['All', 'Music', 'Podcast', 'Talk'].map((cat, i) => (
            <button
              key={cat}
              className={`flex-shrink-0 text-[9px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                i === 0 ? 'bg-white text-black border-white' : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Creator list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5">
          {filtered.filter(c => c.user_id !== user?.id).map(creator => (
            <div key={creator.user_id} className="flex items-center gap-2.5 py-2 hover:bg-white/5 rounded px-1.5 transition-colors">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">
                  {creator.full_name || creator.username || 'Creator'}
                </p>
                {creator.bio && (
                  <p className="text-[9px] text-white/40 truncate">{creator.bio}</p>
                )}
              </div>
              {user ? (
                <Button
                  size="sm"
                  onClick={() => toggleFollow(creator.user_id)}
                  disabled={loadingFollow === creator.user_id}
                  className={`text-[9px] h-6 px-3 rounded-md font-semibold ${
                    followedIds.has(creator.user_id)
                      ? 'bg-white/10 text-white/60 hover:bg-white/20'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {followedIds.has(creator.user_id) ? (
                    <><Check className="h-2.5 w-2.5 mr-0.5" /> Following</>
                  ) : (
                    <><UserPlus className="h-2.5 w-2.5 mr-0.5" /> Follow</>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => window.location.href = '/auth'}
                  className="bg-white text-black hover:bg-white/90 text-[9px] h-6 px-3 rounded-md font-semibold"
                >
                  Follow
                </Button>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/30 text-[10px]">No creators found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoverCreatorsModal;
