import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Plus, Play, Heart, Pause, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likedTracks, setLikedTracks] = useState<Set<number>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const toggleSection = (sectionIndex: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionIndex)) {
        newSet.delete(sectionIndex);
      } else {
        newSet.add(sectionIndex);
      }
      return newSet;
    });
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

  const handlePlay = (track: any) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Sparkles, label: 'Beatpulse', path: '/dashboard/beatpulse' },
    { icon: Sparkles, label: 'Virapath', path: '/dashboard/virapath' },
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Sparkles, label: 'Analytics', path: '/dashboard/analytics' },
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
        { id: 1, title: 'Summer Vibes', genre: 'Amapiano', duration: '3:24', artwork: '/src/assets/card-1.png', creator: creators[0], plays: '45K', likes: '2.1K' },
        { id: 2, title: 'Night Drive', genre: 'Trap', duration: '2:58', artwork: '/src/assets/card-2.png', creator: creators[1], plays: '32K', likes: '1.8K' },
        { id: 3, title: 'Country Road', genre: 'Country', duration: '4:12', artwork: '/src/assets/card-3.png', creator: creators[2], plays: '28K', likes: '1.5K' },
        { id: 4, title: 'Jazz Club', genre: 'Jazz', duration: '5:03', artwork: '/src/assets/card-4.png', creator: creators[3], plays: '21K', likes: '1.2K' },
      ]
    },
    {
      title: 'New Songs',
      tracks: [
        { id: 9, title: 'Fresh Start', genre: 'Gospel', duration: '3:58', artwork: '/src/assets/card-5.png', creator: creators[0], plays: '18K', likes: '980' },
        { id: 10, title: 'City Lights', genre: 'Jazz', duration: '4:22', artwork: '/src/assets/card-1.png', creator: creators[1], plays: '15K', likes: '850' },
        { id: 11, title: 'Ocean Wave', genre: 'Soul', duration: '3:41', artwork: '/src/assets/card-2.png', creator: creators[2], plays: '12K', likes: '720' },
        { id: 12, title: 'Desert Rose', genre: '80s', duration: '4:15', artwork: '/src/assets/card-3.png', creator: creators[3], plays: '9K', likes: '540' },
      ]
    },
    {
      title: 'Trending Songs',
      layout: 'list',
      tracks: [
        { id: 17, title: 'Viral Melody', genre: 'Pop', duration: '3:18', artwork: '/src/assets/card-3.png', creator: creators[0], plays: '2.4M', likes: '156K' },
        { id: 18, title: 'Chart Topper', genre: 'Hip Hop', duration: '3:44', artwork: '/src/assets/card-4.png', creator: creators[1], plays: '1.8M', likes: '98K' },
        { id: 19, title: 'Hit Parade', genre: 'Country', duration: '3:52', artwork: '/src/assets/card-5.png', creator: creators[2], plays: '1.5M', likes: '87K' },
        { id: 20, title: 'Rising Star', genre: 'R&B', duration: '4:03', artwork: '/src/assets/card-1.png', creator: creators[3], plays: '1.2M', likes: '72K' },
        { id: 25, title: 'Summer Anthem', genre: 'Pop', duration: '3:33', artwork: '/src/assets/card-2.png', creator: creators[0], plays: '1.1M', likes: '65K' },
        { id: 26, title: 'Night Life', genre: 'Hip Hop', duration: '3:15', artwork: '/src/assets/card-3.png', creator: creators[1], plays: '980K', likes: '54K' },
      ]
    },
    {
      title: 'Trending Remixes',
      layout: 'list',
      tracks: [
        { id: 21, title: 'Classic Reimagined', genre: 'Jazz', duration: '4:28', artwork: '/src/assets/card-4.png', creator: creators[0], plays: '890K', likes: '48K' },
        { id: 22, title: 'Modern Twist', genre: 'Funk', duration: '3:39', artwork: '/src/assets/card-5.png', creator: creators[1], plays: '756K', likes: '42K' },
        { id: 23, title: 'Genre Fusion', genre: 'Soul', duration: '3:47', artwork: '/src/assets/card-1.png', creator: creators[2], plays: '654K', likes: '36K' },
        { id: 24, title: 'Remix Revolution', genre: 'Instrumental', duration: '4:11', artwork: '/src/assets/card-2.png', creator: creators[3], plays: '543K', likes: '29K' },
        { id: 27, title: 'Retro Wave', genre: 'Synthwave', duration: '3:55', artwork: '/src/assets/card-3.png', creator: creators[0], plays: '432K', likes: '24K' },
        { id: 28, title: 'Bass Drop', genre: 'EDM', duration: '3:28', artwork: '/src/assets/card-4.png', creator: creators[1], plays: '389K', likes: '21K' },
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
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-card border-r border-border flex flex-col transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-3 lg:p-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">
            BARIO
          </Link>
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden h-7 w-7"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 px-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors mb-0.5"
            >
              <item.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/dashboard/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs font-medium">Settings</span>
          </Link>
          <Link
            to="/dashboard/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <User className="h-4 w-4" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full lg:w-auto">
        <div className="p-3 lg:p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 lg:mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <Link to="/dashboard/new-remix">
                <Button className="bg-black text-white hover:bg-black/90 text-xs px-3 h-8">
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">New Remix</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src="/src/assets/track-1.jpeg" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer text-xs">
                      Edit Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings" className="cursor-pointer text-xs">
                      Manage Subscription
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-xs">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 lg:mb-6">
            <Link to="/dashboard/create">
              <Card className="p-4 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Quick Create</h3>
                    <p className="text-xs text-muted-foreground">Start a new remix</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/dashboard/library">
              <Card className="p-4 bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Library className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">My Library</h3>
                    <p className="text-xs text-muted-foreground">View all tracks</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Track Sections */}
          {sections.map((section, sectionIndex) => {
            const isExpanded = expandedSections.has(sectionIndex);
            const displayTracks = isExpanded ? section.tracks : section.tracks.slice(0, 4);
            
            return (
            <div key={sectionIndex} className="mb-6 lg:mb-8">
              <div className="flex justify-between items-center mb-2 lg:mb-3">
                <h2 className="text-sm lg:text-lg font-bold text-foreground">{section.title}</h2>
                <Button 
                  variant="ghost" 
                  className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
                  onClick={() => toggleSection(sectionIndex)}
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </Button>
              </div>
              {section.layout === 'list' ? (
                <div className="space-y-1.5">
                  {displayTracks.map((track) => (
                    <Card key={track.id} className="bg-card hover:bg-accent/50 transition-colors cursor-pointer overflow-hidden">
                      <div className="flex items-center gap-2 p-2">
                        <div className="relative w-9 h-9 flex-shrink-0">
                          <img 
                            src={track.artwork} 
                            alt={track.title}
                            className="w-full h-full object-cover rounded"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded">
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-full h-5 w-5"
                              onClick={() => handlePlay(track)}
                            >
                              {isPlaying && currentTrack?.id === track.id ? (
                                <Pause className="h-2.5 w-2.5" />
                              ) : (
                                <Play className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate text-xs">{track.title}</h3>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Avatar className="h-3 w-3">
                              <AvatarImage src={track.creator.avatar} />
                              <AvatarFallback>{track.creator.name[0]}</AvatarFallback>
                            </Avatar>
                            <Link 
                              to={`/dashboard/creator/${track.creator.id}`}
                              className="text-[10px] text-muted-foreground hover:text-foreground hover:underline truncate"
                            >
                              {track.creator.name}
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Play className="h-2.5 w-2.5" />
                            {track.plays}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" />
                            {track.likes}
                          </span>
                          <span className="hidden sm:inline">{track.duration}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleLike(track.id)}
                            className={`h-6 w-6 ${likedTracks.has(track.id) ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            <Heart className={`h-3 w-3 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3">
                  {displayTracks.map((track) => (
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
                            className="rounded-full h-8 w-8"
                            onClick={() => handlePlay(track)}
                          >
                            {isPlaying && currentTrack?.id === track.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-foreground text-xs truncate">{track.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Avatar className="h-3 w-3">
                            <AvatarImage src={track.creator.avatar} />
                            <AvatarFallback>{track.creator.name[0]}</AvatarFallback>
                          </Avatar>
                          <Link 
                            to={`/dashboard/creator/${track.creator.id}`}
                            className="text-[10px] text-muted-foreground hover:text-foreground hover:underline truncate"
                          >
                            {track.creator.name}
                          </Link>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Play className="h-2 w-2" />
                              {track.plays}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="h-2 w-2" />
                              {track.likes}
                            </span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleLike(track.id)}
                            className={`h-5 w-5 ${likedTracks.has(track.id) ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            <Heart className={`h-3 w-3 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            );
          })}

          {/* Audio Player */}
          {currentTrack && (
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-50">
              <div className="max-w-7xl mx-auto flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentTrack.artwork} />
                  <AvatarFallback>{currentTrack.title[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate text-xs">{currentTrack.title}</h4>
                  <div className="flex items-center gap-1">
                    <Avatar className="h-3 w-3">
                      <AvatarImage src={currentTrack.creator.avatar} />
                      <AvatarFallback>{currentTrack.creator.name[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-[10px] text-muted-foreground truncate">{currentTrack.creator.name}</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="rounded-full h-8 w-8"
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">{currentTrack.duration}</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;