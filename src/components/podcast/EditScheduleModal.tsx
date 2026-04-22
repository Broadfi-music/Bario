import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, AtSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CreatorSuggestion = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
}

interface EditScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null; // null for create mode
  userId: string;
  onUpdate: () => void;
}

export const EditScheduleModal = ({ open, onOpenChange, schedule, userId, onUpdate }: EditScheduleModalProps) => {
  const isCreateMode = !schedule;
  const [title, setTitle] = useState(schedule?.title || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [scheduledAt, setScheduledAt] = useState(
    schedule ? new Date(schedule.scheduled_at).toISOString().slice(0, 16) : ''
  );
  const [coHost, setCoHost] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<CreatorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const cohostDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset form when modal opens/closes or schedule changes
  useEffect(() => {
    if (open) {
      setTitle(schedule?.title || '');
      setDescription(schedule?.description || '');
      setScheduledAt(
        schedule 
          ? new Date(schedule.scheduled_at).toISOString().slice(0, 16) 
          : new Date(Date.now() + 86400000).toISOString().slice(0, 16) // Default to tomorrow
      );
      setCoHost('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [open, schedule]);

  // Live creator suggestions when user types name or @handle
  useEffect(() => {
    if (cohostDebounceRef.current) clearTimeout(cohostDebounceRef.current);
    const raw = coHost.trim().replace(/^@/, '');
    if (!raw) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    cohostDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, username, avatar_url')
        .or(`username.ilike.%${raw}%,full_name.ilike.%${raw}%`)
        .neq('user_id', userId)
        .limit(6);
      if (data) {
        setSuggestions(data as CreatorSuggestion[]);
        setShowSuggestions(true);
      }
    }, 200);
    return () => {
      if (cohostDebounceRef.current) clearTimeout(cohostDebounceRef.current);
    };
  }, [coHost, userId]);

  const pickSuggestion = (s: CreatorSuggestion) => {
    const handle = s.username || s.full_name || '';
    setCoHost(`@${handle}`);
    setShowSuggestions(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }

    setSaving(true);
    
    try {
      const descriptionWithCohost = coHost ? `${description}\n\nCo-host: ${coHost}` : description;
      
      if (isCreateMode) {
        // Create new schedule
        const { error } = await supabase
          .from('podcast_schedules')
          .insert({
            user_id: userId,
            title,
            description: descriptionWithCohost,
            scheduled_at: new Date(scheduledAt).toISOString()
          });

        if (error) throw error;
        toast.success('Schedule created successfully');
      } else {
        // Update existing schedule
        const { error } = await supabase
          .from('podcast_schedules')
          .update({
            title,
            description: descriptionWithCohost,
            scheduled_at: new Date(scheduledAt).toISOString()
          })
          .eq('id', schedule.id);

        if (error) throw error;
        toast.success('Schedule updated successfully');
      }

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(isCreateMode ? 'Failed to create schedule' : 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const isCreateModeLabel = !schedule;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{isCreateModeLabel ? 'Create Schedule' : 'Edit Schedule'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-white/70 text-sm">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Schedule title"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white/70 text-sm">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will you be talking about?"
              rows={3}
              className="bg-white/5 border-white/10 text-white mt-1 resize-none"
            />
          </div>

          {/* Co-host with @mention autocomplete */}
          <div className="relative">
            <Label htmlFor="cohost" className="text-white/70 text-sm">Co-host (optional)</Label>
            <div className="relative mt-1">
              <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <Input
                id="cohost"
                value={coHost}
                onChange={(e) => setCoHost(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Type @ or a name to find a creator"
                className="bg-white/5 border-white/10 text-white pl-8"
                autoComplete="off"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#0e0e10] border border-white/10 rounded-md shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.user_id}
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{s.full_name || s.username || 'Creator'}</p>
                      {s.username && (
                        <p className="text-[10px] text-white/40 truncate">@{s.username}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div>
            <Label htmlFor="datetime" className="text-white/70 text-sm">Date & Time</Label>
            <Input
              id="datetime"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90"
            >
              {saving ? 'Saving...' : isCreateModeLabel ? 'Create Schedule' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
