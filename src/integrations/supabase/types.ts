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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analysis_comments: {
        Row: {
          author_email: string | null
          author_name: string
          comment_text: string
          comment_type: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          item_id: string | null
          parent_id: string | null
          share_code: string
          updated_at: string | null
        }
        Insert: {
          author_email?: string | null
          author_name: string
          comment_text: string
          comment_type?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          parent_id?: string | null
          share_code: string
          updated_at?: string | null
        }
        Update: {
          author_email?: string | null
          author_name?: string
          comment_text?: string
          comment_type?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          item_id?: string | null
          parent_id?: string | null
          share_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "analysis_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          changes_ar: string[]
          changes_en: string[]
          created_at: string
          id: string
          is_latest: boolean | null
          release_date: string
          version: string
        }
        Insert: {
          changes_ar?: string[]
          changes_en?: string[]
          created_at?: string
          id?: string
          is_latest?: boolean | null
          release_date?: string
          version: string
        }
        Update: {
          changes_ar?: string[]
          changes_en?: string[]
          created_at?: string
          id?: string
          is_latest?: boolean | null
          release_date?: string
          version?: string
        }
        Relationships: []
      }
      comparison_reports: {
        Row: {
          comparison_data: Json
          created_at: string
          description: string | null
          id: string
          name: string
          project_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          comparison_data: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_ids: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          comparison_data?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_analysis: {
        Row: {
          admin_cost: number | null
          ai_analysis: Json | null
          ai_provider: string | null
          contingency_cost: number | null
          created_at: string
          currency: string | null
          equipment_cost: number | null
          id: string
          insurance_cost: number | null
          item_description: string
          item_id: string | null
          labor_cost: number | null
          materials_cost: number | null
          overhead_cost: number | null
          profit_amount: number | null
          profit_margin: number | null
          project_id: string | null
          quantity: number | null
          subcontractor_cost: number | null
          total_cost: number | null
          total_direct_cost: number | null
          total_indirect_cost: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_cost?: number | null
          ai_analysis?: Json | null
          ai_provider?: string | null
          contingency_cost?: number | null
          created_at?: string
          currency?: string | null
          equipment_cost?: number | null
          id?: string
          insurance_cost?: number | null
          item_description: string
          item_id?: string | null
          labor_cost?: number | null
          materials_cost?: number | null
          overhead_cost?: number | null
          profit_amount?: number | null
          profit_margin?: number | null
          project_id?: string | null
          quantity?: number | null
          subcontractor_cost?: number | null
          total_cost?: number | null
          total_direct_cost?: number | null
          total_indirect_cost?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_cost?: number | null
          ai_analysis?: Json | null
          ai_provider?: string | null
          contingency_cost?: number | null
          created_at?: string
          currency?: string | null
          equipment_cost?: number | null
          id?: string
          insurance_cost?: number | null
          item_description?: string
          item_id?: string | null
          labor_cost?: number | null
          materials_cost?: number | null
          overhead_cost?: number | null
          profit_amount?: number | null
          profit_margin?: number | null
          project_id?: string | null
          quantity?: number | null
          subcontractor_cost?: number | null
          total_cost?: number | null
          total_direct_cost?: number | null
          total_indirect_cost?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      item_costs: {
        Row: {
          admin: number | null
          ai_suggested_rate: number | null
          calculated_unit_price: number | null
          contingency: number | null
          created_at: string
          equipment: number | null
          equipment_operator: number | null
          general_labor: number | null
          id: string
          insurance: number | null
          materials: number | null
          overhead: number | null
          profit_margin: number | null
          project_item_id: string
          subcontractor: number | null
        }
        Insert: {
          admin?: number | null
          ai_suggested_rate?: number | null
          calculated_unit_price?: number | null
          contingency?: number | null
          created_at?: string
          equipment?: number | null
          equipment_operator?: number | null
          general_labor?: number | null
          id?: string
          insurance?: number | null
          materials?: number | null
          overhead?: number | null
          profit_margin?: number | null
          project_item_id: string
          subcontractor?: number | null
        }
        Update: {
          admin?: number | null
          ai_suggested_rate?: number | null
          calculated_unit_price?: number | null
          contingency?: number | null
          created_at?: string
          equipment?: number | null
          equipment_operator?: number | null
          general_labor?: number | null
          id?: string
          insurance?: number | null
          materials?: number | null
          overhead?: number | null
          profit_margin?: number | null
          project_item_id?: string
          subcontractor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_costs_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_extracted_texts: {
        Row: {
          created_at: string
          extracted_text: string
          file_name: string
          id: string
          page_count: number | null
          quotation_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_text: string
          file_name: string
          id?: string
          page_count?: number | null
          quotation_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_text?: string
          file_name?: string
          id?: string
          page_count?: number | null
          quotation_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_extracted_texts_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "price_quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quotations: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          currency: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          name: string
          project_id: string | null
          quotation_date: string | null
          status: string | null
          supplier_name: string | null
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          currency?: string | null
          file_name: string
          file_type?: string
          file_url: string
          id?: string
          name: string
          project_id?: string | null
          quotation_date?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          currency?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          project_id?: string | null
          quotation_date?: string | null
          status?: string | null
          supplier_name?: string | null
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_quotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_items: {
        Row: {
          ai_generated: boolean | null
          ai_reasoning: string | null
          boq_item_number: string
          category: string | null
          created_at: string | null
          delivery_date: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          lead_time_days: number | null
          order_date: string | null
          priority: string | null
          project_id: string | null
          quantity: number | null
          status: string | null
          suggested_suppliers: string[] | null
          unit: string | null
          updated_at: string | null
          user_id: string
          user_modified: boolean | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          boq_item_number: string
          category?: string | null
          created_at?: string | null
          delivery_date?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          lead_time_days?: number | null
          order_date?: string | null
          priority?: string | null
          project_id?: string | null
          quantity?: number | null
          status?: string | null
          suggested_suppliers?: string[] | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
          user_modified?: boolean | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          boq_item_number?: string
          category?: string | null
          created_at?: string | null
          delivery_date?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          lead_time_days?: number | null
          order_date?: string | null
          priority?: string | null
          project_id?: string | null
          quantity?: number | null
          status?: string | null
          suggested_suppliers?: string[] | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          user_modified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_data"
            referencedColumns: ["id"]
          },
        ]
      }
      project_data: {
        Row: {
          analysis_data: Json | null
          created_at: string
          currency: string | null
          file_name: string | null
          id: string
          items_count: number | null
          name: string
          total_value: number | null
          updated_at: string
          user_id: string
          wbs_data: Json | null
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          currency?: string | null
          file_name?: string | null
          id?: string
          items_count?: number | null
          name: string
          total_value?: number | null
          updated_at?: string
          user_id: string
          wbs_data?: Json | null
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          currency?: string | null
          file_name?: string | null
          id?: string
          items_count?: number | null
          name?: string
          total_value?: number | null
          updated_at?: string
          user_id?: string
          wbs_data?: Json | null
        }
        Relationships: []
      }
      project_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          item_number: string
          notes: string | null
          project_id: string
          quantity: number | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_number: string
          notes?: string | null
          project_id: string
          quantity?: number | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_number?: string
          notes?: string | null
          project_id?: string
          quantity?: number | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_data"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_items: {
        Row: {
          ai_generated: boolean | null
          ai_reasoning: string | null
          category: string | null
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          productivity_rate: number | null
          project_id: string | null
          quantity: number | null
          rate_per_day: number | null
          start_date: string | null
          status: string | null
          total_cost: number | null
          type: string
          unit: string | null
          user_id: string
          user_modified: boolean | null
          utilization_percent: number | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          category?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          productivity_rate?: number | null
          project_id?: string | null
          quantity?: number | null
          rate_per_day?: number | null
          start_date?: string | null
          status?: string | null
          total_cost?: number | null
          type: string
          unit?: string | null
          user_id: string
          user_modified?: boolean | null
          utilization_percent?: number | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_reasoning?: string | null
          category?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          productivity_rate?: number | null
          project_id?: string | null
          quantity?: number | null
          rate_per_day?: number | null
          start_date?: string | null
          status?: string | null
          total_cost?: number | null
          type?: string
          unit?: string | null
          user_id?: string
          user_modified?: boolean | null
          utilization_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_data"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_projects: {
        Row: {
          analysis_data: Json | null
          created_at: string
          file_name: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          wbs_data: Json | null
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string
          file_name?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          wbs_data?: Json | null
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string
          file_name?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          wbs_data?: Json | null
        }
        Relationships: []
      }
      shared_analyses: {
        Row: {
          analysis_data: Json
          created_at: string
          created_by: string | null
          expires_at: string
          file_name: string | null
          id: string
          is_active: boolean | null
          share_code: string
          viewer_count: number | null
          wbs_data: Json | null
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          created_by?: string | null
          expires_at?: string
          file_name?: string | null
          id?: string
          is_active?: boolean | null
          share_code: string
          viewer_count?: number | null
          wbs_data?: Json | null
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          created_by?: string | null
          expires_at?: string
          file_name?: string | null
          id?: string
          is_active?: boolean | null
          share_code?: string
          viewer_count?: number | null
          wbs_data?: Json | null
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_digest_frequency: string | null
          email_on_analysis_complete: boolean | null
          email_on_comments: boolean | null
          email_on_mentions: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_digest_frequency?: string | null
          email_on_analysis_complete?: boolean | null
          email_on_comments?: boolean | null
          email_on_mentions?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_digest_frequency?: string | null
          email_on_analysis_complete?: boolean | null
          email_on_comments?: boolean | null
          email_on_mentions?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
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
