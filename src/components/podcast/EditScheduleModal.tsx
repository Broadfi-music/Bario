import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
}

interface EditScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule;
  userId: string;
  onUpdate: () => void;
}

export const EditScheduleModal = ({ open, onOpenChange, schedule, userId, onUpdate }: EditScheduleModalProps) => {
  const [title, setTitle] = useState(schedule.title);
  const [description, setDescription] = useState(schedule.description || '');
  const [scheduledAt, setScheduledAt] = useState(
    new Date(schedule.scheduled_at).toISOString().slice(0, 16)
  );
  const [coHost, setCoHost] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('podcast_schedules')
        .update({
          title,
          description: coHost ? `${description}\n\nCo-host: ${coHost}` : description,
          scheduled_at: new Date(scheduledAt).toISOString()
        })
        .eq('id', schedule.id);

      if (error) throw error;

      toast.success('Schedule updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast.error('Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Schedule</DialogTitle>
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

          {/* Co-host */}
          <div>
            <Label htmlFor="cohost" className="text-white/70 text-sm">Co-host (optional)</Label>
            <Input
              id="cohost"
              value={coHost}
              onChange={(e) => setCoHost(e.target.value)}
              placeholder="@username"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
