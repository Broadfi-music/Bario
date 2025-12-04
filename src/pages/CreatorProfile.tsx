import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

const CreatorProfile = () => {
  const { id } = useParams();
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());

  const creators: Record<string, any> = {
    '1': { id: 1, name: 'DJ Marcus', username: '@djmarcus', avatar: '/src/assets/track-1.jpeg', bio: 'Award-winning DJ and producer', followers: '12.4K', following: '234' },
    '2': { id: 2, name: 'Sarah Beats', username: '@sarahbeats', avatar: '/src/assets/track-2.jpeg', bio: 'Electronic music producer', followers: '8.2K', following: '156' },
    '3': { id: 3, name: 'Mike Rivers', username: '@mikerivers', avatar: '/src/assets/track-3.jpeg', bio: 'Country and soul artist', followers: '5.6K', following: '89' },
    '4': { id: 4, name: 'Jazz Masters', username: '@jazzmasters', avatar: '/src/assets/track-4.jpeg', bio: 'Jazz collective', followers: '15.1K', following: '312' },
  };

  const creator = creators[id || '1'] || creators['1'];

  const tracks = [
    { id: 1, title: 'Summer Vibes Remix', genre: 'Amapiano', duration: '3:24', artwork: '/src/assets/card-1.png', plays: '125K', likes: '8.2K' },
    { id: 2, title: 'Night Drive', genre: 'Trap', duration: '2:58', artwork: '/src/assets/card-2.png', plays: '98K', likes: '6.1K' },
    { id: 3, title: 'Electric Dreams', genre: 'Synthwave', duration: '4:12', artwork: '/src/assets/card-3.png', plays: '76K', likes: '4.8K' },
    { id: 4, title: 'Soul Sessions', genre: 'R&B', duration: '5:03', artwork: '/src/assets/card-4.png', plays: '54K', likes: '3.2K' },
    { id: 5, title: 'Midnight Groove', genre: 'Jazz', duration: '3:45', artwork: '/src/assets/card-5.png', plays: '43K', likes: '2.9K' },
    { id: 6, title: 'Urban Flow', genre: 'Hip Hop', duration: '3:18', artwork: '/src/assets/card-1.png', plays: '38K', likes: '2.4K' },
  ];

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleLike = (trackId: number) => {
    setLikedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
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
        </div>

        {/* Creator Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
            <AvatarImage src={creator.avatar} />
            <AvatarFallback>{creator.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{creator.name}</h1>
            <p className="text-muted-foreground mb-2">{creator.username}</p>
            <p className="text-sm text-muted-foreground mb-4">{creator.bio}</p>
            <div className="flex justify-center sm:justify-start gap-4 mb-4">
              <div className="text-center">
                <p className="font-bold text-foreground">{creator.followers}</p>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">{creator.following}</p>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">{tracks.length}</p>
                <p className="text-xs text-muted-foreground">Tracks</p>
              </div>
            </div>
            <div className="flex justify-center sm:justify-start gap-3">
              <Button 
                size="icon" 
                variant="outline"
                onClick={() => handlePlay(tracks[0])}
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="outline"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button 
                onClick={() => setIsFollowing(!isFollowing)}
                className={isFollowing ? "bg-muted text-foreground" : "bg-black text-white hover:bg-black/90"}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tracks */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Remixes</h2>
          <div className="space-y-2">
            {tracks.map((track) => (
              <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <img 
                      src={track.artwork} 
                      alt={track.title}
                      className="w-full h-full object-cover rounded"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="rounded-full h-6 w-6"
                        onClick={() => handlePlay(track)}
                      >
                        {isPlaying && currentTrack?.id === track.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate text-sm">{track.title}</h3>
                    <p className="text-xs text-muted-foreground">{track.genre}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {track.plays}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {track.likes}
                    </span>
                    <span className="hidden sm:inline">{track.duration}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleLike(track.id)}
                      className={`h-7 w-7 ${likedTracks.has(track.id) ? "text-red-500" : "text-muted-foreground"}`}
                    >
                      <Heart className={`h-4 w-4 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 z-50">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <img src={currentTrack.artwork} alt={currentTrack.title} className="h-10 w-10 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground truncate text-sm">{currentTrack.title}</h4>
                <p className="text-xs text-muted-foreground">{creator.name}</p>
              </div>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full h-10 w-10"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorProfile;