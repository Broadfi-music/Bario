import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  coverImageUrl?: string;
  onUpdate: () => void;
}

export const EditProfileModal = ({ open, onOpenChange, profile, coverImageUrl, onUpdate }: EditProfileModalProps) => {
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [username, setUsername] = useState(profile.username || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || '');
  const [coverUrl, setCoverUrl] = useState(coverImageUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, type: 'avatar' | 'cover'): Promise<string | null> => {
    const isAvatar = type === 'avatar';
    isAvatar ? setUploadingAvatar(true) : setUploadingCover(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      isAvatar ? setUploadingAvatar(false) : setUploadingCover(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, 'avatar');
    if (url) setAvatarUrl(url);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, 'cover');
    if (url) setCoverUrl(url);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          avatar_url: avatarUrl
        })
        .eq('user_id', profile.user_id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#18181b] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Cover Image */}
          <div className="relative">
            <Label className="text-white/70 text-sm">Cover Image</Label>
            <div 
              className="relative h-24 rounded-lg overflow-hidden bg-neutral-800 mt-1 cursor-pointer group"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-purple-900/50 to-pink-900/50" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-6 w-6" />
              </div>
              {uploadingCover && (
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

          {/* Profile Picture */}
          <div>
            <Label className="text-white/70 text-sm">Profile Picture</Label>
            <div className="flex items-center gap-4 mt-1">
              <div 
                className="relative w-16 h-16 rounded-full overflow-hidden bg-neutral-800 cursor-pointer group"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-500 to-teal-500" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <span className="text-[10px]">...</span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => avatarInputRef.current?.click()}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Change Photo
              </Button>
            </div>
            <input 
              ref={avatarInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="fullName" className="text-white/70 text-sm">Display Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your display name"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>

          {/* Username/Tag */}
          <div>
            <Label htmlFor="username" className="text-white/70 text-sm">Tag (Username)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
                placeholder="username"
                className="bg-white/5 border-white/10 text-white pl-8"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-white/70 text-sm">Description</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell viewers about yourself..."
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
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
