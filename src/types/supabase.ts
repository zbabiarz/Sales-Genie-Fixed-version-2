export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      call_recordings: {
        Row: {
          analysis_results: Json | null;
          created_at: string | null;
          file_name: string;
          file_path: string | null;
          file_size: number | null;
          file_type: string | null;
          id: string;
          status: string | null;
          transcript: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          analysis_results?: Json | null;
          created_at?: string | null;
          file_name: string;
          file_path?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          status?: string | null;
          transcript?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          analysis_results?: Json | null;
          created_at?: string | null;
          file_name?: string;
          file_path?: string | null;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          status?: string | null;
          transcript?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_recordings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          role: string;
          thread_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          role?: string;
          thread_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      client_selected_plans: {
        Row: {
          client_id: string;
          created_at: string | null;
          id: string;
          insurance_plan_id: string;
          updated_at: string | null;
        };
        Insert: {
          client_id: string;
          created_at?: string | null;
          id?: string;
          insurance_plan_id: string;
          updated_at?: string | null;
        };
        Update: {
          client_id?: string;
          created_at?: string | null;
          id?: string;
          insurance_plan_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_selected_plans_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_selected_plans_insurance_plan_id_fkey";
            columns: ["insurance_plan_id"];
            isOneToOne: false;
            referencedRelation: "insurance_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          created_at: string | null;
          date_of_birth: string;
          full_name: string;
          gender: string | null;
          health_conditions: string[] | null;
          height: number | null;
          height_feet: number | null;
          height_inches: number | null;
          id: string;
          medications: string[] | null;
          state: string;
          updated_at: string | null;
          user_id: string;
          weight: number | null;
          zip_code: string;
        };
        Insert: {
          created_at?: string | null;
          date_of_birth: string;
          full_name: string;
          gender?: string | null;
          health_conditions?: string[] | null;
          height?: number | null;
          height_feet?: number | null;
          height_inches?: number | null;
          id?: string;
          medications?: string[] | null;
          state: string;
          updated_at?: string | null;
          user_id: string;
          weight?: number | null;
          zip_code: string;
        };
        Update: {
          created_at?: string | null;
          date_of_birth?: string;
          full_name?: string;
          gender?: string | null;
          health_conditions?: string[] | null;
          height?: number | null;
          height_feet?: number | null;
          height_inches?: number | null;
          id?: string;
          medications?: string[] | null;
          state?: string;
          updated_at?: string | null;
          user_id?: string;
          weight?: number | null;
          zip_code?: string;
        };
        Relationships: [];
      };
      dependents: {
        Row: {
          client_id: string;
          created_at: string | null;
          date_of_birth: string;
          full_name: string;
          gender: string | null;
          health_conditions: string[] | null;
          height: number | null;
          height_feet: number | null;
          height_inches: number | null;
          id: string;
          medications: string[] | null;
          relationship: string;
          updated_at: string | null;
          weight: number | null;
        };
        Insert: {
          client_id: string;
          created_at?: string | null;
          date_of_birth: string;
          full_name: string;
          gender?: string | null;
          health_conditions?: string[] | null;
          height?: number | null;
          height_feet?: number | null;
          height_inches?: number | null;
          id?: string;
          medications?: string[] | null;
          relationship: string;
          updated_at?: string | null;
          weight?: number | null;
        };
        Update: {
          client_id?: string;
          created_at?: string | null;
          date_of_birth?: string;
          full_name?: string;
          gender?: string | null;
          health_conditions?: string[] | null;
          height?: number | null;
          height_feet?: number | null;
          height_inches?: number | null;
          id?: string;
          medications?: string[] | null;
          relationship?: string;
          updated_at?: string | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "dependents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      health_conditions: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      insurance_plans: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          gender: string | null;
          height_feet_max: number | null;
          height_feet_min: number | null;
          height_inches_max: number | null;
          height_inches_min: number | null;
          id: string;
          is_popular: boolean | null;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          height_feet_max?: number | null;
          height_feet_min?: number | null;
          height_inches_max?: number | null;
          height_inches_min?: number | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          height_feet_max?: number | null;
          height_feet_min?: number | null;
          height_inches_max?: number | null;
          height_inches_min?: number | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicat_6: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          gender: string | null;
          id: string;
          is_popular: boolean | null;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicate: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          available_zip_codes: string[] | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          id: string;
          max_height_feet: number | null;
          max_height_inches: number | null;
          max_weight: number | null;
          min_height_feet: number | null;
          min_height_inches: number | null;
          min_weight: number | null;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          available_zip_codes?: string[] | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          id?: string;
          max_height_feet?: number | null;
          max_height_inches?: number | null;
          max_weight?: number | null;
          min_height_feet?: number | null;
          min_height_inches?: number | null;
          min_weight?: number | null;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          available_zip_codes?: string[] | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          id?: string;
          max_height_feet?: number | null;
          max_height_inches?: number | null;
          max_weight?: number | null;
          min_height_feet?: number | null;
          min_height_inches?: number | null;
          min_weight?: number | null;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicate_2: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          available_zip_codes: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          id: string;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          available_zip_codes?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          id?: string;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          available_zip_codes?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          id?: string;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicate_3: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          gender: string | null;
          id: string;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicate_4: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          gender: string | null;
          id: string;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      insurance_plans_duplicate_5: {
        Row: {
          age_range: string | null;
          available_states: string[] | null;
          build_chart_jsonb: Json | null;
          company_name: string;
          coverage_type: string | null;
          created_at: string | null;
          disqualifying_health_conditions: string[] | null;
          disqualifying_medications: string[] | null;
          gender: string | null;
          id: string;
          is_popular: boolean | null;
          product_benefits: string | null;
          product_category: string;
          product_name: string;
          product_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category: string;
          product_name: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          age_range?: string | null;
          available_states?: string[] | null;
          build_chart_jsonb?: Json | null;
          company_name?: string;
          coverage_type?: string | null;
          created_at?: string | null;
          disqualifying_health_conditions?: string[] | null;
          disqualifying_medications?: string[] | null;
          gender?: string | null;
          id?: string;
          is_popular?: boolean | null;
          product_benefits?: string | null;
          product_category?: string;
          product_name?: string;
          product_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          amount: number | null;
          cancel_at_period_end: boolean | null;
          canceled_at: number | null;
          created_at: string;
          currency: string | null;
          current_period_end: number | null;
          current_period_start: number | null;
          custom_field_data: Json | null;
          customer_cancellation_comment: string | null;
          customer_cancellation_reason: string | null;
          customer_id: string | null;
          ended_at: number | null;
          ends_at: number | null;
          id: string;
          interval: string | null;
          metadata: Json | null;
          price_id: string | null;
          started_at: number | null;
          status: string | null;
          stripe_id: string | null;
          stripe_price_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          amount?: number | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: number | null;
          created_at?: string;
          currency?: string | null;
          current_period_end?: number | null;
          current_period_start?: number | null;
          custom_field_data?: Json | null;
          customer_cancellation_comment?: string | null;
          customer_cancellation_reason?: string | null;
          customer_id?: string | null;
          ended_at?: number | null;
          ends_at?: number | null;
          id?: string;
          interval?: string | null;
          metadata?: Json | null;
          price_id?: string | null;
          started_at?: number | null;
          status?: string | null;
          stripe_id?: string | null;
          stripe_price_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          amount?: number | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: number | null;
          created_at?: string;
          currency?: string | null;
          current_period_end?: number | null;
          current_period_start?: number | null;
          custom_field_data?: Json | null;
          customer_cancellation_comment?: string | null;
          customer_cancellation_reason?: string | null;
          customer_id?: string | null;
          ended_at?: number | null;
          ends_at?: number | null;
          id?: string;
          interval?: string | null;
          metadata?: Json | null;
          price_id?: string | null;
          started_at?: number | null;
          status?: string | null;
          stripe_id?: string | null;
          stripe_price_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_activity: {
        Row: {
          activity_type: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          credits: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          image: string | null;
          name: string | null;
          openai_thread_id: string | null;
          subscription: string | null;
          token_identifier: string;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          credits?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          image?: string | null;
          name?: string | null;
          openai_thread_id?: string | null;
          subscription?: string | null;
          token_identifier: string;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          credits?: string | null;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          image?: string | null;
          name?: string | null;
          openai_thread_id?: string | null;
          subscription?: string | null;
          token_identifier?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          created_at: string;
          data: Json | null;
          event_type: string;
          id: string;
          modified_at: string;
          stripe_event_id: string | null;
          type: string;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          event_type: string;
          id?: string;
          modified_at?: string;
          stripe_event_id?: string | null;
          type: string;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          event_type?: string;
          id?: string;
          modified_at?: string;
          stripe_event_id?: string | null;
          type?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      execute_sql: {
        Args: { sql: string };
        Returns: undefined;
      };
      is_age_in_range: {
        Args: { client_age: number; age_range: string };
        Returns: boolean;
      };
      log_user_activity: {
        Args: { p_user_id: string; p_activity_type: string; p_details?: Json };
        Returns: string;
      };
      test_age_range_matching: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age: number;
          range: string;
          matches: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
