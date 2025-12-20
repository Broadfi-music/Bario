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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
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
        Relationships: []
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
