import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Mic, MicOff, UserMinus } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  role: string;
  is_muted: boolean;
  hand_raised: boolean;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isHost: boolean;
}

const AddParticipantModal = ({ isOpen, onClose, sessionId, isHost }: AddParticipantModalProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchParticipants();
    }
  }, [isOpen, sessionId]);

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('podcast_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });
    
    if (data) {
      setParticipants(data as Participant[]);
    }
  };

  const promoteToSpeaker = async (participantId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('podcast_participants')
      .update({ role: 'speaker', is_muted: false, hand_raised: false })
      .eq('id', participantId);
    
    if (error) {
      toast.error('Failed to promote participant');
    } else {
      toast.success('Participant promoted to speaker');
      fetchParticipants();
    }
    setLoading(false);
  };

  const promoteToCoHost = async (participantId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('podcast_participants')
      .update({ role: 'co_host', is_muted: false })
      .eq('id', participantId);
    
    if (error) {
      toast.error('Failed to promote participant');
    } else {
      toast.success('Participant promoted to co-host');
      fetchParticipants();
    }
    setLoading(false);
  };

  const demoteToListener = async (participantId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('podcast_participants')
      .update({ role: 'listener', is_muted: true })
      .eq('id', participantId);
    
    if (error) {
      toast.error('Failed to demote participant');
    } else {
      toast.success('Participant demoted to listener');
      fetchParticipants();
    }
    setLoading(false);
  };

  const toggleMute = async (participantId: string, currentMuted: boolean) => {
    const { error } = await supabase
      .from('podcast_participants')
      .update({ is_muted: !currentMuted })
      .eq('id', participantId);
    
    if (error) {
      toast.error('Failed to update mute status');
    } else {
      fetchParticipants();
    }
  };

  const removeParticipant = async (participantId: string) => {
    const { error } = await supabase
      .from('podcast_participants')
      .delete()
      .eq('id', participantId);
    
    if (error) {
      toast.error('Failed to remove participant');
    } else {
      toast.success('Participant removed');
      fetchParticipants();
    }
  };

  const speakers = participants.filter(p => p.role === 'speaker' || p.role === 'co_host');
  const listeners = participants.filter(p => p.role === 'listener');
  const raisedHands = listeners.filter(p => p.hand_raised);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Manage Participants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Raised Hands */}
          {raisedHands.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                <span className="animate-bounce">✋</span>
                Wants to Speak ({raisedHands.length})
              </h4>
              <div className="space-y-2">
                {raisedHands.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                        <span className="text-xs font-bold">U</span>
                      </div>
                      <span className="text-sm text-white">User {p.user_id.slice(0, 6)}</span>
                    </div>
                    <Button
                      onClick={() => promoteToSpeaker(p.id)}
                      size="sm"
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-500 text-xs"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Allow
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Speakers */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-400">Speakers ({speakers.length})</h4>
            <div className="space-y-2">
              {speakers.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                      <span className="text-xs font-bold">U</span>
                    </div>
                    <div>
                      <span className="text-sm text-white">User {p.user_id.slice(0, 6)}</span>
                      <span className="text-xs text-white/40 ml-2 capitalize">{p.role.replace('_', '-')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => toggleMute(p.id, p.is_muted)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      {p.is_muted ? <MicOff className="h-4 w-4 text-red-400" /> : <Mic className="h-4 w-4 text-green-400" />}
                    </Button>
                    {isHost && p.role !== 'host' && (
                      <Button
                        onClick={() => demoteToListener(p.id)}
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Listeners */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white/60">Listeners ({listeners.length})</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {listeners.filter(p => !p.hand_raised).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-[10px] font-bold">U</span>
                    </div>
                    <span className="text-xs text-white/80">User {p.user_id.slice(0, 6)}</span>
                  </div>
                  {isHost && (
                    <Button
                      onClick={() => promoteToSpeaker(p.id)}
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2"
                    >
                      Invite to speak
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddParticipantModal;
