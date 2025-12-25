import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlaylistTrack {
  id: string;
  audio_url: string;
  title: string;
  duration_ms: number | null;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  tracks: PlaylistTrack[];
  created_at: string;
}

export const useHostPlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPlaylists();
    }
  }, [user]);

  const fetchPlaylists = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('host_playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (playlistsError) throw playlistsError;

      const playlistsWithTracks: Playlist[] = [];
      
      for (const playlist of playlistsData || []) {
        const { data: tracksData } = await supabase
          .from('host_playlist_tracks')
          .select('*')
          .eq('playlist_id', playlist.id)
          .order('position', { ascending: true });

        playlistsWithTracks.push({
          id: playlist.id,
          name: playlist.name,
          created_at: playlist.created_at,
          tracks: (tracksData || []).map(t => ({
            id: t.id,
            audio_url: t.audio_url,
            title: t.title,
            duration_ms: t.duration_ms,
            position: t.position
          }))
        });
      }

      setPlaylists(playlistsWithTracks);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async (name: string): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to create playlists');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('host_playlists')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;

      setPlaylists(prev => [{
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        tracks: []
      }, ...prev]);

      toast.success(`Playlist "${name}" created!`);
      return data.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error('Failed to create playlist');
      return null;
    }
  };

  const addTrackToPlaylist = async (
    playlistId: string,
    track: { audio_url: string; title: string; duration_ms?: number }
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const playlist = playlists.find(p => p.id === playlistId);
      const position = playlist ? playlist.tracks.length : 0;

      const { data, error } = await supabase
        .from('host_playlist_tracks')
        .insert({
          playlist_id: playlistId,
          audio_url: track.audio_url,
          title: track.title,
          duration_ms: track.duration_ms || null,
          position
        })
        .select()
        .single();

      if (error) throw error;

      setPlaylists(prev => prev.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: [...p.tracks, {
              id: data.id,
              audio_url: data.audio_url,
              title: data.title,
              duration_ms: data.duration_ms,
              position: data.position
            }]
          };
        }
        return p;
      }));

      toast.success('Track added to playlist!');
      return true;
    } catch (error) {
      console.error('Error adding track:', error);
      toast.error('Failed to add track');
      return false;
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('host_playlist_tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      setPlaylists(prev => prev.map(p => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.filter(t => t.id !== trackId)
          };
        }
        return p;
      }));

      toast.success('Track removed');
      return true;
    } catch (error) {
      console.error('Error removing track:', error);
      toast.error('Failed to remove track');
      return false;
    }
  };

  const deletePlaylist = async (playlistId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('host_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      toast.success('Playlist deleted');
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error('Failed to delete playlist');
      return false;
    }
  };

  const renamePlaylist = async (playlistId: string, newName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('host_playlists')
        .update({ name: newName })
        .eq('id', playlistId);

      if (error) throw error;

      setPlaylists(prev => prev.map(p => 
        p.id === playlistId ? { ...p, name: newName } : p
      ));

      toast.success('Playlist renamed');
      return true;
    } catch (error) {
      console.error('Error renaming playlist:', error);
      toast.error('Failed to rename playlist');
      return false;
    }
  };

  return {
    playlists,
    loading,
    createPlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    deletePlaylist,
    renamePlaylist,
    refreshPlaylists: fetchPlaylists
  };
};
