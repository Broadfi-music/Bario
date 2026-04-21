import { useEffect, useState } from 'react';
import { Music2, Play, Pause, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';

interface ProjectTrack {
  id: string;
  title: string;
  genre: string;
  audioUrl: string;
  coverUrl: string | null;
  createdAt: string;
}

const UserProjects = () => {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudioPlayer();
  const [tracks, setTracks] = useState<ProjectTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select('id, description, genre, remix_audio_url, fx_config, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('remix_audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(24);

    const rows: ProjectTrack[] = (data || [])
      .filter((row: any) => !!row.remix_audio_url)
      .map((row: any) => ({
        id: row.id,
        title: row.description || row.genre || 'Untitled track',
        genre: row.genre || 'AI',
        audioUrl: row.remix_audio_url as string,
        coverUrl: (row.fx_config && (row.fx_config as any).cover_url) || null,
        createdAt: row.created_at,
      }));

    setTracks(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!user) return;

    const channel = supabase
      .channel(`user-projects-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracks', filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!user) return null;

  if (loading) {
    return (
      <section className="max-w-5xl mx-auto px-4 mt-4">
        <h2 className="text-sm md:text-base font-bold text-white mb-1.5">Your projects</h2>
        <div className="flex items-center gap-2 text-white/40 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading projects…
        </div>
      </section>
    );
  }

  if (tracks.length === 0) {
    return (
      <section className="max-w-5xl mx-auto px-4 mt-4">
        <h2 className="text-sm md:text-base font-bold text-white mb-1.5">Your projects</h2>
        <div className="border border-white/10 rounded-xl p-4 text-center">
          <Music2 className="h-6 w-6 mx-auto mb-1 text-white/30" />
          <p className="text-xs text-white/50">No projects yet — generate a track above.</p>
        </div>
      </section>
    );
  }

  const togglePlay = (track: ProjectTrack) => {
    const id = `project-${track.id}`;
    if (currentTrack?.id === id && isPlaying) {
      pauseTrack();
      return;
    }
    playTrack({
      id,
      title: track.title,
      artist: track.genre,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl || undefined,
      type: 'music',
    });
  };

  return (
    <section className="max-w-5xl mx-auto px-4 mt-4">
      <div className="flex items-center justify-between mb-1.5">
        <h2 className="text-sm md:text-base font-bold text-white">Your projects</h2>
        <span className="text-[10px] text-white/30">{tracks.length} track{tracks.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {tracks.map((track) => {
          const id = `project-${track.id}`;
          const isThis = currentTrack?.id === id && isPlaying;
          return (
            <button
              key={track.id}
              onClick={() => togglePlay(track)}
              className="group text-left bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden transition-colors border border-white/5"
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-700/30 to-pink-600/20">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="h-8 w-8 text-white/40" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black">
                    {isThis ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </span>
                </div>
              </div>
              <div className="p-2">
                <p className="text-[11px] font-medium text-white truncate">{track.title}</p>
                <p className="text-[10px] text-white/40 truncate capitalize">{track.genre}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default UserProjects;
