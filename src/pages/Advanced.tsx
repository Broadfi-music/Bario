import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Music, Sparkles } from 'lucide-react';
import { useState } from 'react';

const Advanced = () => {
  const [songDescription, setSongDescription] = useState('');
  const [lyrics, setLyrics] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        {/* Back Button */}
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </button>

        <div className="space-y-8">
          {/* Song Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground font-medium flex items-center gap-2">
                <Music className="h-4 w-4" />
                Song Description
              </label>
              <p className="text-foreground/60 text-sm">
                Describe the style, mood, instruments, and vibe you want
              </p>
            </div>
            <Textarea
              value={songDescription}
              onChange={(e) => setSongDescription(e.target.value)}
              placeholder="e.g., upbeat pop with electric guitar, 80s synth vibes, energetic drums..."
              className="min-h-[120px] bg-background/40 backdrop-blur-sm border-foreground/10 text-foreground placeholder:text-foreground/40 resize-none"
            />
          </div>

          {/* Lyrics */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-foreground font-medium">
                Lyrics (Optional)
              </label>
              <p className="text-foreground/60 text-sm">
                Write your own lyrics or leave empty for AI-generated lyrics
              </p>
            </div>
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="[Verse 1]&#10;Your lyrics here...&#10;&#10;[Chorus]&#10;More lyrics..."
              className="min-h-[240px] bg-background/40 backdrop-blur-sm border-foreground/10 text-foreground placeholder:text-foreground/40 resize-none font-mono"
            />
          </div>

          {/* Generation Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-foreground font-medium text-sm">
                Title
              </label>
              <input
                type="text"
                placeholder="My Awesome Song"
                className="w-full bg-background/40 backdrop-blur-sm border border-foreground/10 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/40 outline-none focus:border-foreground/20 transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-foreground font-medium text-sm">
                Duration
              </label>
              <select className="w-full bg-background/40 backdrop-blur-sm border border-foreground/10 rounded-lg px-4 py-3 text-foreground outline-none focus:border-foreground/20 transition-colors">
                <option>30 seconds</option>
                <option>1 minute</option>
                <option>2 minutes</option>
                <option>3 minutes</option>
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <Button className="bg-background hover:bg-background/80 text-foreground rounded-full px-12 py-6 text-lg border border-foreground/20">
              <Sparkles className="mr-2 h-5 w-5" />
              Generate Song
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advanced;
