import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Hand, Crown, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Participant {
  id: string;
  user_id: string;
  role: 'host' | 'co_host' | 'speaker' | 'listener';
  is_muted: boolean;
  hand_raised: boolean;
  joined_at: string;
}

interface SpaceParticipantsProps {
  sessionId: string;
  hostId: string;
  isHost: boolean;
}

const SpaceParticipants = ({ sessionId, hostId, isHost }: SpaceParticipantsProps) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('podcast_participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('joined_at', { ascending: true });
      
      if (data) {
        setParticipants(data as Participant[]);
        if (user) {
          const myP = data.find(p => p.user_id === user.id);
          setMyParticipation(myP as Participant || null);
        }
      }
    };

    fetchParticipants();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'podcast_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user]);

  const joinSession = async () => {
    if (!user) {
      toast.error('Please login to join');
      return;
    }

    const { error } = await supabase.from('podcast_participants').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'listener',
      is_muted: true
    });

    if (error) {
      toast.error('Failed to join session');
    } else {
      toast.success('Joined the space!');
    }
  };

  const leaveSession = async () => {
    if (!user || !myParticipation) return;

    await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', myParticipation.id);
    
    toast.success('Left the space');
  };

  const toggleHandRaise = async () => {
    if (!myParticipation) return;

    await supabase
      .from('podcast_participants')
      .update({ hand_raised: !myParticipation.hand_raised })
      .eq('id', myParticipation.id);
  };

  const promoteToSpeaker = async (participantId: string) => {
    if (!isHost) return;

    await supabase
      .from('podcast_participants')
      .update({ role: 'speaker', hand_raised: false, is_muted: false })
      .eq('id', participantId);
    
    toast.success('Promoted to speaker');
  };

  const hosts = participants.filter(p => p.role === 'host' || p.role === 'co_host');
  const speakers = participants.filter(p => p.role === 'speaker');
  const listeners = participants.filter(p => p.role === 'listener');
  const raisedHands = listeners.filter(p => p.hand_raised);

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 space-y-4">
      {/* Host Section */}
      <div className="space-y-2">
        <h4 className="text-[10px] uppercase tracking-wider text-white/40">Hosts</h4>
        <div className="flex flex-wrap gap-3">
          {hosts.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-yellow-400" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                  p.is_muted ? 'bg-red-500' : 'bg-green-500'
                }`}>
                  {p.is_muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </div>
              </div>
              <span className="text-[10px] text-white/60">Host</span>
            </div>
          ))}
        </div>
      </div>

      {/* Speakers Section */}
      {speakers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-white/40">Speakers</h4>
          <div className="flex flex-wrap gap-3">
            {speakers.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                    <span className="text-sm font-bold">{p.user_id.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                    p.is_muted ? 'bg-red-500' : 'bg-green-500'
                  }`}>
                    {p.is_muted ? <MicOff className="h-2 w-2" /> : <Mic className="h-2 w-2" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raised Hands - Host Only */}
      {isHost && raisedHands.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] uppercase tracking-wider text-yellow-400 flex items-center gap-1">
            <Hand className="h-3 w-3" /> Raised Hands
          </h4>
          <div className="flex flex-wrap gap-2">
            {raisedHands.map((p) => (
              <button
                key={p.id}
                onClick={() => promoteToSpeaker(p.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 rounded-full hover:bg-yellow-500/30 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-yellow-500/50" />
                <span className="text-xs text-yellow-400">Accept</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Listeners Count */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{listeners.length} listening</span>
        
        {!myParticipation ? (
          <Button
            onClick={joinSession}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 text-xs"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Join Space
          </Button>
        ) : myParticipation.role === 'listener' ? (
          <div className="flex gap-2">
            <Button
              onClick={toggleHandRaise}
              size="sm"
              variant={myParticipation.hand_raised ? 'default' : 'outline'}
              className={myParticipation.hand_raised ? 'bg-yellow-500 hover:bg-yellow-400' : ''}
            >
              <Hand className="h-3 w-3 mr-1" />
              {myParticipation.hand_raised ? 'Lower' : 'Raise'}
            </Button>
            <Button
              onClick={leaveSession}
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300"
            >
              Leave
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SpaceParticipants;
