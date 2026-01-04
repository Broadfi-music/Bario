import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Swords, Users, Clock, Search, UserPlus, Radio, Shuffle } from 'lucide-react';

interface OnlineCreator {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_live?: boolean;
  session_id?: string;
}

interface BattleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  onBattleStart?: (battleId: string) => void;
}

const BattleInviteModal = ({ isOpen, onClose, sessionId, onBattleStart }: BattleInviteModalProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [creators, setCreators] = useState<OnlineCreator[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<OnlineCreator | null>(null);
  const [duration, setDuration] = useState(5); // minutes
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'configure'>('select');

  // Fetch online/live creators and followed users
  useEffect(() => {
    if (!isOpen || !user) return;

    const fetchCreators = async () => {
      // First, get live sessions (creators who are currently live)
      const { data: liveSessions } = await supabase
        .from('podcast_sessions')
        .select('id, host_id')
        .eq('status', 'live')
        .neq('host_id', user.id);

      const liveHostIds = new Set(liveSessions?.map(s => s.host_id) || []);
      const sessionMap = new Map(liveSessions?.map(s => [s.host_id, s.id]) || []);

      // Get users the current user follows
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = follows?.map(f => f.following_id) || [];

      // Also get recently active users (profiles updated in last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .gte('updated_at', oneHourAgo)
        .neq('user_id', user.id)
        .limit(20);
      
      const recentUserIds = recentProfiles?.map(p => p.user_id) || [];

      // Combine and get profiles
      const allUserIds = [...new Set([...liveHostIds, ...followingIds, ...recentUserIds])];
      
      if (allUserIds.length === 0) {
        // Fallback: get any profiles
        const { data: anyProfiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, username, avatar_url')
          .neq('user_id', user.id)
          .limit(20);
        
        if (anyProfiles) {
          setCreators(anyProfiles.map(p => ({
            user_id: p.user_id,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
            is_live: false
          })));
        }
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .in('user_id', allUserIds);

      if (profiles) {
        const creatorList: OnlineCreator[] = profiles.map(p => ({
          user_id: p.user_id,
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
          is_live: liveHostIds.has(p.user_id),
          session_id: sessionMap.get(p.user_id)
        }));

        // Sort: live creators first
        creatorList.sort((a, b) => (b.is_live ? 1 : 0) - (a.is_live ? 1 : 0));
        setCreators(creatorList);
      }
    };

    fetchCreators();
  }, [isOpen, user]);

  const filteredCreators = searchQuery.trim()
    ? creators.filter(c => 
        c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.username?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : creators;

  const handleSelectCreator = (creator: OnlineCreator) => {
    setSelectedCreator(creator);
    setStep('configure');
  };

  // Auto-suggest random opponent
  const handleSuggestRandom = () => {
    if (creators.length === 0) return;
    const randomIndex = Math.floor(Math.random() * creators.length);
    handleSelectCreator(creators[randomIndex]);
  };

  const handleSendInvite = async () => {
    if (!user || !selectedCreator) return;

    setIsLoading(true);
    try {
      // IMPORTANT: Create a podcast_session for the battle audio channel
      const { data: session, error: sessionError } = await supabase
        .from('podcast_sessions')
        .insert({
          host_id: user.id,
          title: `Battle: ${user.email?.split('@')[0]} vs ${selectedCreator.full_name || selectedCreator.username}`,
          status: 'live',
          description: 'Live battle session'
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        throw sessionError;
      }

      console.log('Created battle session:', session.id);

      // Create the battle record WITH session_id
      const { data: battle, error: battleError } = await supabase
        .from('podcast_battles')
        .insert({
          session_id: session.id, // Link to audio session
          host_id: user.id,
          opponent_id: selectedCreator.user_id,
          status: 'pending',
          duration_seconds: duration * 60,
          rules: { gift_types: 'all' }
        })
        .select()
        .single();

      if (battleError) throw battleError;

      // Add host as speaker in participants
      await supabase
        .from('podcast_participants')
        .insert({
          session_id: session.id,
          user_id: user.id,
          role: 'speaker'
        });

      // Create the invite
      const { error: inviteError } = await supabase
        .from('battle_invites')
        .insert({
          battle_id: battle.id,
          from_user_id: user.id,
          to_user_id: selectedCreator.user_id,
          status: 'pending'
        });

      if (inviteError) throw inviteError;

      toast.success(`Battle invite sent to ${selectedCreator.full_name || selectedCreator.username}!`);
      onClose();
      
      if (onBattleStart) {
        onBattleStart(battle.id);
      }
    } catch (error) {
      console.error('Error creating battle:', error);
      toast.error('Failed to send battle invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedCreator(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Swords className="h-5 w-5 text-yellow-400" />
            {step === 'select' ? 'Start a Battle' : 'Battle Settings'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' ? (
          <div className="space-y-4">
            {/* Search and Suggest */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button
                onClick={handleSuggestRandom}
                disabled={creators.length === 0}
                className="bg-[#53fc18] hover:bg-[#45d914] text-black"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>

            {/* Creator List */}
            <div className="space-y-1 max-h-[250px] overflow-y-auto">
              {filteredCreators.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No creators found</p>
                  <p className="text-xs">Follow more creators to battle them!</p>
                </div>
              ) : (
                filteredCreators.map((creator) => (
                  <div
                    key={creator.user_id}
                    onClick={() => handleSelectCreator(creator)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-700">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                        )}
                      </div>
                      {creator.is_live && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#18181b]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {creator.full_name || creator.username || 'Creator'}
                      </p>
                      {creator.is_live && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <Radio className="h-2.5 w-2.5" />
                          Currently Live
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 px-3">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Creator */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-700">
                {selectedCreator?.avatar_url ? (
                  <img src={selectedCreator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedCreator?.full_name || selectedCreator?.username}</p>
                <p className="text-xs text-white/50">Opponent</p>
              </div>
              <Button size="sm" variant="ghost" onClick={handleBack} className="text-xs">
                Change
              </Button>
            </div>

            {/* Duration Slider */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-white/60" />
                Battle Duration
              </Label>
              <div className="px-2">
                <Slider
                  value={[duration]}
                  onValueChange={([value]) => setDuration(value)}
                  min={1}
                  max={15}
                  step={1}
                  className="w-full"
                />
              </div>
              <p className="text-center text-lg font-bold text-[#53fc18]">{duration} minutes</p>
            </div>

            {/* Battle Rules Preview */}
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-white/60 uppercase">Battle Rules</p>
              <ul className="text-sm space-y-1 text-white/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#53fc18]" />
                  All gift types count as points
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#53fc18]" />
                  Double-tap to boost (+5 points)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#53fc18]" />
                  Highest score wins when timer ends
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#53fc18]" />
                  Audio starts immediately on accept
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={isLoading}
                className="flex-1 bg-black hover:bg-black/80 text-white"
              >
                {isLoading ? 'Sending...' : 'Send Battle Invite'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BattleInviteModal;