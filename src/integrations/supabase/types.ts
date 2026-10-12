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
      agreements: {
        Row: {
          agent_id: string | null
          body: string
          created_at: string
          id: string
          payment_id: string
          property_id: string
          signed_at: string | null
          tenant_id: string
          tenant_signature: string | null
        }
        Insert: {
          agent_id?: string | null
          body: string
          created_at?: string
          id?: string
          payment_id: string
          property_id: string
          signed_at?: string | null
          tenant_id: string
          tenant_signature?: string | null
        }
        Update: {
          agent_id?: string | null
          body?: string
          created_at?: string
          id?: string
          payment_id?: string
          property_id?: string
          signed_at?: string | null
          tenant_id?: string
          tenant_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          property_id: string
          scheduled_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          property_id: string
          scheduled_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          property_id?: string
          scheduled_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          agency_fee: number
          agent_commission: number
          agent_id: string | null
          agreement_fee: number
          caution_fee: number
          created_at: string
          dispute_reason: string | null
          id: string
          landlord_payout: number
          paid_at: string | null
          platform_fee: number
          property_id: string
          reference: string | null
          released_at: string | null
          rent: number
          status: string
          tenant_id: string
          total: number
        }
        Insert: {
          agency_fee?: number
          agent_commission?: number
          agent_id?: string | null
          agreement_fee?: number
          caution_fee?: number
          created_at?: string
          dispute_reason?: string | null
          id?: string
          landlord_payout?: number
          paid_at?: string | null
          platform_fee?: number
          property_id: string
          reference?: string | null
          released_at?: string | null
          rent?: number
          status?: string
          tenant_id: string
          total?: number
        }
        Update: {
          agency_fee?: number
          agent_commission?: number
          agent_id?: string | null
          agreement_fee?: number
          caution_fee?: number
          created_at?: string
          dispute_reason?: string | null
          id?: string
          landlord_payout?: number
          paid_at?: string | null
          platform_fee?: number
          property_id?: string
          reference?: string | null
          released_at?: string | null
          rent?: number
          status?: string
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          id_number: string | null
          institution: string | null
          next_of_kin: string | null
          occupation: string | null
          phone: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          id_number?: string | null
          institution?: string | null
          next_of_kin?: string | null
          occupation?: string | null
          phone?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          institution?: string | null
          next_of_kin?: string | null
          occupation?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          admin_note: string | null
          agency_fee: number
          agent_id: string | null
          agreement_fee: number
          amenities: string[]
          area: string | null
          bathrooms: number | null
          bedrooms: number | null
          caution_fee: number
          city: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          landlord_name: string | null
          landlord_phone: string | null
          near_institution: string | null
          property_type: string | null
          rent: number
          status: string
          title: string
          videos: string[]
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          agency_fee?: number
          agent_id?: string | null
          agreement_fee?: number
          amenities?: string[]
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          caution_fee?: number
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          landlord_name?: string | null
          landlord_phone?: string | null
          near_institution?: string | null
          property_type?: string | null
          rent?: number
          status?: string
          title: string
          videos?: string[]
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          agency_fee?: number
          agent_id?: string | null
          agreement_fee?: number
          amenities?: string[]
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          caution_fee?: number
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          landlord_name?: string | null
          landlord_phone?: string | null
          near_institution?: string | null
          property_type?: string | null
          rent?: number
          status?: string
          title?: string
          videos?: string[]
        }
        Relationships: []
      }
      property_contacts: {
        Row: {
          landlord_email: string | null
          landlord_name: string | null
          landlord_phone: string | null
          property_id: string
        }
        Insert: {
          landlord_email?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          property_id: string
        }
        Update: {
          landlord_email?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "property_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      property_catalog: {
        Row: {
          address: string | null
          agency_fee: number | null
          agent_id: string | null
          agreement_fee: number | null
          amenities: string[] | null
          area: string | null
          bathrooms: number | null
          bedrooms: number | null
          caution_fee: number | null
          city: string | null
          created_at: string | null
          description: string | null
          id: string | null
          images: string[] | null
          near_institution: string | null
          property_type: string | null
          rent: number | null
          status: string | null
          title: string | null
          videos: string[] | null
        }
        Insert: {
          address?: string | null
          agency_fee?: number | null
          agent_id?: string | null
          agreement_fee?: number | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          caution_fee?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          images?: string[] | null
          near_institution?: string | null
          property_type?: string | null
          rent?: number | null
          status?: string | null
          title?: string | null
          videos?: string[] | null
        }
        Update: {
          address?: string | null
          agency_fee?: number | null
          agent_id?: string | null
          agreement_fee?: number | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          caution_fee?: number | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          images?: string[] | null
          near_institution?: string | null
          property_type?: string | null
          rent?: number | null
          status?: string | null
          title?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "tenant"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "agent", "tenant"],
    },
  },
} as const
