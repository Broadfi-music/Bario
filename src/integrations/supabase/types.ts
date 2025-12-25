export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      heatmap_artists: {
        Row: {
          audius_id: string | null
          country: string | null
          created_at: string
          deezer_id: string | null
          followers: number | null
          id: string
          image_url: string | null
          itunes_id: string | null
          lastfm_mbid: string | null
          name: string
          spotify_id: string | null
          updated_at: string
        }
        Insert: {
          audius_id?: string | null
          country?: string | null
          created_at?: string
          deezer_id?: string | null
          followers?: number | null
          id?: string
          image_url?: string | null
          itunes_id?: string | null
          lastfm_mbid?: string | null
          name: string
          spotify_id?: string | null
          updated_at?: string
        }
        Update: {
          audius_id?: string | null
          country?: string | null
          created_at?: string
          deezer_id?: string | null
          followers?: number | null
          id?: string
          image_url?: string | null
          itunes_id?: string | null
          lastfm_mbid?: string | null
          name?: string
          spotify_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      heatmap_smart_feed_events: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          source: string | null
          title: string
          track_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          source?: string | null
          title: string
          track_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          source?: string | null
          title?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_smart_feed_events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "heatmap_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      heatmap_top_voices: {
        Row: {
          avatar_url: string | null
          created_at: string
          delta: number | null
          id: string
          name: string
          score: number | null
          type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          name: string
          score?: number | null
          type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          name?: string
          score?: number | null
          type?: string | null
        }
        Relationships: []
      }
      heatmap_track_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes: number | null
          sentiment: string | null
          track_id: string | null
          user_avatar: string | null
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes?: number | null
          sentiment?: string | null
          track_id?: string | null
          user_avatar?: string | null
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes?: number | null
          sentiment?: string | null
          track_id?: string | null
          user_avatar?: string | null
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_track_comments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "heatmap_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      heatmap_track_metrics: {
        Row: {
          attention_score: number | null
          attention_score_change_24h: number | null
          attention_score_change_7d: number | null
          audius_trending_rank: number | null
          country_code: string | null
          deezer_chart_position_country: number | null
          deezer_chart_position_global: number | null
          id: string
          lastfm_listeners: number | null
          lastfm_playcount: number | null
          mindshare: number | null
          spotify_popularity: number | null
          timestamp: string
          track_id: string | null
          youtube_view_count: number | null
        }
        Insert: {
          attention_score?: number | null
          attention_score_change_24h?: number | null
          attention_score_change_7d?: number | null
          audius_trending_rank?: number | null
          country_code?: string | null
          deezer_chart_position_country?: number | null
          deezer_chart_position_global?: number | null
          id?: string
          lastfm_listeners?: number | null
          lastfm_playcount?: number | null
          mindshare?: number | null
          spotify_popularity?: number | null
          timestamp?: string
          track_id?: string | null
          youtube_view_count?: number | null
        }
        Update: {
          attention_score?: number | null
          attention_score_change_24h?: number | null
          attention_score_change_7d?: number | null
          audius_trending_rank?: number | null
          country_code?: string | null
          deezer_chart_position_country?: number | null
          deezer_chart_position_global?: number | null
          id?: string
          lastfm_listeners?: number | null
          lastfm_playcount?: number | null
          mindshare?: number | null
          spotify_popularity?: number | null
          timestamp?: string
          track_id?: string | null
          youtube_view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_track_metrics_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "heatmap_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      heatmap_tracks: {
        Row: {
          album_name: string | null
          apple_url: string | null
          artist_id: string | null
          artist_name: string
          audius_id: string | null
          audius_url: string | null
          cover_image_url: string | null
          created_at: string
          deezer_id: string | null
          deezer_url: string | null
          duration_ms: number | null
          id: string
          isrc: string | null
          itunes_id: string | null
          lastfm_mbid: string | null
          preview_url: string | null
          primary_genre: string | null
          spotify_id: string | null
          spotify_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          album_name?: string | null
          apple_url?: string | null
          artist_id?: string | null
          artist_name: string
          audius_id?: string | null
          audius_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          deezer_id?: string | null
          deezer_url?: string | null
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          itunes_id?: string | null
          lastfm_mbid?: string | null
          preview_url?: string | null
          primary_genre?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          album_name?: string | null
          apple_url?: string | null
          artist_id?: string | null
          artist_name?: string
          audius_id?: string | null
          audius_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          deezer_id?: string | null
          deezer_url?: string | null
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          itunes_id?: string | null
          lastfm_mbid?: string | null
          preview_url?: string | null
          primary_genre?: string | null
          spotify_id?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heatmap_tracks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "heatmap_artists"
            referencedColumns: ["id"]
          },
        ]
      }
      host_playlist_tracks: {
        Row: {
          audio_url: string
          created_at: string
          duration_ms: number | null
          id: string
          playlist_id: string
          position: number
          title: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          playlist_id: string
          position?: number
          title: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          playlist_id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "host_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "host_playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      host_playlists: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          remix_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          remix_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          remix_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_remix_id_fkey"
            columns: ["remix_id"]
            isOneToOne: false
            referencedRelation: "remixes"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_banned_users: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          reason: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          reason?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          reason?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_banned_users_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_emoji: boolean | null
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_emoji?: boolean | null
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_emoji?: boolean | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_episodes: {
        Row: {
          audio_url: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_ms: number | null
          host_id: string
          id: string
          like_count: number | null
          play_count: number | null
          session_id: string | null
          title: string
        }
        Insert: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          host_id: string
          id?: string
          like_count?: number | null
          play_count?: number | null
          session_id?: string | null
          title: string
        }
        Update: {
          audio_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          host_id?: string
          id?: string
          like_count?: number | null
          play_count?: number | null
          session_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_episodes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_gifts: {
        Row: {
          created_at: string
          gift_type: string
          id: string
          points_value: number
          recipient_id: string
          sender_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gift_type: string
          id?: string
          points_value?: number
          recipient_id: string
          sender_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          gift_type?: string
          id?: string
          points_value?: number
          recipient_id?: string
          sender_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_gifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_participants: {
        Row: {
          hand_raised: boolean | null
          id: string
          is_muted: boolean | null
          joined_at: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          hand_raised?: boolean | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          hand_raised?: boolean | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_schedules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reminder_enabled: boolean | null
          scheduled_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reminder_enabled?: boolean | null
          scheduled_at: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reminder_enabled?: boolean | null
          scheduled_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      podcast_sessions: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_recording: boolean | null
          listener_count: number | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_recording?: boolean | null
          listener_count?: number | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_recording?: boolean | null
          listener_count?: number | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      prediction_votes: {
        Row: {
          created_at: string
          id: string
          prediction_id: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          prediction_id: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          prediction_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_votes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "user_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          current_session_id: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          soundcloud_url: string | null
          spotify_url: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          username: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_session_id?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          current_session_id?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_session_id_fkey"
            columns: ["current_session_id"]
            isOneToOne: false
            referencedRelation: "podcast_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      remixes: {
        Row: {
          album_art_url: string | null
          created_at: string
          genre: string | null
          id: string
          is_published: boolean | null
          like_count: number | null
          original_file_url: string | null
          play_count: number | null
          prompt: string | null
          remix_file_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          album_art_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          original_file_url?: string | null
          play_count?: number | null
          prompt?: string | null
          remix_file_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          album_art_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          original_file_url?: string | null
          play_count?: number | null
          prompt?: string | null
          remix_file_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          created_at: string
          description: string | null
          era: string | null
          error_message: string | null
          fx_config: Json | null
          genre: string
          id: string
          original_audio_url: string | null
          remix_audio_url: string | null
          status: string
          stems_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          era?: string | null
          error_message?: string | null
          fx_config?: Json | null
          genre: string
          id?: string
          original_audio_url?: string | null
          remix_audio_url?: string | null
          status?: string
          stems_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          era?: string | null
          error_message?: string | null
          fx_config?: Json | null
          genre?: string
          id?: string
          original_audio_url?: string | null
          remix_audio_url?: string | null
          status?: string
          stems_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_albums: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          genre: string | null
          id: string
          title: string
          track_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          title: string
          track_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          genre?: string | null
          id?: string
          title?: string
          track_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          artist_name: string
          cover_image_url: string | null
          created_at: string
          id: string
          preview_url: string | null
          source: string
          track_id: string
          track_title: string
          user_id: string
        }
        Insert: {
          artist_name: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          preview_url?: string | null
          source: string
          track_id: string
          track_title: string
          user_id: string
        }
        Update: {
          artist_name?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          preview_url?: string | null
          source?: string
          track_id?: string
          track_title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          artist_name: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          no_votes: number | null
          song_artwork: string | null
          song_id: string | null
          song_source: string | null
          song_title: string | null
          status: string | null
          title: string
          total_votes: number | null
          updated_at: string
          user_id: string
          yes_votes: number | null
        }
        Insert: {
          artist_name?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          no_votes?: number | null
          song_artwork?: string | null
          song_id?: string | null
          song_source?: string | null
          song_title?: string | null
          status?: string | null
          title: string
          total_votes?: number | null
          updated_at?: string
          user_id: string
          yes_votes?: number | null
        }
        Update: {
          artist_name?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          no_votes?: number | null
          song_artwork?: string | null
          song_id?: string | null
          song_source?: string | null
          song_title?: string | null
          status?: string | null
          title?: string
          total_votes?: number | null
          updated_at?: string
          user_id?: string
          yes_votes?: number | null
        }
        Relationships: []
      }
      user_uploads: {
        Row: {
          album_id: string | null
          apple_url: string | null
          audio_url: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          duration_ms: number | null
          genre: string | null
          id: string
          is_published: boolean | null
          like_count: number | null
          play_count: number | null
          soundcloud_url: string | null
          spotify_url: string | null
          title: string
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          album_id?: string | null
          apple_url?: string | null
          audio_url: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          play_count?: number | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          title: string
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          album_id?: string | null
          apple_url?: string | null
          audio_url?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          duration_ms?: number | null
          genre?: string | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          play_count?: number | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
