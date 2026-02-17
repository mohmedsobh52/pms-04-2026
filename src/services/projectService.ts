import { supabase } from "@/integrations/supabase/client";

export interface ProjectFilters {
  status?: string;
  searchQuery?: string;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  from: number;
  to: number;
}

export const projectService = {
  async getProjects(
    userId: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: ProjectFilters
  ): Promise<PaginatedResult<any>> {
    try {
      let query = supabase
        .from('saved_projects')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.searchQuery) {
        query = query.ilike('name', `%${filters.searchQuery}%`);
      }

      const sortBy = filters?.sortBy || 'updated_at';
      const sortOrder = filters?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
        from,
        to: Math.min(to, (count || 0) - 1),
      };
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  },

  async getProjectById(projectId: string) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  },

  async createProject(userId: string, projectData: {
    name: string;
    file_name?: string;
    analysis_data?: any;
    wbs_data?: any;
    status?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .insert({
          user_id: userId,
          ...projectData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  async updateProject(projectId: string, updates: {
    name?: string;
    analysis_data?: any;
    wbs_data?: any;
    status?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  },

  async deleteProject(projectId: string) {
    try {
      const { error } = await supabase
        .from('saved_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  async getProjectStats(userId: string) {
    try {
      const { data: projects, error } = await supabase
        .from('saved_projects')
        .select('analysis_data')
        .eq('user_id', userId);

      if (error) throw error;

      let totalValue = 0;
      let totalItems = 0;

      projects?.forEach(p => {
        const analysis = p.analysis_data as any;
        if (analysis?.summary?.total_value) {
          totalValue += analysis.summary.total_value;
        }
        if (analysis?.items?.length) {
          totalItems += analysis.items.length;
        }
      });

      return {
        totalProjects: projects?.length || 0,
        totalValue,
        totalItems,
      };
    } catch (error) {
      console.error('Error fetching project stats:', error);
      throw error;
    }
  },

  async getRecentProjects(userId: string, limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('saved_projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent projects:', error);
      throw error;
    }
  },
};
