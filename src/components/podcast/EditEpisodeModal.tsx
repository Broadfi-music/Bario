import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Episode {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url?: string | null;
}

interface EditEpisodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: Episode | null; // null for create mode
  userId: string;
  onUpdate: () => void;
}

export const EditEpisodeModal = ({ open, onOpenChange, episode, userId, onUpdate }: EditEpisodeModalProps) => {
  const isCreateMode = !episode;
  const [title, setTitle] = useState(episode?.title || '');
  const [description, setDescription] = useState(episode?.description || '');
  const [coverUrl, setCoverUrl] = useState(episode?.cover_image_url || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes or episode changes
  useEffect(() => {
    if (open) {
      setTitle(episode?.title || '');
      setDescription(episode?.description || '');
      setCoverUrl(episode?.cover_image_url || '');
    }
  }, [open, episode]);

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `episode-${Date.now()}.${fileExt}`;
      const filePath = `episodes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      setCoverUrl(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setSaving(true);
    
    try {
      if (isCreateMode) {
        // Create new episode
        const { error } = await supabase
          .from('podcast_episodes')
          .insert({
            host_id: userId,
            title,
            description,
            cover_image_url: coverUrl || null
          });

        if (error) throw error;
        toast.success('Episode created successfully');
      } else {
        // Update existing episode
        const { error } = await supabase
          .from('podcast_episodes')
          .update({
            title,
            description,
            cover_image_url: coverUrl
          })
          .eq('id', episode.id);

        if (error) throw error;
        toast.success('Episode updated successfully');
      }
      
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving episode:', error);
      toast.error(isCreateMode ? 'Failed to create episode' : 'Failed to update episode');
    } finally {
      setSaving(false);
    }
  };

  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{isCreateMode ? 'Create Episode' : 'Edit Episode'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Cover Image */}
          <div>
            <Label className="text-white/70 text-sm">Cover Image</Label>
            <div 
              className="relative w-32 h-32 rounded-lg overflow-hidden bg-neutral-800 mt-1 cursor-pointer group"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <span className="text-sm">Uploading...</span>
                </div>
              )}
            </div>
            <input 
              ref={coverInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleCoverChange}
            />
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title" className="text-white/70 text-sm">Episode Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Episode title"
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
              placeholder="Episode description..."
              rows={3}
              className="bg-white/5 border-white/10 text-white mt-1 resize-none"
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
              {saving ? 'Saving...' : isCreateMode ? 'Create Episode' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
