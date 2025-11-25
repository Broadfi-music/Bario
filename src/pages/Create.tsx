import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Create = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [generatedTrack, setGeneratedTrack] = useState(false);

  const genres = [
    'amapiano', 'trap', 'funk', 'hiphop', 'country', '80s', 
    'R&B', 'soul', 'pop', 'genz', 'jazz', 'reggae', 'gospel', 'instrumental'
  ];

  const styles = [
    'Classic', 'Modern', 'Minimal', 'Heavy', 'Smooth', 'Energetic'
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const handleGenerate = () => {
    if ((audioFile || audioUrl) && selectedGenre && selectedStyle) {
      setGeneratedTrack(true);
    }
  };

  const handleDownload = (format: 'mp3' | 'wav') => {
    console.log(`Downloading as ${format}`);
  };

  const handleShare = (platform: string) => {
    console.log(`Sharing to ${platform}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Create</h1>
        </div>

        {/* Upload Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Upload Audio</h2>
          
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload" className="text-foreground">Upload Audio File</Label>
              <div className="mt-2">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {audioFile ? audioFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV up to 50MB</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* URL Input */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="audio-url" className="text-foreground">Or paste music link</Label>
                <Input
                  id="audio-url"
                  type="url"
                  placeholder="https://..."
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  className="mt-2"
                />
              </div>
              <Button className="bg-black text-white hover:bg-black/90">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </Card>

        {/* Style Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Conversion Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Genre Selection */}
            <div>
              <Label htmlFor="genre" className="text-foreground">Select Genre</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger id="genre" className="mt-2">
                  <SelectValue placeholder="Choose genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre.charAt(0).toUpperCase() + genre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Style Selection */}
            <div>
              <Label htmlFor="style" className="text-foreground">Select Style</Label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger id="style" className="mt-2">
                  <SelectValue placeholder="Choose style" />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate}
          disabled={!((audioFile || audioUrl) && selectedGenre && selectedStyle)}
          className="w-full bg-black text-white hover:bg-black/90 h-12 text-lg"
        >
          Generate
        </Button>

        {/* Generated Track Preview */}
        {generatedTrack && (
          <Card className="p-6 mt-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Track</h2>
            
            <div className="bg-muted rounded-lg p-8 mb-4 text-center">
              <p className="text-muted-foreground">Audio Player Placeholder</p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedGenre} • {selectedStyle} Style
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Download Options */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Download Format</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    <Button 
                      onClick={() => handleDownload('mp3')}
                      className="w-full"
                    >
                      Download as MP3
                    </Button>
                    <Button 
                      onClick={() => handleDownload('wav')}
                      className="w-full"
                    >
                      Download as WAV
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Share Options */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Your Track</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    <Button 
                      onClick={() => handleShare('link')}
                      variant="outline"
                      className="w-full"
                    >
                      Copy Link
                    </Button>
                    <Button 
                      onClick={() => handleShare('tiktok')}
                      variant="outline"
                      className="w-full"
                    >
                      Share to TikTok
                    </Button>
                    <Button 
                      onClick={() => handleShare('facebook')}
                      variant="outline"
                      className="w-full"
                    >
                      Share to Facebook
                    </Button>
                    <Button 
                      onClick={() => handleShare('whatsapp')}
                      variant="outline"
                      className="w-full"
                    >
                      Share to WhatsApp
                    </Button>
                    <Button 
                      onClick={() => handleShare('instagram')}
                      variant="outline"
                      className="w-full"
                    >
                      Share to Instagram
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Get Stem */}
              <Button variant="outline" className="flex-1">
                Get Stem
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Create;
