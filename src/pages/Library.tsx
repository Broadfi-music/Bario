import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Download, Share2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const Library = () => {
  const generatedTracks = [
    { id: 1, title: 'Summer Vibes Remix', genre: 'Amapiano', date: '2024-01-15', duration: '3:24', artwork: '/src/assets/track-1.jpeg' },
    { id: 2, title: 'Night Drive Trap', genre: 'Trap', date: '2024-01-14', duration: '2:58', artwork: '/src/assets/track-2.jpeg' },
    { id: 3, title: 'Country Soul', genre: 'Country', date: '2024-01-13', duration: '4:12', artwork: '/src/assets/track-3.jpeg' },
    { id: 4, title: 'Jazz Fusion', genre: 'Jazz', date: '2024-01-12', duration: '5:03', artwork: '/src/assets/track-4.jpeg' },
    { id: 5, title: 'Gospel Energy', genre: 'Gospel', date: '2024-01-11', duration: '3:58', artwork: '/src/assets/track-5.jpeg' },
    { id: 6, title: 'City Lights Jazz', genre: 'Jazz', date: '2024-01-10', duration: '4:22', artwork: '/src/assets/track-6.jpeg' },
    { id: 7, title: 'Ocean Wave Soul', genre: 'Soul', date: '2024-01-09', duration: '3:41', artwork: '/src/assets/track-7.jpeg' },
    { id: 8, title: 'Desert Rose 80s', genre: '80s', date: '2024-01-08', duration: '4:15', artwork: '/src/assets/track-8.jpeg' },
  ];

  const handleDownload = (format: 'mp3' | 'wav', trackTitle: string) => {
    console.log(`Downloading ${trackTitle} as ${format}`);
  };

  const handleShare = (platform: string, trackTitle: string) => {
    console.log(`Sharing ${trackTitle} to ${platform}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Library</h1>
            <p className="text-muted-foreground mt-1">All your generated music in one place</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">Total Tracks</h3>
            <p className="text-3xl font-bold text-foreground">{generatedTracks.length}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">This Week</h3>
            <p className="text-3xl font-bold text-foreground">4</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-sm text-muted-foreground mb-1">Total Duration</h3>
            <p className="text-3xl font-bold text-foreground">32:53</p>
          </Card>
        </div>

        {/* Tracks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {generatedTracks.map((track) => (
            <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors overflow-hidden group">
              <div className="aspect-square bg-muted relative">
                <img 
                  src={track.artwork} 
                  alt={track.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <Button size="icon" variant="secondary" className="rounded-full h-12 w-12">
                    <Play className="h-6 w-6" />
                  </Button>
                </div>
                
                {/* Action Menu */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Download Format</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 mt-4">
                            <Button 
                              onClick={() => handleDownload('mp3', track.title)}
                              className="w-full"
                            >
                              Download as MP3
                            </Button>
                            <Button 
                              onClick={() => handleDownload('wav', track.title)}
                              className="w-full"
                            >
                              Download as WAV
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Share Your Track</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-2 mt-4">
                            <Button 
                              onClick={() => handleShare('link', track.title)}
                              variant="outline"
                              className="w-full"
                            >
                              Copy Link
                            </Button>
                            <Button 
                              onClick={() => handleShare('tiktok', track.title)}
                              variant="outline"
                              className="w-full"
                            >
                              Share to TikTok
                            </Button>
                            <Button 
                              onClick={() => handleShare('facebook', track.title)}
                              variant="outline"
                              className="w-full"
                            >
                              Share to Facebook
                            </Button>
                            <Button 
                              onClick={() => handleShare('whatsapp', track.title)}
                              variant="outline"
                              className="w-full"
                            >
                              Share to WhatsApp
                            </Button>
                            <Button 
                              onClick={() => handleShare('instagram', track.title)}
                              variant="outline"
                              className="w-full"
                            >
                              Share to Instagram
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <DropdownMenuItem>
                        Get Stem
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground mb-1">{track.title}</h3>
                <p className="text-sm text-muted-foreground">{track.genre}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">{track.duration}</p>
                  <p className="text-xs text-muted-foreground">{track.date}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library;
