import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Star, TrendingUp, TrendingDown, ExternalLink, Share2, Play, Pause,
  Users, Clock, ChevronDown, Copy, Music, ChevronLeft, ChevronRight, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTrackDetail } from '@/hooks/useHeatmapData';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

// Platform icons
const SpotifyIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

const AppleMusicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C21.003.517 20.373.285 19.7.164c-.517-.093-1.038-.135-1.564-.15-.04-.003-.083-.01-.124-.013H5.988c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81.84-.553 1.472-1.287 1.88-2.208.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.004-11.392z"/>
  </svg>
);

const DeezerIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38H6.27zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.594v3.027h5.189v-3.027H6.27zm6.271 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03H6.27zm6.271 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z"/>
  </svg>
);

const AudiusIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 14.656c-.164.238-.41.376-.688.376H6.794c-.278 0-.524-.138-.688-.376-.164-.238-.205-.537-.114-.815l2.55-6.967c.123-.336.447-.56.802-.56h5.312c.355 0 .679.224.802.56l2.55 6.967c.091.278.05.577-.114.815z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const HeatmapDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('charts');
  const [timeRange, setTimeRange] = useState('7D');
  
  
  const { track, loading, error } = useTrackDetail(id);
  const { playTrack: globalPlayTrack, pauseTrack: globalPauseTrack, currentTrack, isPlaying: globalIsPlaying } = useAudioPlayer();

  // Real-time updates simulation
  const [realtimeListeners, setRealtimeListeners] = useState(0);
  const [realtimeMindshare, setRealtimeMindshare] = useState(0);
  
  useEffect(() => {
    if (track) {
      setRealtimeListeners(track.metrics.listeners);
      setRealtimeMindshare(track.metrics.mindshare);
    }
  }, [track]);

  useEffect(() => {
    if (!track) return;
    const interval = setInterval(() => {
      setRealtimeListeners(prev => Math.max(0, prev + Math.floor((Math.random() - 0.4) * 1000)));
      setRealtimeMindshare(prev => Math.max(0, parseFloat((prev + (Math.random() - 0.5) * 0.1).toFixed(1))));
    }, 3000);
    return () => clearInterval(interval);
  }, [track]);

  const handleInteraction = (action: string, callback?: () => void) => {
    if (!user) {
      toast.error('Please sign in to ' + action);
      navigate('/auth');
      return;
    }
    callback?.();
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = track ? `Check out ${track.title} by ${track.artist.name} on Bario!` : '';
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        return;
    }
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const playTrack = useCallback((previewUrl: string | null | undefined, trackId: string, title?: string, artist?: string, artwork?: string) => {
    console.log('Playing track:', { previewUrl, trackId, title });
    
    if (!previewUrl) {
      toast.error('No preview available - try streaming platforms', {
        action: {
          label: 'Open Deezer',
          onClick: () => window.open(track?.platforms?.deezer?.url || `https://www.deezer.com/track/${trackId}`, '_blank')
        }
      });
      return;
    }
    
    // Use global audio player for consistent experience
    const isCurrentlyPlaying = currentTrack?.id === trackId && globalIsPlaying;
    
    if (isCurrentlyPlaying) {
      globalPauseTrack();
      return;
    }
    
    // Play using global player
    globalPlayTrack({
      id: trackId,
      title: title || track?.title || 'Unknown Track',
      artist: artist || track?.artist?.name || 'Unknown Artist',
      audioUrl: previewUrl,
      coverUrl: artwork || track?.artwork,
      type: 'music'
    });
  }, [currentTrack, globalIsPlaying, globalPauseTrack, globalPlayTrack, track]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#4ade80] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading track details...</p>
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Track not found'}</p>
          <Button onClick={() => navigate('/global-heatmap')} className="bg-white text-black">
            Back to Heatmap
          </Button>
        </div>
      </div>
    );
  }

  // Check if current track is playing via global player
  const isTrackPlaying = (trackId: string) => currentTrack?.id === trackId && globalIsPlaying;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center justify-between h-12 sm:h-14 px-3 sm:px-6">
          <button onClick={() => navigate('/global-heatmap')} className="flex items-center gap-1.5 text-white/60 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-3 rounded-lg font-medium">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] sm:text-xs h-7 sm:h-8 px-3 rounded-lg font-medium">
                  Log In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-16 pb-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Sidebar - Song Info */}
            <div className="lg:col-span-3 space-y-4">
              <Card className="bg-white/[0.02] border-white/5 p-4">
                {/* Track Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative group">
                    <img src={track.artwork} alt={track.title} className="w-16 h-16 rounded-xl object-cover" />
                    <button
                      onClick={() => playTrack(track.previewUrl, track.id, track.title, track.artist.name, track.artwork)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                    >
                      {isTrackPlaying(track.id) ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-sm sm:text-base font-bold text-white truncate">{track.title}</h1>
                    <p className="text-[10px] text-white/50">{track.artist.name}</p>
                    <p className="text-[9px] text-white/40">{track.album}</p>
                  </div>
                </div>
                
                <p className="text-[10px] text-white/60 mb-4 line-clamp-3">{track.description}</p>
                
                {/* Tags */}
                {track.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {track.tags.slice(0, 4).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[8px] text-white/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Streaming Platforms */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
                  <a href={track.platforms.spotify.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 transition-colors text-[#1DB954]">
                    <SpotifyIcon />
                  </a>
                  <a href={track.platforms.appleMusic.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FA243C]/20 hover:bg-[#FA243C]/30 transition-colors text-[#FA243C]">
                    <AppleMusicIcon />
                  </a>
                  <a href={track.platforms.deezer.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEAA2D]/20 hover:bg-[#FEAA2D]/30 transition-colors text-[#FEAA2D]">
                    <DeezerIcon />
                  </a>
                  <a href={track.platforms.youtube.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF0000]/20 hover:bg-[#FF0000]/30 transition-colors text-[#FF0000]">
                    <YouTubeIcon />
                  </a>
                  <a href={track.platforms.audius.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-8 h-8 rounded-full bg-[#CC0FE0]/20 hover:bg-[#CC0FE0]/30 transition-colors text-[#CC0FE0]">
                    <AudiusIcon />
                  </a>
                </div>
                
                {/* Community Listeners */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] text-white/50">Community listeners</span>
                    <span className="text-[9px] text-white/40">{formatNumber(track.metrics.communityListeners)} active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#4ade80] rounded-full" style={{ width: '87%' }} />
                    </div>
                    <span className="text-[9px] text-[#4ade80]">87%</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Listeners</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-medium text-white">{formatNumber(realtimeListeners)}</span>
                      <span className="text-[7px] text-[#4ade80] animate-pulse">● LIVE</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Mindshare</span>
                    <span className="text-[9px] text-white">{realtimeMindshare.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 24h</span>
                    <span className={`text-[9px] ${track.metrics.change24h >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {track.metrics.change24h >= 0 ? '+' : ''}{track.metrics.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-white/40">Δ 7D</span>
                    <span className={`text-[9px] ${track.metrics.change7d >= 0 ? 'text-[#4ade80]' : 'text-red-400'}`}>
                      {track.metrics.change7d >= 0 ? '+' : ''}{track.metrics.change7d.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1 h-8 text-[9px] bg-[#4ade80] text-black hover:bg-[#4ade80]/90"
                    onClick={() => handleInteraction('add to watchlist')}
                  >
                    <Star className="h-3 w-3 mr-1" /> Watch
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 h-8 text-[9px] border-white/10 text-white hover:bg-white/5">
                        <Share2 className="h-3 w-3 mr-1" /> Share
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleShare('twitter')} className="text-xs">Share to X</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="text-xs">Share to WhatsApp</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="text-xs">Copy Link</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            </div>

            {/* Center - Charts & Artist Top Tracks */}
            <div className="lg:col-span-6 space-y-4">
              {/* Chart */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[11px] font-medium text-white">Listener Activity (30 Days)</h3>
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    {['7D', '30D', '90D'].map(t => (
                      <button
                        key={t}
                        onClick={() => setTimeRange(t)}
                        className={`text-[8px] px-2 py-0.5 rounded ${timeRange === t ? 'bg-[#4ade80] text-black' : 'text-white/50'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-32 flex items-end gap-1">
                  {track.chartData.slice(-20).map((point, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-[#4ade80]/50 rounded-t hover:bg-[#4ade80] transition-colors"
                        style={{ height: `${(point.listeners / Math.max(...track.chartData.map(d => d.listeners))) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Artist Top 10 Tracks */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[11px] font-medium text-white mb-3">
                  {track.artist.name}'s Top Tracks - Platform Rankings
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[8px] text-white/40 border-b border-white/5">
                        <th className="text-left py-2 pr-2">#</th>
                        <th className="text-left py-2">Track</th>
                        <th className="text-center py-2">
                          <SpotifyIcon />
                        </th>
                        <th className="text-center py-2">
                          <DeezerIcon />
                        </th>
                        <th className="text-center py-2">
                          <AppleMusicIcon />
                        </th>
                        <th className="text-right py-2">Listeners</th>
                      </tr>
                    </thead>
                    <tbody>
                      {track.artist.topTracks.map((t) => (
                        <tr 
                          key={t.id} 
                          className="text-[9px] border-b border-white/5 hover:bg-white/5 cursor-pointer group"
                          onClick={() => navigate(`/global-heatmap/${t.id}`)}
                        >
                          <td className="py-2 pr-2 text-white/40">{t.rank}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <img src={t.artwork} alt="" className="w-8 h-8 rounded object-cover" />
                                <button
                                  onClick={(e) => { e.stopPropagation(); playTrack(t.previewUrl, t.id, t.title, track.artist.name, t.artwork); }}
                                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                >
                                  {isTrackPlaying(t.id) ? (
                                    <Pause className="h-3 w-3 text-white" />
                                  ) : (
                                    <Play className="h-3 w-3 text-white" />
                                  )}
                                </button>
                              </div>
                              <div className="truncate max-w-[120px]">
                                <p className="text-white truncate">{t.title}</p>
                                <p className="text-white/40 text-[8px] truncate">{t.album}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 text-center text-[#1DB954]">#{t.spotifyRank}</td>
                          <td className="py-2 text-center text-[#FEAA2D]">#{t.deezerRank}</td>
                          <td className="py-2 text-center text-[#FA243C]">#{t.appleMusicRank}</td>
                          <td className="py-2 text-right text-white/60">{formatNumber(t.listeners)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Artist Profile */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[11px] font-medium text-white mb-3">About Artist</h3>
                <div className="flex items-start gap-4">
                  <img src={track.artist.image} alt={track.artist.name} className="w-20 h-20 rounded-full object-cover" />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">{track.artist.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-[9px] text-white/50">
                      <span>{formatNumber(track.artist.monthlyListeners)} monthly listeners</span>
                      <span>{formatNumber(track.artist.followers)} followers</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {track.artist.genres.slice(0, 3).map((genre, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white/5 rounded-full text-[8px] text-white/50">
                          {genre}
                        </span>
                      ))}
                    </div>
                    <p className="text-[9px] text-white/60 mt-2 line-clamp-3">{track.artist.bio}</p>
                    
                    {/* Artist Streaming Platforms */}
                    <div className="flex items-center gap-2 mt-3">
                      <a href={track.artist.spotifyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-[#1DB954]/20 rounded text-[8px] text-[#1DB954] hover:bg-[#1DB954]/30">
                        <SpotifyIcon /> Spotify
                      </a>
                      <a href={track.platforms.youtube.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 bg-[#FF0000]/20 rounded text-[8px] text-[#FF0000] hover:bg-[#FF0000]/30">
                        <YouTubeIcon /> YouTube
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Sidebar - Related Tracks */}
            <div className="lg:col-span-3 space-y-4">
              {/* Related Tracks */}
              <Card className="bg-white/[0.02] border-white/5 p-4">
                <h3 className="text-[10px] font-medium text-white mb-3">Related Tracks</h3>
                <div className="space-y-2">
                  {track.relatedTracks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/global-heatmap/${t.id}`)}
                      className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer group"
                    >
                      <div className="relative">
                        <img src={t.artwork} alt="" className="w-10 h-10 rounded object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); playTrack(t.previewUrl, t.id, t.title, t.artist || track.artist.name, t.artwork); }}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                        >
                          {isTrackPlaying(t.id) ? (
                            <Pause className="h-3 w-3 text-white" />
                          ) : (
                            <Play className="h-3 w-3 text-white" />
                          )}
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-white truncate">{t.title}</p>
                        <p className="text-[8px] text-white/40">{formatNumber(t.listeners)} listeners</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HeatmapDetail;
