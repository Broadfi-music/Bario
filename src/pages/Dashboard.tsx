import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, Compass, User, Settings, Plus, Play, Heart, Pause, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleSignOut = () => {
    navigate('/');
  };

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Beatpulse', path: '/dashboard/beatpulse' },
    { icon: Sparkles, label: 'Virapath', path: '/dashboard/virapath' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Compass, label: 'Global discover', path: '/dashboard/global-discover' },
    { icon: Compass, label: 'Billboard', path: '/dashboard/billboard' },
    { icon: Compass, label: 'Analytics', path: '/dashboard/analytics' },
  ];

  const creators = [
    { id: 1, name: 'DJ Marcus', avatar: '/src/assets/track-1.jpeg' },
    { id: 2, name: 'Sarah Beats', avatar: '/src/assets/track-2.jpeg' },
    { id: 3, name: 'Mike Rivers', avatar: '/src/assets/track-3.jpeg' },
    { id: 4, name: 'Jazz Masters', avatar: '/src/assets/track-4.jpeg' },
  ];

  const sections = [
    {
      title: 'Recent Remixes',
      tracks: [
        { id: 1, title: 'Summer Vibes', genre: 'Amapiano', duration: '3:24', artwork: '/src/assets/card-1.png', creator: creators[0] },
        { id: 2, title: 'Night Drive', genre: 'Trap', duration: '2:58', artwork: '/src/assets/card-2.png', creator: creators[1] },
        { id: 3, title: 'Country Road', genre: 'Country', duration: '4:12', artwork: '/src/assets/card-3.png', creator: creators[2] },
        { id: 4, title: 'Jazz Club', genre: 'Jazz', duration: '5:03', artwork: '/src/assets/card-4.png', creator: creators[3] },
      ]
    },
    {
      title: 'New Songs',
      tracks: [
        { id: 9, title: 'Fresh Start', genre: 'Gospel', duration: '3:58', artwork: '/src/assets/card-5.png', creator: creators[0] },
        { id: 10, title: 'City Lights', genre: 'Jazz', duration: '4:22', artwork: '/src/assets/card-1.png', creator: creators[1] },
        { id: 11, title: 'Ocean Wave', genre: 'Soul', duration: '3:41', artwork: '/src/assets/card-2.png', creator: creators[2] },
        { id: 12, title: 'Desert Rose', genre: '80s', duration: '4:15', artwork: '/src/assets/card-3.png', creator: creators[3] },
      ]
    },
    {
      title: 'Global Trends',
      tracks: [
        { id: 13, title: 'Tokyo Nights', genre: 'GenZ', duration: '3:29', artwork: '/src/assets/card-4.png', creator: creators[0] },
        { id: 14, title: 'Lagos Groove', genre: 'Amapiano', duration: '3:51', artwork: '/src/assets/card-5.png', creator: creators[1] },
        { id: 15, title: 'Berlin Beat', genre: 'Trap', duration: '3:36', artwork: '/src/assets/card-1.png', creator: creators[2] },
        { id: 16, title: 'Rio Rhythm', genre: 'Reggae', duration: '4:08', artwork: '/src/assets/card-2.png', creator: creators[3] },
      ]
    },
    {
      title: 'Trending Songs',
      layout: 'list',
      tracks: [
        { id: 17, title: 'Viral Melody', genre: 'Pop', duration: '3:18', artwork: '/src/assets/card-3.png', creator: creators[0], plays: '2.4M' },
        { id: 18, title: 'Chart Topper', genre: 'Hip Hop', duration: '3:44', artwork: '/src/assets/card-4.png', creator: creators[1], plays: '1.8M' },
        { id: 19, title: 'Hit Parade', genre: 'Country', duration: '3:52', artwork: '/src/assets/card-5.png', creator: creators[2], plays: '1.5M' },
        { id: 20, title: 'Rising Star', genre: 'R&B', duration: '4:03', artwork: '/src/assets/card-1.png', creator: creators[3], plays: '1.2M' },
        { id: 25, title: 'Summer Anthem', genre: 'Pop', duration: '3:33', artwork: '/src/assets/card-2.png', creator: creators[0], plays: '1.1M' },
        { id: 26, title: 'Night Life', genre: 'Hip Hop', duration: '3:15', artwork: '/src/assets/card-3.png', creator: creators[1], plays: '980K' },
      ]
    },
    {
      title: 'Trending Remixes',
      layout: 'list',
      tracks: [
        { id: 21, title: 'Classic Reimagined', genre: 'Jazz', duration: '4:28', artwork: '/src/assets/card-4.png', creator: creators[0], plays: '890K' },
        { id: 22, title: 'Modern Twist', genre: 'Funk', duration: '3:39', artwork: '/src/assets/card-5.png', creator: creators[1], plays: '756K' },
        { id: 23, title: 'Genre Fusion', genre: 'Soul', duration: '3:47', artwork: '/src/assets/card-1.png', creator: creators[2], plays: '654K' },
        { id: 24, title: 'Remix Revolution', genre: 'Instrumental', duration: '4:11', artwork: '/src/assets/card-2.png', creator: creators[3], plays: '543K' },
        { id: 27, title: 'Retro Wave', genre: 'Synthwave', duration: '3:55', artwork: '/src/assets/card-3.png', creator: creators[0], plays: '432K' },
        { id: 28, title: 'Bass Drop', genre: 'EDM', duration: '3:28', artwork: '/src/assets/card-4.png', creator: creators[1], plays: '389K' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 lg:p-6 flex items-center justify-between">
          <Link to="/" className="text-xl lg:text-2xl font-bold text-foreground">
            BARIO
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-1"
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Link
            to="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </Link>
          <Link
            to="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <User className="h-5 w-5" />
            <span className="font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 lg:mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 lg:gap-4">
              <Link to="/dashboard/new-remix">
                <Button className="bg-black text-white hover:bg-black/90 text-sm lg:text-base px-3 lg:px-4">
                  <Plus className="h-4 w-4 lg:h-5 lg:w-5 mr-1 lg:mr-2" />
                  <span className="hidden sm:inline">New Remix</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                      <AvatarImage src="/src/assets/track-1.jpeg" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer">
                      Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer">
                      Manage Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Link to="/dashboard/create">
              <Card className="p-6 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Quick Create</h3>
                    <p className="text-sm text-muted-foreground">Start a new remix</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/dashboard/library">
              <Card className="p-6 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Library className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">My Library</h3>
                    <p className="text-sm text-muted-foreground">View all tracks</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Track Sections */}
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="mb-8 lg:mb-12">
              <div className="flex justify-between items-center mb-3 lg:mb-4">
                <h2 className="text-lg lg:text-2xl font-bold text-foreground">{section.title}</h2>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground text-sm">
                  Show more
                </Button>
              </div>
              {section.layout === 'list' ? (
                <div className="space-y-2">
                  {section.tracks.map((track) => (
                    <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden">
                      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                          <img 
                            src={track.artwork} 
                            alt={track.title}
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded">
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-full h-6 w-6 sm:h-8 sm:w-8"
                              onClick={() => handlePlay(track)}
                            >
                              {isPlaying && currentTrack?.id === track.id ? (
                                <Pause className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <Play className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{track.title}</h3>
                          <div className="flex items-center gap-1 sm:gap-2 mt-1">
                            <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                              <AvatarImage src={track.creator.avatar} />
                              <AvatarFallback>{track.creator.name[0]}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{track.creator.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{track.plays}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground">{track.duration}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleLike(track.id)}
                            className={`h-8 w-8 ${likedTracks.has(track.id) ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
                  {section.tracks.map((track) => (
                    <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden group">
                      <div className="aspect-square bg-muted relative">
                        <img 
                          src={track.artwork} 
                          alt={track.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="rounded-full h-12 w-12"
                            onClick={() => handlePlay(track)}
                          >
                            {isPlaying && currentTrack?.id === track.id ? (
                              <Pause className="h-6 w-6" />
                            ) : (
                              <Play className="h-6 w-6" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground mb-1">{track.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={track.creator.avatar} />
                            <AvatarFallback>{track.creator.name[0]}</AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-muted-foreground">{track.creator.name}</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">{track.genre}</p>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleLike(track.id)}
                            className={`h-8 w-8 ${likedTracks.has(track.id) ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            <Heart className={`h-4 w-4 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{track.duration}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Audio Player */}
          {currentTrack && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3 sm:p-4 z-50">
              <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={currentTrack.artwork} />
                  <AvatarFallback>{currentTrack.title[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate text-sm sm:text-base">{currentTrack.title}</h4>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Avatar className="h-3 w-3 sm:h-4 sm:w-4">
                      <AvatarImage src={currentTrack.creator.avatar} />
                      <AvatarFallback>{currentTrack.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentTrack.creator.name}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="rounded-full h-10 w-10 sm:h-12 sm:w-12"
                >
                  {isPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:w-5" /> : <Play className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{currentTrack.duration}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
