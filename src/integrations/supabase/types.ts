export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      badges: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          icon: string;
          id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          description: string;
          icon: string;
          id?: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      daily_questions: {
        Row: {
          active_date: string;
          created_at: string;
          id: string;
          question_id: string;
        };
        Insert: {
          active_date: string;
          created_at?: string;
          id?: string;
          question_id: string;
        };
        Update: {
          active_date?: string;
          created_at?: string;
          id?: string;
          question_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_questions_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      duels: {
        Row: {
          code: string;
          created_at: string;
          creator_answers: Json | null;
          creator_id: string;
          creator_name: string;
          creator_score: number | null;
          id: string;
          opponent_answers: Json | null;
          opponent_id: string | null;
          opponent_name: string | null;
          opponent_score: number | null;
          question_ids: string[];
          theme: Database["public"]["Enums"]["question_theme"];
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          creator_answers?: Json | null;
          creator_id: string;
          creator_name: string;
          creator_score?: number | null;
          id?: string;
          opponent_answers?: Json | null;
          opponent_id?: string | null;
          opponent_name?: string | null;
          opponent_score?: number | null;
          question_ids: string[];
          theme: Database["public"]["Enums"]["question_theme"];
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          creator_answers?: Json | null;
          creator_id?: string;
          creator_name?: string;
          creator_score?: number | null;
          id?: string;
          opponent_answers?: Json | null;
          opponent_id?: string | null;
          opponent_name?: string | null;
          opponent_score?: number | null;
          question_ids?: string[];
          theme?: Database["public"]["Enums"]["question_theme"];
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          audio_enabled: boolean;
          avatar: string;
          created_at: string;
          current_streak: number;
          display_name: string | null;
          font_size: string;
          high_contrast: boolean;
          id: string;
          last_play_date: string | null;
          longest_streak: number;
          music_enabled: boolean;
          sfx_enabled: boolean;
          total_xp: number;
          updated_at: string;
        };
        Insert: {
          audio_enabled?: boolean;
          avatar?: string;
          created_at?: string;
          current_streak?: number;
          display_name?: string | null;
          font_size?: string;
          high_contrast?: boolean;
          id: string;
          last_play_date?: string | null;
          longest_streak?: number;
          music_enabled?: boolean;
          sfx_enabled?: boolean;
          total_xp?: number;
          updated_at?: string;
        };
        Update: {
          audio_enabled?: boolean;
          avatar?: string;
          created_at?: string;
          current_streak?: number;
          display_name?: string | null;
          font_size?: string;
          high_contrast?: boolean;
          id?: string;
          last_play_date?: string | null;
          longest_streak?: number;
          music_enabled?: boolean;
          sfx_enabled?: boolean;
          total_xp?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          choices: Json;
          correct_index: number;
          created_at: string;
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          explanation: string;
          id: string;
          is_active: boolean;
          question: string;
          theme: Database["public"]["Enums"]["question_theme"];
        };
        Insert: {
          choices: Json;
          correct_index: number;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["question_difficulty"];
          explanation: string;
          id?: string;
          is_active?: boolean;
          question: string;
          theme: Database["public"]["Enums"]["question_theme"];
        };
        Update: {
          choices?: Json;
          correct_index?: number;
          created_at?: string;
          difficulty?: Database["public"]["Enums"]["question_difficulty"];
          explanation?: string;
          id?: string;
          is_active?: boolean;
          question?: string;
          theme?: Database["public"]["Enums"]["question_theme"];
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          completed_at: string;
          id: string;
          mode: string;
          question_ids: string[];
          score: number;
          theme: Database["public"]["Enums"]["question_theme"] | null;
          total_questions: number;
          user_id: string;
        };
        Insert: {
          answers: Json;
          completed_at?: string;
          id?: string;
          mode: string;
          question_ids: string[];
          score: number;
          theme?: Database["public"]["Enums"]["question_theme"] | null;
          total_questions: number;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string;
          id?: string;
          mode?: string;
          question_ids?: string[];
          score?: number;
          theme?: Database["public"]["Enums"]["question_theme"] | null;
          total_questions?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: string;
          earned_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          badge_id: string;
          earned_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          badge_id?: string;
          earned_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      award_badge: { Args: { _badge_code: string }; Returns: boolean };
      check_answer: {
        Args: { _question_id: string; _chosen: number };
        Returns: {
          correct: boolean;
          correct_index: number;
          explanation: string;
        }[];
      };
      get_active_question_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          theme: Database["public"]["Enums"]["question_theme"];
          total: number;
        }[];
      };
      get_playable_questions: {
        Args: {
          _theme?: Database["public"]["Enums"]["question_theme"] | null;
          _ids?: string[] | null;
          _limit?: number | null;
        };
        Returns: {
          id: string;
          theme: Database["public"]["Enums"]["question_theme"];
          difficulty: Database["public"]["Enums"]["question_difficulty"];
          question: string;
          choices: Json;
          explanation: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "moderator" | "user";
      question_difficulty: "facile" | "moyen" | "difficile";
      question_theme: "vocabulaire" | "reseaux_sociaux" | "culture_pop" | "tech";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      question_difficulty: ["facile", "moyen", "difficile"],
      question_theme: ["vocabulaire", "reseaux_sociaux", "culture_pop", "tech"],
    },
  },
} as const;
