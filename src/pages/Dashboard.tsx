import { Link, useNavigate } from 'react-router-dom';
import { Home, Library, Sparkles, User, Settings, Plus, Play, Heart, Pause, Menu, X, Gift, SkipBack, SkipForward, Volume2, Search, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useDashboardMusic, DashboardTrack } from '@/hooks/useDashboardMusic';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { data: musicData, loading: musicLoading, likedTracks, toggleLike } = useDashboardMusic();
  const [currentTrack, setCurrentTrack] = useState<DashboardTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Get all tracks as a flat list for skip functionality
  const allTracks = [
    ...musicData.recentRemixes,
    ...musicData.newSongs,
    ...musicData.trendingSongs,
    ...musicData.trendingRemixes,
  ].filter(t => t.preview);

  // Audio progress tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      // Auto-play next track
      skipToNextTrack();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, allTracks]);

  const skipToNextTrack = () => {
    if (!currentTrack || allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % allTracks.length;
    handlePlay(allTracks[nextIndex]);
  };

  const skipToPrevTrack = () => {
    if (!currentTrack || allTracks.length === 0) return;
    const currentIndex = allTracks.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex <= 0 ? allTracks.length - 1 : currentIndex - 1;
    handlePlay(allTracks[prevIndex]);
  };

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

  const handleLike = async (track: DashboardTrack, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }
    
    // Pass track data to toggleLike for proper saving
    toggleLike(track.id, {
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      artwork: track.artwork,
      preview: track.preview
    });
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

  // Don't show full page loading - content loads progressively

  if (!user) {
    return null;
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('music-search', {
        body: { query: searchQuery }
      });
      if (error) throw error;
      // Filter to only include tracks with previews
      const resultsWithPreviews = (data?.results || []).filter((r: any) => r.preview);
      setSearchResults(resultsWithPreviews);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchLike = async (result: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please sign in to add favorites');
      return;
    }
    
    // Pass track data to toggleLike for proper saving
    toggleLike(result.id, {
      title: result.title || 'Unknown Track',
      artist: result.artist || 'Unknown Artist',
      artwork: result.artwork,
      preview: result.preview
    });
  };


  const sidebarItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Library, label: 'Library', path: '/dashboard/library' },
    { icon: Sparkles, label: 'Create', path: '/dashboard/create' },
    { icon: Gift, label: 'Reward & Earn', path: '/dashboard/rewards' },
    { icon: Upload, label: 'Upload', path: '/dashboard/upload' },
  ];

  const topNavItems = [
    { label: 'Heatmap', path: '/global-heatmap' },
    { label: 'Space', path: '/podcasts' },
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
      title: 'Trending Songs',
      layout: 'list',
      tracks: musicData.trendingSongs.slice(0, 20),
    },
    {
      title: 'Trending Remixes',
      layout: 'list',
      tracks: musicData.trendingRemixes.slice(0, 20),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      <audio ref={audioRef} />
      
      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Search Music</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Search for songs, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <div className="space-y-2">
            {searchResults.length === 0 && !searching && searchQuery && (
              <p className="text-xs text-muted-foreground text-center py-4">No tracks with previews found</p>
            )}
            {searchResults.map((result) => (
              <Card key={result.id} className="p-2 cursor-pointer hover:bg-accent/50" onClick={() => {
                handlePlay({ ...result, preview: result.preview });
                setSearchOpen(false);
              }}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img src={result.artwork} alt={result.title} className="w-10 h-10 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/src/assets/card-1.png'; }} />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded">
                      <Play className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{result.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{result.artist}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={(e) => handleSearchLike(result, e)} className="h-6 w-6">
                    <Heart className={`h-3 w-3 ${likedTracks.has(result.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
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
              <Button onClick={() => setSearchOpen(true)} variant="ghost" size="icon" className="h-8 w-8">
                <Search className="h-4 w-4" />
              </Button>
              <Link to="/dashboard/new-remix">
                <Button className="bg-black text-white hover:bg-black/90 text-xs px-2 sm:px-3 h-8">
                  <Plus className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">New Remix</span>
                </Button>
              </Link>
              {topNavItems.map((item) => (
                <Link key={item.label} to={item.path}>
                  <Button variant="ghost" className="text-xs h-8 px-2 sm:px-3 text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Button>
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 flex-shrink-0">
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
                            onClick={(e) => handleLike(track, e)}
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
                            handleLike(track, e);
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
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={skipToPrevTrack}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  className="h-8 w-8 bg-foreground text-background hover:bg-foreground/90 rounded-full"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={skipToNextTrack}>
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
