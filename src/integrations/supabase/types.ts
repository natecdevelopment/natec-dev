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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          message: string
          phone: string
          service: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          message: string
          phone: string
          service?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          message?: string
          phone?: string
          service?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string
          caption: string
          created_at: string
          file_name: string
          height: number | null
          id: string
          project_id: string | null
          public_url: string
          size_bytes: number | null
          sort_order: number
          storage_path: string | null
          title: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          caption?: string
          created_at?: string
          file_name?: string
          height?: number | null
          id?: string
          project_id?: string | null
          public_url: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          title?: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          caption?: string
          created_at?: string
          file_name?: string
          height?: number | null
          id?: string
          project_id?: string | null
          public_url?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string | null
          title?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_stages: {
        Row: {
          completed_on: string | null
          id: string
          note: string
          project_id: string
          sort_order: number
          stage: string
          status: string
        }
        Insert: {
          completed_on?: string | null
          id?: string
          note?: string
          project_id: string
          sort_order?: number
          stage: string
          status?: string
        }
        Update: {
          completed_on?: string | null
          id?: string
          note?: string
          project_id?: string
          sort_order?: number
          stage?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_stages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_units: {
        Row: {
          balconies: number | null
          bathrooms: number | null
          bedrooms: number | null
          id: string
          label: string
          note: string
          project_id: string
          size_sqft: number | null
          sort_order: number
        }
        Insert: {
          balconies?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          id?: string
          label?: string
          note?: string
          project_id: string
          size_sqft?: number | null
          sort_order?: number
        }
        Update: {
          balconies?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          id?: string
          label?: string
          note?: string
          project_id?: string
          size_sqft?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string
          availability: string
          building_type: string
          cover_media_id: string | null
          created_at: string
          description: string
          features: string[]
          flat_sizes: string
          handover_date: string
          id: string
          kind: string
          location_short: string
          map_url: string
          name: string
          progress_pct: number
          project_no: string
          published: boolean
          slug: string
          sort_order: number
          status: string
          total_flats: number | null
          total_floors: number | null
          units_per_floor: number | null
          updated_at: string
        }
        Insert: {
          address?: string
          availability?: string
          building_type?: string
          cover_media_id?: string | null
          created_at?: string
          description?: string
          features?: string[]
          flat_sizes?: string
          handover_date?: string
          id?: string
          kind?: string
          location_short?: string
          map_url?: string
          name: string
          progress_pct?: number
          project_no?: string
          published?: boolean
          slug: string
          sort_order?: number
          status?: string
          total_flats?: number | null
          total_floors?: number | null
          units_per_floor?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          availability?: string
          building_type?: string
          cover_media_id?: string | null
          created_at?: string
          description?: string
          features?: string[]
          flat_sizes?: string
          handover_date?: string
          id?: string
          kind?: string
          location_short?: string
          map_url?: string
          name?: string
          progress_pct?: number
          project_no?: string
          published?: boolean
          slug?: string
          sort_order?: number
          status?: string
          total_flats?: number | null
          total_floors?: number | null
          units_per_floor?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_cover_media_fk"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          id: string
          provider: string
          published: boolean
          sort_order: number
          thumbnail_url: string | null
          title: string
          url: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          url: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          published?: boolean
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          url?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
    Enums: {},
  },
} as const
