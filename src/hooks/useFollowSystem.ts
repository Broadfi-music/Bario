import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FollowedHost {
  id: string;
  following_id: string;
  created_at: string;
}

export const useFollowSystem = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFollowing();
    } else {
      setFollowing([]);
      setLoading(false);
    }
  }, [user]);

  const fetchFollowing = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (data) {
      setFollowing(data.map(f => f.following_id));
    }
    setLoading(false);
  };

  const followHost = async (hostId: string) => {
    if (!user) {
      toast.error('Please login to follow');
      return false;
    }

    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: hostId
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Already following');
      } else {
        toast.error('Failed to follow');
      }
      return false;
    }

    setFollowing(prev => [...prev, hostId]);
    toast.success('Following!');
    return true;
  };

  const unfollowHost = async (hostId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', hostId);

    if (error) {
      toast.error('Failed to unfollow');
      return false;
    }

    setFollowing(prev => prev.filter(id => id !== hostId));
    toast.success('Unfollowed');
    return true;
  };

  const isFollowing = (hostId: string) => following.includes(hostId);

  const toggleFollow = async (hostId: string) => {
    if (isFollowing(hostId)) {
      return unfollowHost(hostId);
    } else {
      return followHost(hostId);
    }
  };

  return {
    following,
    loading,
    followHost,
    unfollowHost,
    isFollowing,
    toggleFollow
  };
};
