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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
          {
            foreignKeyName: "analysis_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "analysis_comments_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          chunk_results: Json | null
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          file_name: string | null
          id: string
          input_text_compressed: string | null
          input_text_length: number | null
          job_type: string
          processed_chunks: number | null
          progress_percentage: number | null
          result_data: Json | null
          started_at: string | null
          status: string
          total_chunks: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_results?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          input_text_compressed?: string | null
          input_text_length?: number | null
          job_type: string
          processed_chunks?: number | null
          progress_percentage?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          total_chunks?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_results?: Json | null
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          input_text_compressed?: string | null
          input_text_length?: number | null
          job_type?: string
          processed_chunks?: number | null
          progress_percentage?: number | null
          result_data?: Json | null
          started_at?: string | null
          status?: string
          total_chunks?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      attachment_folders: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          name_ar: string | null
          parent_id: string | null
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          name_ar?: string | null
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          parent_id?: string | null
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "attachment_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      boq_templates: {
        Row: {
          category: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_public: boolean | null
          items: Json
          name: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          items?: Json
          name: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          items?: Json
          name?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
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
      contracts: {
        Row: {
          contract_number: string
          contract_title: string
          contract_type: string | null
          contract_value: number | null
          contractor_name: string | null
          created_at: string
          currency: string | null
          documents_url: string | null
          end_date: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          project_id: string | null
          scope_of_work: string | null
          start_date: string | null
          status: string | null
          terms_conditions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_number: string
          contract_title: string
          contract_type?: string | null
          contract_value?: number | null
          contractor_name?: string | null
          created_at?: string
          currency?: string | null
          documents_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          terms_conditions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_number?: string
          contract_title?: string
          contract_type?: string | null
          contract_value?: number | null
          contractor_name?: string | null
          created_at?: string
          currency?: string | null
          documents_url?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          terms_conditions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
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
      cost_benefit_analysis: {
        Row: {
          analysis_name: string
          analysis_period_years: number | null
          annual_benefits: number | null
          annual_costs: number | null
          assumptions: string | null
          bcr: number | null
          created_at: string
          description: string | null
          discount_rate: number | null
          id: string
          initial_investment: number | null
          irr: number | null
          npv: number | null
          payback_period: number | null
          project_id: string | null
          recommendations: string | null
          risks: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_name: string
          analysis_period_years?: number | null
          annual_benefits?: number | null
          annual_costs?: number | null
          assumptions?: string | null
          bcr?: number | null
          created_at?: string
          description?: string | null
          discount_rate?: number | null
          id?: string
          initial_investment?: number | null
          irr?: number | null
          npv?: number | null
          payback_period?: number | null
          project_id?: string | null
          recommendations?: string | null
          risks?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_name?: string
          analysis_period_years?: number | null
          annual_benefits?: number | null
          annual_costs?: number | null
          assumptions?: string | null
          bcr?: number | null
          created_at?: string
          description?: string | null
          discount_rate?: number | null
          id?: string
          initial_investment?: number | null
          irr?: number | null
          npv?: number | null
          payback_period?: number | null
          project_id?: string | null
          recommendations?: string | null
          risks?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_benefit_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      edited_boq_prices: {
        Row: {
          created_at: string
          edited_total_price: number | null
          edited_unit_price: number | null
          file_name: string | null
          id: string
          item_number: string
          project_id: string | null
          saved_project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edited_total_price?: number | null
          edited_unit_price?: number | null
          file_name?: string | null
          id?: string
          item_number: string
          project_id?: string | null
          saved_project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          edited_total_price?: number | null
          edited_unit_price?: number | null
          file_name?: string | null
          id?: string
          item_number?: string
          project_id?: string | null
          saved_project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edited_boq_prices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edited_boq_prices_saved_project_id_fkey"
            columns: ["saved_project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rates: {
        Row: {
          category: string | null
          code: string
          created_at: string
          currency: string | null
          description: string | null
          hourly_rate: number | null
          id: string
          includes_fuel: boolean | null
          includes_operator: boolean | null
          monthly_rate: number | null
          name: string
          name_ar: string | null
          notes: string | null
          operation_rate: number | null
          price_date: string | null
          rental_rate: number
          supplier_id: string | null
          supplier_name: string | null
          unit: string
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          currency?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          includes_fuel?: boolean | null
          includes_operator?: boolean | null
          monthly_rate?: number | null
          name: string
          name_ar?: string | null
          notes?: string | null
          operation_rate?: number | null
          price_date?: string | null
          rental_rate?: number
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          hourly_rate?: number | null
          id?: string
          includes_fuel?: boolean | null
          includes_operator?: boolean | null
          monthly_rate?: number | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          operation_rate?: number | null
          price_date?: string | null
          rental_rate?: number
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      evm_alert_settings: {
        Row: {
          cpi_critical_threshold: number | null
          cpi_warning_threshold: number | null
          created_at: string
          email: string
          id: string
          notifications_enabled: boolean | null
          spi_critical_threshold: number | null
          spi_warning_threshold: number | null
          updated_at: string
          user_id: string
          vac_critical_percentage: number | null
          vac_warning_percentage: number | null
        }
        Insert: {
          cpi_critical_threshold?: number | null
          cpi_warning_threshold?: number | null
          created_at?: string
          email: string
          id?: string
          notifications_enabled?: boolean | null
          spi_critical_threshold?: number | null
          spi_warning_threshold?: number | null
          updated_at?: string
          user_id: string
          vac_critical_percentage?: number | null
          vac_warning_percentage?: number | null
        }
        Update: {
          cpi_critical_threshold?: number | null
          cpi_warning_threshold?: number | null
          created_at?: string
          email?: string
          id?: string
          notifications_enabled?: boolean | null
          spi_critical_threshold?: number | null
          spi_warning_threshold?: number | null
          updated_at?: string
          user_id?: string
          vac_critical_percentage?: number | null
          vac_warning_percentage?: number | null
        }
        Relationships: []
      }
      historical_pricing_files: {
        Row: {
          created_at: string
          currency: string | null
          file_name: string
          id: string
          is_verified: boolean | null
          items: Json
          items_count: number | null
          notes: string | null
          project_date: string | null
          project_location: string | null
          project_name: string
          total_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          file_name: string
          id?: string
          is_verified?: boolean | null
          items?: Json
          items_count?: number | null
          notes?: string | null
          project_date?: string | null
          project_location?: string | null
          project_name: string
          total_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          file_name?: string
          id?: string
          is_verified?: boolean | null
          items?: Json
          items_count?: number | null
          notes?: string | null
          project_date?: string | null
          project_location?: string | null
          project_name?: string
          total_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      item_pricing_details: {
        Row: {
          created_at: string
          duration: number | null
          id: string
          notes: string | null
          pricing_type: string
          project_item_id: string
          quantity: number | null
          resource_id: string | null
          resource_name: string
          total_cost: number | null
          unit: string | null
          unit_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          pricing_type: string
          project_item_id: string
          quantity?: number | null
          resource_id?: string | null
          resource_name: string
          total_cost?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          id?: string
          notes?: string | null
          pricing_type?: string
          project_item_id?: string
          quantity?: number | null
          resource_id?: string | null
          resource_name?: string
          total_cost?: number | null
          unit?: string | null
          unit_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_pricing_details_project_item_id_fkey"
            columns: ["project_item_id"]
            isOneToOne: false
            referencedRelation: "project_items"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          category: string | null
          code: string
          created_at: string
          currency: string | null
          hourly_rate: number | null
          id: string
          name: string
          name_ar: string | null
          notes: string | null
          overtime_percentage: number | null
          price_date: string | null
          skill_level: string | null
          unit: string
          unit_rate: number
          updated_at: string
          user_id: string
          valid_until: string | null
          working_hours_per_day: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          name: string
          name_ar?: string | null
          notes?: string | null
          overtime_percentage?: number | null
          price_date?: string | null
          skill_level?: string | null
          unit?: string
          unit_rate?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          working_hours_per_day?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          currency?: string | null
          hourly_rate?: number | null
          id?: string
          name?: string
          name_ar?: string | null
          notes?: string | null
          overtime_percentage?: number | null
          price_date?: string | null
          skill_level?: string | null
          unit?: string
          unit_rate?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          working_hours_per_day?: number | null
        }
        Relationships: []
      }
      material_prices: {
        Row: {
          brand: string | null
          category: string
          city: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          location: string | null
          name: string
          name_ar: string | null
          notes: string | null
          price_date: string | null
          source: string | null
          source_url: string | null
          specifications: string | null
          subcategory: string | null
          supplier_contact: string | null
          supplier_name: string | null
          unit: string
          unit_price: number
          updated_at: string
          user_id: string
          valid_until: string | null
          waste_percentage: number | null
        }
        Insert: {
          brand?: string | null
          category: string
          city?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          name: string
          name_ar?: string | null
          notes?: string | null
          price_date?: string | null
          source?: string | null
          source_url?: string | null
          specifications?: string | null
          subcategory?: string | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit: string
          unit_price: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          waste_percentage?: number | null
        }
        Update: {
          brand?: string | null
          category?: string
          city?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          location?: string | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          price_date?: string | null
          source?: string | null
          source_url?: string | null
          specifications?: string | null
          subcategory?: string | null
          supplier_contact?: string | null
          supplier_name?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          waste_percentage?: number | null
        }
        Relationships: []
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
      project_attachments: {
        Row: {
          analysis_result: Json | null
          category: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          is_analyzed: boolean | null
          project_id: string | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          category?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_analyzed?: boolean | null
          project_id?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          category?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_analyzed?: boolean | null
          project_id?: string | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "attachment_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
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
          is_detailed_priced: boolean | null
          item_number: string
          notes: string | null
          overhead_percentage: number | null
          pricing_notes: string | null
          profit_percentage: number | null
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
          is_detailed_priced?: boolean | null
          item_number: string
          notes?: string | null
          overhead_percentage?: number | null
          pricing_notes?: string | null
          profit_percentage?: number | null
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
          is_detailed_priced?: boolean | null
          item_number?: string
          notes?: string | null
          overhead_percentage?: number | null
          pricing_notes?: string | null
          profit_percentage?: number | null
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
      project_progress_history: {
        Row: {
          actual_cost: number | null
          actual_progress: number | null
          actual_spent_percentage: number | null
          cpi: number | null
          created_at: string
          id: string
          notes: string | null
          planned_progress: number | null
          project_id: string | null
          record_date: string
          spi: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          actual_progress?: number | null
          actual_spent_percentage?: number | null
          cpi?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_progress?: number | null
          project_id?: string | null
          record_date?: string
          spi?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          actual_progress?: number | null
          actual_spent_percentage?: number | null
          cpi?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          planned_progress?: number | null
          project_id?: string | null
          record_date?: string
          spi?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
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
      risks: {
        Row: {
          category: string | null
          contingency_plan: string | null
          created_at: string
          id: string
          identified_date: string | null
          impact: string | null
          mitigation_strategy: string | null
          probability: string | null
          project_id: string | null
          review_date: string | null
          risk_description: string | null
          risk_owner: string | null
          risk_score: number | null
          risk_title: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          contingency_plan?: string | null
          created_at?: string
          id?: string
          identified_date?: string | null
          impact?: string | null
          mitigation_strategy?: string | null
          probability?: string | null
          project_id?: string | null
          review_date?: string | null
          risk_description?: string | null
          risk_owner?: string | null
          risk_score?: number | null
          risk_title: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          contingency_plan?: string | null
          created_at?: string
          id?: string
          identified_date?: string | null
          impact?: string | null
          mitigation_strategy?: string | null
          probability?: string | null
          project_id?: string | null
          review_date?: string | null
          risk_description?: string | null
          risk_owner?: string | null
          risk_score?: number | null
          risk_title?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
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
          status: string | null
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
          status?: string | null
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
          status?: string | null
          updated_at?: string
          user_id?: string
          wbs_data?: Json | null
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string
          id: string
          include_charts: boolean | null
          include_comparison: boolean | null
          is_active: boolean | null
          last_sent_at: string | null
          next_scheduled_at: string | null
          project_id: string | null
          recipient_emails: string[]
          report_name: string
          report_type: string
          schedule_day: number | null
          schedule_hour: number | null
          schedule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          include_charts?: boolean | null
          include_comparison?: boolean | null
          is_active?: boolean | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          project_id?: string | null
          recipient_emails: string[]
          report_name: string
          report_type?: string
          schedule_day?: number | null
          schedule_hour?: number | null
          schedule_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          include_charts?: boolean | null
          include_comparison?: boolean | null
          is_active?: boolean | null
          last_sent_at?: string | null
          next_scheduled_at?: string | null
          project_id?: string | null
          recipient_emails?: string[]
          report_name?: string
          report_type?: string
          schedule_day?: number | null
          schedule_hour?: number | null
          schedule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
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
      subcontractor_assignments: {
        Row: {
          contract_value: number | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          payment_status: string | null
          progress_percentage: number | null
          project_id: string | null
          scope_of_work: string | null
          start_date: string | null
          status: string | null
          subcontractor_id: string
          updated_at: string
        }
        Insert: {
          contract_value?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id: string
          updated_at?: string
        }
        Update: {
          contract_value?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          progress_percentage?: number | null
          project_id?: string | null
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          license_number: string | null
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          specialty: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          license_number?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          specialty?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean | null
          name: string
          name_ar: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          name: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          name?: string
          name_ar?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      tender_pricing: {
        Row: {
          contingency: number | null
          contract_value: number | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          facilities_data: Json | null
          guarantees_data: Json | null
          id: string
          indirect_costs_data: Json | null
          insurance_data: Json | null
          profit_margin: number | null
          project_duration: number | null
          project_id: string
          staff_data: Json | null
          start_date: string | null
          subcontractors_data: Json | null
          total_facilities_costs: number | null
          total_guarantees_costs: number | null
          total_indirect_costs: number | null
          total_insurance_costs: number | null
          total_staff_costs: number | null
          total_subcontractors_costs: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contingency?: number | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          facilities_data?: Json | null
          guarantees_data?: Json | null
          id?: string
          indirect_costs_data?: Json | null
          insurance_data?: Json | null
          profit_margin?: number | null
          project_duration?: number | null
          project_id: string
          staff_data?: Json | null
          start_date?: string | null
          subcontractors_data?: Json | null
          total_facilities_costs?: number | null
          total_guarantees_costs?: number | null
          total_indirect_costs?: number | null
          total_insurance_costs?: number | null
          total_staff_costs?: number | null
          total_subcontractors_costs?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contingency?: number | null
          contract_value?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          facilities_data?: Json | null
          guarantees_data?: Json | null
          id?: string
          indirect_costs_data?: Json | null
          insurance_data?: Json | null
          profit_margin?: number | null
          project_duration?: number | null
          project_id?: string
          staff_data?: Json | null
          start_date?: string | null
          subcontractors_data?: Json | null
          total_facilities_costs?: number | null
          total_guarantees_costs?: number | null
          total_indirect_costs?: number | null
          total_insurance_costs?: number | null
          total_staff_costs?: number | null
          total_subcontractors_costs?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_pricing_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "saved_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_estimates: {
        Row: {
          created_at: string
          custom_duration: number | null
          custom_progress: number | null
          custom_start_day: number | null
          id: string
          notes: string | null
          project_id: string | null
          task_code: string
          task_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_duration?: number | null
          custom_progress?: number | null
          custom_start_day?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          task_code: string
          task_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_duration?: number | null
          custom_progress?: number | null
          custom_start_day?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          task_code?: string
          task_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_data"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analysis_preferences: {
        Row: {
          analysis_language: string | null
          auto_analyze_on_upload: boolean | null
          created_at: string
          default_analysis_type: string | null
          email_notifications: boolean | null
          id: string
          include_market_comparison: boolean | null
          include_recommendations: boolean | null
          is_default: boolean | null
          preference_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_language?: string | null
          auto_analyze_on_upload?: boolean | null
          created_at?: string
          default_analysis_type?: string | null
          email_notifications?: boolean | null
          id?: string
          include_market_comparison?: boolean | null
          include_recommendations?: boolean | null
          is_default?: boolean | null
          preference_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_language?: string | null
          auto_analyze_on_upload?: boolean | null
          created_at?: string
          default_analysis_type?: string | null
          email_notifications?: boolean | null
          id?: string
          include_market_comparison?: boolean | null
          include_recommendations?: boolean | null
          is_default?: boolean | null
          preference_name?: string
          updated_at?: string
          user_id?: string
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      analysis_comments_secure: {
        Row: {
          author_email: string | null
          author_name: string | null
          comment_text: string | null
          comment_type: string | null
          created_at: string | null
          id: string | null
          is_resolved: boolean | null
          item_id: string | null
          parent_id: string | null
          share_code: string | null
          updated_at: string | null
        }
        Insert: {
          author_email?: never
          author_name?: string | null
          comment_text?: string | null
          comment_type?: string | null
          created_at?: string | null
          id?: string | null
          is_resolved?: boolean | null
          item_id?: string | null
          parent_id?: string | null
          share_code?: string | null
          updated_at?: string | null
        }
        Update: {
          author_email?: never
          author_name?: string | null
          comment_text?: string | null
          comment_type?: string | null
          created_at?: string | null
          id?: string | null
          is_resolved?: boolean | null
          item_id?: string | null
          parent_id?: string | null
          share_code?: string | null
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
          {
            foreignKeyName: "analysis_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "analysis_comments_secure"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
