import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, Plus, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  reminder_enabled: boolean;
}

const ScheduleManager = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    date: '',
    time: ''
  });

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user]);

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('podcast_schedules')
      .select('*')
      .eq('user_id', user?.id)
      .order('scheduled_at', { ascending: true });
    
    if (data) setSchedules(data);
  };

  const createSchedule = async () => {
    if (!user || !newSchedule.title || !newSchedule.date || !newSchedule.time) {
      toast.error('Please fill all required fields');
      return;
    }

    const scheduledAt = new Date(`${newSchedule.date}T${newSchedule.time}`);

    const { error } = await supabase.from('podcast_schedules').insert({
      user_id: user.id,
      title: newSchedule.title,
      description: newSchedule.description || null,
      scheduled_at: scheduledAt.toISOString(),
      reminder_enabled: true
    });

    if (error) {
      toast.error('Failed to create schedule');
    } else {
      toast.success('Schedule created!');
      setIsOpen(false);
      setNewSchedule({ title: '', description: '', date: '', time: '' });
      fetchSchedules();
    }
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from('podcast_schedules').delete().eq('id', id);
    toast.success('Schedule deleted');
    fetchSchedules();
  };

  const toggleReminder = async (schedule: Schedule) => {
    await supabase
      .from('podcast_schedules')
      .update({ reminder_enabled: !schedule.reminder_enabled })
      .eq('id', schedule.id);
    fetchSchedules();
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-white/60 text-sm">Login to manage your podcast schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-400" />
          My Schedule
        </h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-500">
              <Plus className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black/95 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Schedule a Podcast</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-white/60">Title *</label>
                <Input
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Episode title"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-white/60">Description</label>
                <Input
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will you discuss?"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Date *</label>
                  <Input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/60">Time *</label>
                  <Input
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
              
              <Button onClick={createSchedule} className="w-full bg-purple-600 hover:bg-purple-500">
                Create Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8 bg-white/5 rounded-xl">
          <Calendar className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">No scheduled podcasts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{schedule.title}</p>
                <p className="text-xs text-white/60">
                  {format(new Date(schedule.scheduled_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleReminder(schedule)}
                className={schedule.reminder_enabled ? 'text-yellow-400' : 'text-white/40'}
              >
                <Bell className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteSchedule(schedule.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
