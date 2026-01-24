import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EquipmentRate {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  unit: string;
  rental_rate: number;
  operation_rate: number;
  supplier_name?: string;
  supplier_id?: string;
  category?: string;
  notes?: string;
  description?: string;
  hourly_rate?: number;
  monthly_rate?: number;
  currency?: string;
  includes_operator?: boolean;
  includes_fuel?: boolean;
  created_at: string;
  updated_at: string;
}

export const EQUIPMENT_CATEGORIES = [
  { value: 'excavator', label: 'حفارات', label_en: 'Excavators' },
  { value: 'loader', label: 'لودر', label_en: 'Loaders' },
  { value: 'crane', label: 'رافعات', label_en: 'Cranes' },
  { value: 'truck', label: 'شاحنات', label_en: 'Trucks' },
  { value: 'mixer', label: 'خلاطات', label_en: 'Mixers' },
  { value: 'pump', label: 'مضخات', label_en: 'Pumps' },
  { value: 'compactor', label: 'دحالات', label_en: 'Compactors' },
  { value: 'generator', label: 'مولدات', label_en: 'Generators' },
  { value: 'forklift', label: 'رافعة شوكية', label_en: 'Forklifts' },
  { value: 'scaffold', label: 'سقالات', label_en: 'Scaffolding' },
  { value: 'welding', label: 'معدات لحام', label_en: 'Welding Equipment' },
  { value: 'cutting', label: 'معدات قطع', label_en: 'Cutting Equipment' },
  { value: 'other', label: 'أخرى', label_en: 'Other' },
];

export const EQUIPMENT_UNITS = [
  { value: 'day', label: 'يوم', label_en: 'Day' },
  { value: 'hour', label: 'ساعة', label_en: 'Hour' },
  { value: 'month', label: 'شهر', label_en: 'Month' },
];

export const CURRENCIES = [
  { value: 'SAR', label: 'ر.س', label_en: 'SAR' },
  { value: 'EGP', label: 'ج.م', label_en: 'EGP' },
  { value: 'USD', label: 'دولار', label_en: 'USD' },
  { value: 'EUR', label: 'يورو', label_en: 'EUR' },
  { value: 'AED', label: 'درهم', label_en: 'AED' },
];

export const useEquipmentRates = () => {
  const { user } = useAuth();
  const [equipmentRates, setEquipmentRates] = useState<EquipmentRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipmentRates = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('equipment_rates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipmentRates(data || []);
    } catch (error) {
      console.error('Error fetching equipment rates:', error);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchEquipmentRates();
      setLoading(false);
    };
    loadData();
  }, [fetchEquipmentRates]);

  const addEquipmentRate = async (equipmentRate: Omit<EquipmentRate, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('equipment_rates')
        .insert({ ...equipmentRate, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setEquipmentRates(prev => [data, ...prev]);
      toast.success('تم إضافة المعدة بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding equipment rate:', error);
      toast.error('فشل في إضافة المعدة');
      return null;
    }
  };

  const updateEquipmentRate = async (id: string, updates: Partial<EquipmentRate>) => {
    try {
      const { data, error } = await supabase
        .from('equipment_rates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setEquipmentRates(prev => prev.map(e => e.id === id ? data : e));
      toast.success('تم تحديث المعدة بنجاح');
      return data;
    } catch (error) {
      console.error('Error updating equipment rate:', error);
      toast.error('فشل في تحديث المعدة');
      return null;
    }
  };

  const deleteEquipmentRate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('equipment_rates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEquipmentRates(prev => prev.filter(e => e.id !== id));
      toast.success('تم حذف المعدة بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting equipment rate:', error);
      toast.error('فشل في حذف المعدة');
      return false;
    }
  };

  const importFromExcel = async (data: any[]) => {
    if (!user) return false;

    try {
      const equipmentToInsert = data.map(row => ({
        user_id: user.id,
        code: row.code || row['الكود'] || `E${Date.now()}`,
        name: row.name || row['اسم المعدة'] || row['الاسم'] || '',
        name_ar: row.name_ar || row['الاسم بالعربي'] || row.name || '',
        unit: row.unit || row['الوحدة'] || 'day',
        rental_rate: parseFloat(row.rental_rate || row['سعر الإيجار'] || 0),
        operation_rate: parseFloat(row.operation_rate || row['سعر التشغيل'] || 0),
        hourly_rate: parseFloat(row.hourly_rate || row['سعر الساعة'] || 0),
        monthly_rate: parseFloat(row.monthly_rate || row['سعر الشهر'] || 0),
        supplier_name: row.supplier_name || row['المورد'] || '',
        category: row.category || row['الفئة'] || 'other',
        currency: row.currency || row['العملة'] || 'SAR',
        description: row.description || row['الوصف'] || row['المواصفات'] || '',
        includes_operator: row.includes_operator === true || row['يشمل المشغل'] === 'نعم',
        includes_fuel: row.includes_fuel === true || row['يشمل الوقود'] === 'نعم',
        notes: row.notes || row['ملاحظات'] || '',
      })).filter(e => e.name && (e.rental_rate > 0 || e.operation_rate > 0));

      if (equipmentToInsert.length === 0) {
        toast.error('لا توجد بيانات صالحة للاستيراد');
        return false;
      }

      const { error } = await supabase
        .from('equipment_rates')
        .insert(equipmentToInsert);

      if (error) throw error;
      
      await fetchEquipmentRates();
      toast.success(`تم استيراد ${equipmentToInsert.length} معدة بنجاح`);
      return true;
    } catch (error) {
      console.error('Error importing equipment rates:', error);
      toast.error('فشل في استيراد البيانات');
      return false;
    }
  };

  const findMatchingRate = (description: string, category?: string): EquipmentRate | null => {
    if (!description || equipmentRates.length === 0) return null;
    
    const descLower = description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    let bestMatch: { rate: EquipmentRate; score: number } | null = null;
    
    for (const rate of equipmentRates) {
      const rateText = (rate.name + ' ' + (rate.name_ar || '') + ' ' + (rate.description || '')).toLowerCase();
      
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
    equipmentRates,
    loading,
    addEquipmentRate,
    updateEquipmentRate,
    deleteEquipmentRate,
    importFromExcel,
    findMatchingRate,
    refreshEquipmentRates: fetchEquipmentRates,
  };
};
