import { supabase } from "@/integrations/supabase/client";

export interface QuotationFilters {
  status?: string;
  searchQuery?: string;
  projectId?: string;
  sortBy?: 'created_at' | 'quotation_date' | 'total_amount';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  from: number;
  to: number;
}

export const quotationService = {
  async getQuotations(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: QuotationFilters
  ): Promise<PaginatedResult<any>> {
    try {
      let query = supabase
        .from('price_quotations')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters?.searchQuery) {
        query = query.or(`name.ilike.%${filters.searchQuery}%,supplier_name.ilike.%${filters.searchQuery}%`);
      }

      const sortBy = filters?.sortBy || 'created_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      const parsed = (data || []).map(q => ({
        ...q,
        ai_analysis: typeof q.ai_analysis === 'string'
          ? JSON.parse(q.ai_analysis)
          : q.ai_analysis
      }));

      return {
        data: parsed,
        count: count || 0,
        from,
        to: Math.min(to, (count || 0) - 1),
      };
    } catch (error) {
      console.error('Error fetching quotations:', error);
      throw error;
    }
  },

  async getQuotationById(quotationId: string) {
    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('id', quotationId)
        .maybeSingle();

      if (error) throw error;

      if (data && typeof data.ai_analysis === 'string') {
        data.ai_analysis = JSON.parse(data.ai_analysis);
      }

      return data;
    } catch (error) {
      console.error('Error fetching quotation:', error);
      throw error;
    }
  },

  async createQuotation(userId: string, quotationData: {
    name: string;
    file_name?: string;
    supplier_name?: string;
    quotation_date?: string;
    total_amount?: number;
    currency?: string;
    status?: string;
    ai_analysis?: any;
    project_id?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .insert({
          user_id: userId,
          ...quotationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quotation:', error);
      throw error;
    }
  },

  async updateQuotation(quotationId: string, updates: {
    name?: string;
    supplier_name?: string;
    quotation_date?: string;
    total_amount?: number;
    status?: string;
    ai_analysis?: any;
  }) {
    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating quotation:', error);
      throw error;
    }
  },

  async deleteQuotation(quotationId: string) {
    try {
      const { error } = await supabase
        .from('price_quotations')
        .delete()
        .eq('id', quotationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting quotation:', error);
      throw error;
    }
  },

  async getQuotationsByProject(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (data || []).map(q => ({
        ...q,
        ai_analysis: typeof q.ai_analysis === 'string'
          ? JSON.parse(q.ai_analysis)
          : q.ai_analysis
      }));

      return parsed;
    } catch (error) {
      console.error('Error fetching quotations by project:', error);
      throw error;
    }
  },

  async getQuotationStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('price_quotations')
        .select('total_amount, currency')
        .eq('user_id', userId);

      if (error) throw error;

      const totalQuotations = data?.length || 0;
      const totalValue = data?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      return {
        totalQuotations,
        totalValue,
      };
    } catch (error) {
      console.error('Error fetching quotation stats:', error);
      throw error;
    }
  },
};
