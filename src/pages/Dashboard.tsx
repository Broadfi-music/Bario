import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Plus, Play, Heart, Pause, Menu, X, Gift, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useDashboardMusic, DashboardTrack } from '@/hooks/useDashboardMusic';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { data: musicData, loading: musicLoading, likedTracks, toggleLike } = useDashboardMusic();
  const [currentTrack, setCurrentTrack] = useState<DashboardTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, [currentTrack]);

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

  const handleLike = (trackId: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    toggleLike(trackId);
    toast.success(likedTracks.has(trackId) ? 'Removed from favorites' : 'Added to favorites');
  };

  const handlePlay = (track: DashboardTrack) => {
    if (!track.preview) {
      toast.error('No preview available for this track');
      return;
    }
    
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview;
        audioRef.current.play().catch(() => {
          toast.error('Unable to play this track');
        });
      }
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    { icon: Sparkles, label: 'Megashuffle', path: '/dashboard/megashuffle' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
  ];

  const topNavItems = [
    { label: 'Heatmap', path: '/global-heatmap' },
    { label: 'Alpha', path: '/music-alpha' },
  ];

  const sections = [
    {
      title: 'Recent Remixes',
      tracks: musicData.recentRemixes.slice(0, 10),
    },
    {
      title: 'New Songs',
      tracks: musicData.newSongs.slice(0, 10),
    },
    {
      title: `Trending Songs (${musicData.trendingSongs.length})`,
      layout: 'list',
      tracks: musicData.trendingSongs.slice(0, 20),
    },
    {
      title: `Trending Remixes (${musicData.trendingRemixes.length})`,
      layout: 'list',
      tracks: musicData.trendingRemixes.slice(0, 20),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <audio ref={audioRef} />
      
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
      <main className={`flex-1 overflow-y-auto w-full lg:w-auto ${currentTrack ? 'pb-24' : ''}`}>
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
              {topNavItems.map((item) => (
                <Link key={item.label} to={item.path}>
                  <Button variant="ghost" className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Button>
                </Link>
              ))}
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

          {/* Loading State */}
          {musicLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground text-sm">Loading music...</div>
            </div>
          )}

          {/* Track Sections */}
          {!musicLoading && sections.map((section, sectionIndex) => {
            const isExpanded = expandedSections.has(sectionIndex);
            const displayTracks = isExpanded ? section.tracks : section.tracks.slice(0, 4);
            
            if (section.tracks.length === 0) return null;
            
            return (
            <div key={sectionIndex} className="mb-6 lg:mb-8">
              <div className="flex justify-between items-center mb-2 lg:mb-3">
                <h2 className="text-sm lg:text-lg font-bold text-foreground">{section.title}</h2>
                {section.tracks.length > 4 && (
                  <Button 
                    variant="ghost" 
                    className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
                    onClick={() => toggleSection(sectionIndex)}
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Button>
                )}
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
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/src/assets/card-1.png';
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded">
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="rounded-full h-5 w-5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePlay(track);
                              }}
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
                            {track.artistImage && (
                              <Avatar className="h-3 w-3">
                                <AvatarImage src={track.artistImage} />
                                <AvatarFallback>{track.artist?.[0]}</AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-[10px] text-muted-foreground truncate">
                              {track.artist}
                            </span>
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
                            onClick={(e) => handleLike(track.id, e)}
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
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/src/assets/card-1.png';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="rounded-full h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlay(track);
                            }}
                          >
                            {isPlaying && currentTrack?.id === track.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(track.id);
                          }}
                          className={`absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ${likedTracks.has(track.id) ? "text-red-500" : "text-white"}`}
                        >
                          <Heart className={`h-3 w-3 ${likedTracks.has(track.id) ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      <div className="p-2">
                        <h3 className="font-medium text-foreground mb-0.5 text-xs truncate">{track.title}</h3>
                        <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Play className="h-2 w-2" />
                            {track.plays}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2 w-2" />
                            {track.likes}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>

        {/* Audio Player */}
        {currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 lg:left-48 bg-card border-t border-border p-3 z-50">
            <div className="flex items-center gap-3">
              <img 
                src={currentTrack.artwork} 
                alt={currentTrack.title} 
                className="w-10 h-10 rounded object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/card-1.png';
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{currentTrack.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90 rounded-full"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex items-center gap-2 w-32">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider defaultValue={[80]} max={100} step={1} className="w-full" />
              </div>
            </div>
            <div className="mt-2">
              <Slider value={[progress]} max={100} step={0.1} className="w-full" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
