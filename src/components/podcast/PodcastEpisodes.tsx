import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, Clock, Heart, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { toast } from 'sonner';

interface Episode {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  play_count: number;
  like_count: number;
  created_at: string;
  host_id: string;
}

const PodcastEpisodes = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudioPlayer();

  useEffect(() => {
    fetchEpisodes();
  }, []);

  const fetchEpisodes = async () => {
    const { data } = await supabase
      .from('podcast_episodes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setEpisodes(data);
    setLoading(false);
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayEpisode = async (episode: Episode) => {
    if (!episode.audio_url) {
      toast.error('This episode has no recorded audio');
      return;
    }

    // If this episode is already playing, pause it
    if (currentTrack?.id === episode.id && isPlaying) {
      pauseTrack();
      return;
    }

    // Play the episode using the global audio player
    console.log('🎧 Playing podcast episode:', episode.title, 'URL:', episode.audio_url);
    playTrack({
      id: episode.id,
      title: episode.title,
      artist: 'Podcast Episode',
      audioUrl: episode.audio_url,
      coverUrl: episode.cover_image_url || undefined,
      type: 'podcast'
    });
    toast.success(`Playing: ${episode.title}`);

    // Increment play count
    await supabase
      .from('podcast_episodes')
      .update({ play_count: (episode.play_count || 0) + 1 })
      .eq('id', episode.id);
  };

  const isEpisodePlaying = (episodeId: string) => {
    return currentTrack?.id === episodeId && isPlaying;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="text-center py-12 bg-white/5 rounded-xl">
        <p className="text-white/40">No episodes yet</p>
        <p className="text-xs text-white/20 mt-1">Host a live session to create episodes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
        >
          {/* Thumbnail */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            {episode.cover_image_url ? (
              <img
                src={episode.cover_image_url}
                alt={episode.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />
            )}
            <button
              onClick={() => handlePlayEpisode(episode)}
              disabled={!episode.audio_url}
              className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                episode.audio_url ? 'opacity-0 group-hover:opacity-100 cursor-pointer' : 'opacity-100 cursor-not-allowed'
              }`}
            >
              {!episode.audio_url ? (
                <span className="text-[8px] text-white/60">No audio</span>
              ) : isEpisodePlaying(episode.id) ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-1" />
              )}
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">{episode.title}</h4>
            {episode.description && (
              <p className="text-xs text-white/60 truncate">{episode.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/40">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(episode.duration_ms)}
              </span>
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {episode.play_count}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {episode.like_count}
              </span>
            </div>
          </div>

          {/* Actions */}
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default PodcastEpisodes;
