import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface LaborRate {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  unit: string;
  unit_rate: number;
  overtime_percentage: number;
  category?: string;
  notes?: string;
  skill_level?: string;
  currency?: string;
  working_hours_per_day?: number;
  hourly_rate?: number;
  created_at: string;
  updated_at: string;
}

export const LABOR_CATEGORIES = [
  { value: 'general', label: 'عمالة عامة', label_en: 'General Labor' },
  { value: 'mason', label: 'بناء', label_en: 'Mason' },
  { value: 'carpenter', label: 'نجار', label_en: 'Carpenter' },
  { value: 'electrician', label: 'كهربائي', label_en: 'Electrician' },
  { value: 'plumber', label: 'سباك', label_en: 'Plumber' },
  { value: 'painter', label: 'دهان', label_en: 'Painter' },
  { value: 'welder', label: 'لحام', label_en: 'Welder' },
  { value: 'operator', label: 'مشغل معدات', label_en: 'Equipment Operator' },
  { value: 'supervisor', label: 'مشرف', label_en: 'Supervisor' },
  { value: 'engineer', label: 'مهندس', label_en: 'Engineer' },
  { value: 'technician', label: 'فني', label_en: 'Technician' },
  { value: 'helper', label: 'مساعد', label_en: 'Helper' },
  { value: 'other', label: 'أخرى', label_en: 'Other' },
];

export const LABOR_UNITS = [
  { value: 'day', label: 'يوم', label_en: 'Day' },
  { value: 'hour', label: 'ساعة', label_en: 'Hour' },
  { value: 'month', label: 'شهر', label_en: 'Month' },
];

export const SKILL_LEVELS = [
  { value: 'skilled', label: 'ماهر', label_en: 'Skilled' },
  { value: 'semi-skilled', label: 'متوسط', label_en: 'Semi-skilled' },
  { value: 'unskilled', label: 'مبتدئ', label_en: 'Unskilled' },
];

export const CURRENCIES = [
  { value: 'SAR', label: 'ر.س', label_en: 'SAR' },
  { value: 'EGP', label: 'ج.م', label_en: 'EGP' },
  { value: 'USD', label: 'دولار', label_en: 'USD' },
  { value: 'EUR', label: 'يورو', label_en: 'EUR' },
  { value: 'AED', label: 'درهم', label_en: 'AED' },
];

export const useLaborRates = () => {
  const { user } = useAuth();
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLaborRates = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('labor_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLaborRates(data || []);
    } catch (error) {
      console.error('Error fetching labor rates:', error);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchLaborRates();
      setLoading(false);
    };
    loadData();
  }, [fetchLaborRates]);

  const calculateHourlyRate = (dailyRate: number, workingHours: number = 8): number => {
    if (workingHours <= 0) return 0;
    return parseFloat((dailyRate / workingHours).toFixed(2));
  };

  const addLaborRate = async (laborRate: Omit<LaborRate, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      // Calculate hourly rate if unit is 'day'
      let hourlyRate = laborRate.hourly_rate;
      if (laborRate.unit === 'day' && laborRate.working_hours_per_day) {
        hourlyRate = calculateHourlyRate(laborRate.unit_rate, laborRate.working_hours_per_day);
      }

      const { data, error } = await supabase
        .from('labor_rates')
        .insert({ 
          ...laborRate, 
          user_id: user.id,
          hourly_rate: hourlyRate
        })
        .select()
        .single();

      if (error) throw error;
      
      setLaborRates(prev => [data, ...prev]);
      toast.success('تم إضافة العمالة بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding labor rate:', error);
      toast.error('فشل في إضافة العمالة');
      return null;
    }
  };

  const updateLaborRate = async (id: string, updates: Partial<LaborRate>) => {
    try {
      // Recalculate hourly rate if needed
      let hourlyRate = updates.hourly_rate;
      if (updates.unit === 'day' && updates.unit_rate && updates.working_hours_per_day) {
        hourlyRate = calculateHourlyRate(updates.unit_rate, updates.working_hours_per_day);
      }

      const { data, error } = await supabase
        .from('labor_rates')
        .update({ ...updates, hourly_rate: hourlyRate })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setLaborRates(prev => prev.map(l => l.id === id ? data : l));
      toast.success('تم تحديث العمالة بنجاح');
      return data;
    } catch (error) {
      console.error('Error updating labor rate:', error);
      toast.error('فشل في تحديث العمالة');
      return null;
    }
  };

  const deleteLaborRate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('labor_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setLaborRates(prev => prev.filter(l => l.id !== id));
      toast.success('تم حذف العمالة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting labor rate:', error);
      toast.error('فشل في حذف العمالة');
      return false;
    }
  };

  const importFromExcel = async (data: any[]) => {
    if (!user) return false;

    try {
      const laborToInsert = data.map(row => {
        const dailyRate = parseFloat(row.unit_rate || row['سعر الوحدة'] || row['السعر'] || 0);
        const workingHours = parseInt(row.working_hours_per_day || row['ساعات العمل'] || 8);
        
        return {
          user_id: user.id,
          code: row.code || row['الكود'] || `L${Date.now()}`,
          name: row.name || row['المسمى الوظيفي'] || row['الاسم'] || '',
          name_ar: row.name_ar || row['الاسم بالعربي'] || row.name || '',
          unit: row.unit || row['الوحدة'] || 'day',
          unit_rate: dailyRate,
          overtime_percentage: parseFloat(row.overtime_percentage || row['نسبة الإضافي'] || 0),
          category: row.category || row['الفئة'] || 'general',
          skill_level: row.skill_level || row['مستوى المهارة'] || 'skilled',
          currency: row.currency || row['العملة'] || 'SAR',
          working_hours_per_day: workingHours,
          hourly_rate: calculateHourlyRate(dailyRate, workingHours),
          notes: row.notes || row['ملاحظات'] || '',
        };
      }).filter(l => l.name && l.unit_rate > 0);

      if (laborToInsert.length === 0) {
        toast.error('لا توجد بيانات صالحة للاستيراد');
        return false;
      }

      const { error } = await supabase
        .from('labor_rates')
        .insert(laborToInsert);

      if (error) throw error;
      
      await fetchLaborRates();
      toast.success(`تم استيراد ${laborToInsert.length} عمالة بنجاح`);
      return true;
    } catch (error) {
      console.error('Error importing labor rates:', error);
      toast.error('فشل في استيراد البيانات');
      return false;
    }
  };

  const findMatchingRate = (description: string, category?: string): LaborRate | null => {
    if (!description || laborRates.length === 0) return null;
    
    const descLower = description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    let bestMatch: { rate: LaborRate; score: number } | null = null;
    
    for (const rate of laborRates) {
      const rateText = (rate.name + ' ' + (rate.name_ar || '')).toLowerCase();
      
      let score = 0;
      
      if (rateText.includes(descLower) || descLower.includes(rate.name.toLowerCase())) {
        score += 50;
      }
      
      for (const term of searchTerms) {
        if (rateText.includes(term)) {
          score += 10;
        }
      }
      
      if (category && rate.category === category) {
        score += 15;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { rate, score };
      }
    }
    
    return bestMatch && bestMatch.score >= 20 ? bestMatch.rate : null;
  };

  return {
    laborRates,
    loading,
    addLaborRate,
    updateLaborRate,
    deleteLaborRate,
    importFromExcel,
    findMatchingRate,
    refreshLaborRates: fetchLaborRates,
    calculateHourlyRate,
  };
};
