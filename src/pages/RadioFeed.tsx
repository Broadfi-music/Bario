import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Radio, Save, Upload, Globe, Image, Link as LinkIcon, 
  Play, Pause, Settings, Users, Gift, Bell, X, Loader2
} from 'lucide-react';

interface RadioStation {
  id: string;
  user_id: string;
  station_name: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  website_url: string | null;
  stream_url: string | null;
  is_live: boolean;
  listener_count: number;
}

const RadioFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [station, setStation] = useState<RadioStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [testingStream, setTestingStream] = useState(false);
  
  // Form state
  const [stationName, setStationName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchStation();
  }, [user]);

  const fetchStation = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('radio_stations')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching station:', error);
      // Create station if doesn't exist
      const { data: newStation, error: createError } = await supabase
        .from('radio_stations')
        .insert({ user_id: user.id, station_name: 'My Radio Station' })
        .select()
        .single();
      
      if (!createError && newStation) {
        setStation(newStation);
        setStationName(newStation.station_name);
      }
    } else if (data) {
      setStation(data);
      setStationName(data.station_name);
      setDescription(data.description || '');
      setCoverImageUrl(data.cover_image_url || '');
      setLogoUrl(data.logo_url || '');
      setWebsiteUrl(data.website_url || '');
      setStreamUrl(data.stream_url || '');
    }
    
    setLoading(false);
  };

  const saveStation = async () => {
    if (!user || !station) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('radio_stations')
      .update({
        station_name: stationName,
        description,
        cover_image_url: coverImageUrl || null,
        logo_url: logoUrl || null,
        website_url: websiteUrl || null,
        stream_url: streamUrl || null,
      })
      .eq('id', station.id);

    if (error) {
      toast.error('Failed to save station');
    } else {
      toast.success('Station saved successfully');
      fetchStation();
    }
    setSaving(false);
  };

  const testStream = async () => {
    if (!streamUrl) {
      toast.error('Please enter a stream URL first');
      return;
    }

    setTestingStream(true);
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.src = streamUrl;
        try {
          await audioRef.current.play();
          setIsPlaying(true);
          toast.success('Stream is working!');
        } catch (err) {
          toast.error('Failed to play stream. Check the URL.');
        }
      }
    }
    
    setTestingStream(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <div className="text-center">
          <Radio className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/50 mb-4">Please sign in to manage your radio station</p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#53fc18] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-white">
      <audio ref={audioRef} />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0e0e10] border-b border-white/5">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/radio-stations')} className="flex items-center gap-2">
              <Radio className="h-6 w-6 text-[#53fc18]" />
              <span className="font-semibold hidden sm:inline">Radio Feed</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/radio-studio')}
              variant="outline"
              size="sm"
              className="border-white/20"
            >
              <Settings className="h-4 w-4 mr-2" />
              Studio
            </Button>
            <Button
              onClick={saveStation}
              disabled={saving}
              size="sm"
              className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Preview Card */}
        <div className="mb-8 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-white/10">
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Radio className="h-10 w-10 text-white/30" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-2">{stationName || 'Your Station Name'}</h1>
              <p className="text-white/60 text-sm mb-4 line-clamp-2">
                {description || 'Add a description for your radio station...'}
              </p>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {station?.listener_count || 0} listeners
                </span>
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#53fc18]">
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
          
          {/* Cover Image Preview */}
          {coverImageUrl && (
            <div className="mt-4 rounded-lg overflow-hidden aspect-video">
              <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Edit Form */}
        <div className="space-y-6">
          {/* Station Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Station Name</label>
            <Input
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="My Awesome Radio Station"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell listeners about your station..."
              className="bg-white/5 border-white/10 min-h-[100px]"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Logo URL
            </label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Image className="h-4 w-4" />
              Cover Image URL
            </label>
            <Input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/cover.png"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Website URL */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Website URL
            </label>
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://myradiostation.com"
              className="bg-white/5 border-white/10"
            />
          </div>

          {/* Stream URL */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Stream URL
            </label>
            <div className="flex gap-2">
              <Input
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://stream.zeno.fm/7x9g1gqdcm0uv"
                className="bg-white/5 border-white/10 flex-1"
              />
              <Button
                onClick={testStream}
                variant="outline"
                className="border-white/20"
                disabled={testingStream}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-1">Test URL: https://stream.zeno.fm/7x9g1gqdcm0uv</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              onClick={saveStation}
              disabled={saving}
              className="bg-[#53fc18] text-black hover:bg-[#53fc18]/90 flex-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
            <Button
              onClick={() => navigate('/radio-studio')}
              variant="outline"
              className="border-white/20"
            >
              <Settings className="h-4 w-4 mr-2" />
              Go to Studio
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RadioFeed;
