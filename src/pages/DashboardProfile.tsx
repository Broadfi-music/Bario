import { Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const DashboardProfile = () => {
  const [profile, setProfile] = useState({
    username: 'musiclover',
    displayName: 'Music Lover',
    bio: 'Creating amazing remixes and exploring new sounds',
    email: 'user@example.com',
    avatar: '/src/assets/track-1.jpeg',
    spotify: '',
    soundcloud: '',
    twitter: '',
    instagram: '',
    youtube: ''
  });

  const handleSave = () => {
    console.log('Saving profile:', profile);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your public profile</p>
          </div>
        </div>

        <Card className="p-4 sm:p-8">
          <div className="space-y-5">
            {/* Avatar Section */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={profile.avatar} />
                  <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute bottom-0 right-0 rounded-full h-7 w-7"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Profile Picture</h3>
                <p className="text-xs text-muted-foreground">Click to upload a new picture</p>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                placeholder="Your username"
                className="text-sm"
              />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="displayName" className="text-sm">Display Name</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Your display name"
                className="text-sm"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm">Bio</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={3}
                className="text-sm"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your@email.com"
                className="text-sm"
              />
            </div>

            {/* Social Links Section */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-semibold text-foreground mb-4 text-sm">Social Links</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Spotify */}
                <div className="space-y-1.5">
                  <Label htmlFor="spotify" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                  </Label>
                  <Input
                    id="spotify"
                    value={profile.spotify}
                    onChange={(e) => setProfile({ ...profile, spotify: e.target.value })}
                    placeholder="https://open.spotify.com/artist/..."
                    className="text-sm"
                  />
                </div>

                {/* SoundCloud */}
                <div className="space-y-1.5">
                  <Label htmlFor="soundcloud" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899 1.125c-.051 0-.094.046-.101.1l-.233 1.125.233 1.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-1.105-.27-1.125c-.009-.06-.052-.1-.084-.1zm1.753-1.875c-.051 0-.094.046-.101.1l-.33 2.925.33 2.905c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-2.905-.372-2.925c-.009-.06-.052-.1-.099-.1zm.901-.875c-.051 0-.094.046-.101.1l-.33 3.8.33 3.65c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-3.65-.372-3.8c-.009-.06-.052-.1-.099-.1zm.9-.75c-.051 0-.094.046-.101.1l-.33 4.55.33 4.4c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-4.4-.372-4.55c-.009-.06-.052-.1-.099-.1zm.901-.5c-.051 0-.094.046-.101.1l-.33 5.05.33 4.9c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-4.9-.372-5.05c-.009-.06-.052-.1-.099-.1zm.9-.375c-.051 0-.094.046-.101.1l-.33 5.425.33 5.275c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-5.275-.372-5.425c-.009-.06-.052-.1-.099-.1zm.901-.125c-.051 0-.094.046-.101.1l-.33 5.55.33 5.4c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-5.4-.372-5.55c-.009-.06-.052-.1-.099-.1zm.9 0c-.051 0-.094.046-.101.1l-.33 5.55.33 5.4c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-5.4-.372-5.55c-.009-.06-.052-.1-.099-.1zm.901.125c-.051 0-.094.046-.101.1l-.33 5.425.33 5.275c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-5.275-.372-5.425c-.009-.06-.052-.1-.099-.1zm.9.375c-.051 0-.094.046-.101.1l-.33 5.05.33 4.9c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.372-4.9-.372-5.05c-.009-.06-.052-.1-.099-.1zm5.249-1.5c-.246 0-.45.205-.45.45v10.8c0 .246.205.45.45.45H21.9c1.16 0 2.1-.94 2.1-2.1s-.94-2.1-2.1-2.1c-.35 0-.68.085-.97.235-.29-2.055-2.06-3.635-4.2-3.635-1.13 0-2.155.445-2.91 1.17-.24.23-.25.6-.02.84.23.24.6.25.84.02.56-.54 1.29-.83 2.09-.83 1.68 0 3.05 1.37 3.05 3.05 0 .246.205.45.45.45.96 0 1.75.79 1.75 1.75s-.79 1.75-1.75 1.75H12v-10.35c0-.246-.205-.45-.45-.45z"/>
                    </svg>
                    SoundCloud
                  </Label>
                  <Input
                    id="soundcloud"
                    value={profile.soundcloud}
                    onChange={(e) => setProfile({ ...profile, soundcloud: e.target.value })}
                    placeholder="https://soundcloud.com/..."
                    className="text-sm"
                  />
                </div>

                {/* X (Twitter) */}
                <div className="space-y-1.5">
                  <Label htmlFor="twitter" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X (Twitter)
                  </Label>
                  <Input
                    id="twitter"
                    value={profile.twitter}
                    onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                    placeholder="https://x.com/..."
                    className="text-sm"
                  />
                </div>

                {/* Instagram */}
                <div className="space-y-1.5">
                  <Label htmlFor="instagram" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    value={profile.instagram}
                    onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="text-sm"
                  />
                </div>

                {/* YouTube */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="youtube" className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </Label>
                  <Input
                    id="youtube"
                    value={profile.youtube}
                    onChange={(e) => setProfile({ ...profile, youtube: e.target.value })}
                    placeholder="https://youtube.com/..."
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Link to="/dashboard">
                <Button variant="outline" size="sm">Cancel</Button>
              </Link>
              <Button onClick={handleSave} className="bg-black text-white hover:bg-black/90" size="sm">
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardProfile;