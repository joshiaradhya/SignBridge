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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          criteria_type: string
          criteria_value: number
          description: string
          icon: string
          id: string
          name: string
          order_index: number
        }
        Insert: {
          code: string
          criteria_type: string
          criteria_value?: number
          description: string
          icon?: string
          id?: string
          name: string
          order_index?: number
        }
        Update: {
          code?: string
          criteria_type?: string
          criteria_value?: number
          description?: string
          icon?: string
          id?: string
          name?: string
          order_index?: number
        }
        Relationships: []
      }
      attempts: {
        Row: {
          confidence: number
          created_at: string
          feedback: string
          id: string
          sign_id: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          feedback?: string
          id?: string
          sign_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          feedback?: string
          id?: string
          sign_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_sign_id_fkey"
            columns: ["sign_id"]
            isOneToOne: false
            referencedRelation: "signs"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          created_at: string
          id: number
          payload: Json
          recipient_id: string
          room_id: string
          sender_id: string
          signal_type: string
        }
        Insert: {
          created_at?: string
          id?: number
          payload: Json
          recipient_id: string
          room_id: string
          sender_id: string
          signal_type: string
        }
        Update: {
          created_at?: string
          id?: number
          payload?: Json
          recipient_id?: string
          room_id?: string
          sender_id?: string
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      call_transcripts: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          matched_label: string | null
          room_id: string
          sender_id: string
          text: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          matched_label?: string | null
          room_id: string
          sender_id: string
          text: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          matched_label?: string | null
          room_id?: string
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_transcripts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          id: string
          language: string
          order_index: number
          slug: string
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          description?: string
          difficulty: string
          id?: string
          language: string
          order_index?: number
          slug: string
          title: string
          topic: string
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          language?: string
          order_index?: number
          slug?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          activity_date: string
          id: string
          lessons_completed: number
          practice_sessions: number
          user_id: string
        }
        Insert: {
          activity_date?: string
          id?: string
          lessons_completed?: number
          practice_sessions?: number
          user_id: string
        }
        Update: {
          activity_date?: string
          id?: string
          lessons_completed?: number
          practice_sessions?: number
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          body: string
          category: string
          created_at: string
          excerpt: string
          id: string
          order_index: number
          read_minutes: number
          slug: string
          title: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          excerpt: string
          id?: string
          order_index?: number
          read_minutes?: number
          slug: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          excerpt?: string
          id?: string
          order_index?: number
          read_minutes?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string | null
          created_at: string
          estimated_minutes: number
          id: string
          language: string
          order_index: number
          slug: string
          source: string
          summary: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          language: string
          order_index?: number
          slug: string
          source?: string
          summary: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          estimated_minutes?: number
          id?: string
          language?: string
          order_index?: number
          slug?: string
          source?: string
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      match_queue: {
        Row: {
          created_at: string
          id: string
          interests: Json
          language: string
          level: string
          room_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interests?: Json
          language?: string
          level?: string
          room_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interests?: Json
          language?: string
          level?: string
          room_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string
          best_streak: number
          created_at: string
          daily_goal: number
          display_name: string
          id: string
          last_active_date: string | null
          streak: number
          xp: number
        }
        Insert: {
          avatar_url?: string
          best_streak?: number
          created_at?: string
          daily_goal?: number
          display_name?: string
          id: string
          last_active_date?: string | null
          streak?: number
          xp?: number
        }
        Update: {
          avatar_url?: string
          best_streak?: number
          created_at?: string
          daily_goal?: number
          display_name?: string
          id?: string
          last_active_date?: string | null
          streak?: number
          xp?: number
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reported_id: string | null
          reporter_id: string
          room_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id: string
          room_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_participants: {
        Row: {
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          conversation_prompt: string | null
          created_at: string
          id: string
          mode: string
          room_code: string | null
          status: string
        }
        Insert: {
          conversation_prompt?: string | null
          created_at?: string
          id?: string
          mode?: string
          room_code?: string | null
          status?: string
        }
        Update: {
          conversation_prompt?: string | null
          created_at?: string
          id?: string
          mode?: string
          room_code?: string | null
          status?: string
        }
        Relationships: []
      }
      signs: {
        Row: {
          common_mistake: string
          expression: string
          gloss: string
          handshape: string
          id: string
          image_key: string
          lesson_id: string
          location: string
          meaning: string
          movement: string
          order_index: number
          slug: string
          steps: string[]
        }
        Insert: {
          common_mistake: string
          expression: string
          gloss: string
          handshape: string
          id?: string
          image_key: string
          lesson_id: string
          location: string
          meaning: string
          movement: string
          order_index?: number
          slug: string
          steps?: string[]
        }
        Update: {
          common_mistake?: string
          expression?: string
          gloss?: string
          handshape?: string
          id?: string
          image_key?: string
          lesson_id?: string
          location?: string
          meaning?: string
          movement?: string
          order_index?: number
          slug?: string
          steps?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "signs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      is_room_member: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
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
