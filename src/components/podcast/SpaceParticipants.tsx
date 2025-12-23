import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Mic, MicOff, Hand, UserPlus, Volume2 } from 'lucide-react';
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
  title?: string;
  hostName?: string;
  hostAvatar?: string | null;
  onLeave?: () => void;
}

const getAvatarColor = (id: string) => {
  const colors = [
    'from-orange-500 to-red-500',
    'from-blue-500 to-purple-500',
    'from-green-500 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-yellow-500 to-orange-500',
    'from-indigo-500 to-blue-500',
  ];
  const index = id.charCodeAt(0) % colors.length;
  return colors[index];
};

const getDisplayName = (userId: string) => {
  const names = ['TNTR', 'Raymond', 'Teresa', 'Susana', 'Steven', 'Benny', 'Sheldon', 'Billy', 'Dan', 'CW', 'Ron', 'JD', 'Okie', 'STARR', 'John', 'Lonnie'];
  const index = userId.charCodeAt(0) % names.length;
  return names[index];
};

const SpaceParticipants = ({ sessionId, hostId, isHost, title, hostName, hostAvatar, onLeave }: SpaceParticipantsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    fetchParticipants();

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
        () => fetchParticipants()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user]);

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
        if (myP) setIsMuted(myP.is_muted);
      }
    }
  };

  const joinSession = async () => {
    if (!user) {
      toast.error('Please sign in to join');
      navigate('/auth');
      return;
    }

    // Check if already joined
    if (myParticipation) {
      toast.info('You are already in this space');
      return;
    }

    const { error } = await supabase.from('podcast_participants').insert({
      session_id: sessionId,
      user_id: user.id,
      role: 'listener',
      is_muted: true
    });

    if (error) {
      if (error.code === '23505') {
        toast.info('You are already in this space');
      } else {
        toast.error('Failed to join session');
      }
    } else {
      toast.success('Joined the space!');
    }
  };

  const toggleHandRaise = async () => {
    if (!user) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }

    if (!myParticipation) {
      // Auto-join first then raise hand
      await joinSession();
      return;
    }

    const { error } = await supabase
      .from('podcast_participants')
      .update({ hand_raised: !myParticipation.hand_raised })
      .eq('id', myParticipation.id);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(myParticipation.hand_raised ? 'Hand lowered' : 'Hand raised!');
    }
  };

  const toggleMute = async () => {
    if (!myParticipation) return;
    
    // Only speakers and above can unmute
    if (myParticipation.role === 'listener' && isMuted) {
      toast.error('Request to speak first');
      return;
    }

    const { error } = await supabase
      .from('podcast_participants')
      .update({ is_muted: !isMuted })
      .eq('id', myParticipation.id);

    if (!error) {
      setIsMuted(!isMuted);
      toast(isMuted ? 'Microphone ON' : 'Microphone OFF');
    }
  };

  const goToHostProfile = () => {
    navigate(`/podcast-host/${hostId}`);
  };

  // Create demo participants if none exist
  const demoParticipants: Participant[] = participants.length === 0 ? [
    { id: 'demo-1', user_id: hostId, role: 'host', is_muted: false, hand_raised: false, joined_at: '' },
    { id: 'demo-2', user_id: 'cohost-1', role: 'co_host', is_muted: true, hand_raised: false, joined_at: '' },
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `demo-${i + 3}`,
      user_id: `user-${i}`,
      role: 'listener' as const,
      is_muted: true,
      hand_raised: false,
      joined_at: ''
    }))
  ] : participants;

  const displayParticipants = demoParticipants;
  const listenerCount = displayParticipants.filter(p => p.role === 'listener').length;

  return (
    <div className="flex flex-col h-full bg-black px-3 py-2">
      {/* Title */}
      <div className="mb-2">
        <h1 className="text-base font-bold text-white line-clamp-2">
          {title || 'Live Podcast Session'}
        </h1>
        <p className="text-xs text-white/40">{listenerCount} listeners</p>
      </div>

      {/* Participants Grid - Compact Twitter Space Style */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 gap-2">
          {displayParticipants.map((p) => {
            const isHostRole = p.role === 'host';
            const isCoHost = p.role === 'co_host';
            const isSpeaker = p.role === 'speaker';
            const name = isHostRole && hostName ? hostName : getDisplayName(p.user_id);
            const avatarColor = getAvatarColor(p.user_id);
            const avatarUrl = isHostRole && hostAvatar ? hostAvatar : null;
            
            return (
              <div 
                key={p.id} 
                className="flex flex-col items-center gap-0.5 cursor-pointer"
                onClick={isHostRole ? goToHostProfile : undefined}
              >
                <div className="relative">
                  {/* Avatar */}
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center overflow-hidden ${isHostRole ? 'ring-2 ring-purple-500 ring-offset-1 ring-offset-black' : ''}`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  {/* Speaking indicator */}
                  {!p.is_muted && (isHostRole || isCoHost || isSpeaker) && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
                      <Volume2 className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {/* Hand raised indicator */}
                  {p.hand_raised && (
                    <div className="absolute -top-1 -right-1 animate-bounce">
                      <span className="text-sm">✋</span>
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <span className="text-[9px] text-white/80 font-medium text-center truncate w-full">
                  {name}
                </span>
                
                {/* Role Label */}
                {(isHostRole || isCoHost) && (
                  <span className={`text-[8px] ${isHostRole ? 'text-purple-400' : 'text-white/50'}`}>
                    {isHostRole ? '🎙️ Host' : 'Co-host'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls - All in one compact row */}
      <div className="flex items-center justify-between py-2 gap-2 border-t border-white/5 mt-2">
        {/* Audio control */}
        {myParticipation && myParticipation.role !== 'listener' && (
          <Button
            onClick={toggleMute}
            size="icon"
            variant="ghost"
            className={`h-9 w-9 rounded-full border ${isMuted ? 'border-red-500/50 text-red-400' : 'border-green-500/50 text-green-400'}`}
          >
            {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}

        {/* Request button */}
        <button 
          onClick={toggleHandRaise}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
            myParticipation?.hand_raised 
              ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400' 
              : 'border-white/20 text-white/60 hover:text-white hover:border-white/40'
          }`}
        >
          <Hand className="h-3.5 w-3.5" />
          <span className="text-xs">{myParticipation?.hand_raised ? 'Requested' : 'Request'}</span>
        </button>

        {/* Join Space button */}
        {!myParticipation && (
          <Button
            onClick={joinSession}
            size="sm"
            className="bg-purple-600 hover:bg-purple-500 rounded-full px-4 h-8 text-xs"
          >
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Join Space
          </Button>
        )}
      </div>
    </div>
  );
};

export default SpaceParticipants;
