import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MaterialPrice {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  category: string;
  subcategory?: string;
  unit: string;
  unit_price: number;
  currency: string;
  source?: string;
  source_url?: string;
  supplier_name?: string;
  supplier_contact?: string;
  location?: string;
  city?: string;
  price_date: string;
  is_verified: boolean;
  valid_until?: string;
  notes?: string;
  waste_percentage?: number;
  brand?: string;
  specifications?: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  name_ar?: string;
  category?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  rating?: number;
  notes?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export const MATERIAL_CATEGORIES = [
  { value: 'concrete', label: 'خرسانة ومواد بناء', label_en: 'Concrete & Building' },
  { value: 'steel', label: 'حديد وصلب', label_en: 'Steel & Iron' },
  { value: 'cement', label: 'أسمنت', label_en: 'Cement' },
  { value: 'blocks', label: 'بلوك وطوب', label_en: 'Blocks & Bricks' },
  { value: 'sand_aggregate', label: 'رمل وحصى', label_en: 'Sand & Aggregate' },
  { value: 'tiles', label: 'سيراميك وبلاط', label_en: 'Tiles & Ceramics' },
  { value: 'paint', label: 'دهانات', label_en: 'Paints' },
  { value: 'doors_windows', label: 'أبواب ونوافذ', label_en: 'Doors & Windows' },
  { value: 'aluminum', label: 'ألمنيوم', label_en: 'Aluminum' },
  { value: 'electrical', label: 'كهرباء', label_en: 'Electrical' },
  { value: 'plumbing', label: 'سباكة', label_en: 'Plumbing' },
  { value: 'insulation', label: 'عزل', label_en: 'Insulation' },
  { value: 'wood', label: 'خشب', label_en: 'Wood' },
  { value: 'glass', label: 'زجاج', label_en: 'Glass' },
  { value: 'hvac', label: 'تكييف وتبريد', label_en: 'HVAC' },
  { value: 'other', label: 'أخرى', label_en: 'Other' },
];

export const CURRENCIES = [
  { value: 'SAR', label: 'ر.س', label_en: 'SAR' },
  { value: 'EGP', label: 'ج.م', label_en: 'EGP' },
  { value: 'USD', label: 'دولار', label_en: 'USD' },
  { value: 'EUR', label: 'يورو', label_en: 'EUR' },
  { value: 'AED', label: 'درهم', label_en: 'AED' },
];

export const useMaterialPrices = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<MaterialPrice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('material_prices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  }, [user]);

  const fetchSuppliers = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMaterials(), fetchSuppliers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchMaterials, fetchSuppliers]);

  const addMaterial = async (material: Omit<MaterialPrice, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('material_prices')
        .insert({ ...material, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setMaterials(prev => [data, ...prev]);
      toast.success('تم إضافة السعر بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding material:', error);
      toast.error('فشل في إضافة السعر');
      return null;
    }
  };

  const updateMaterial = async (id: string, updates: Partial<MaterialPrice>) => {
    try {
      const { data, error } = await supabase
        .from('material_prices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setMaterials(prev => prev.map(m => m.id === id ? data : m));
      toast.success('تم تحديث السعر بنجاح');
      return data;
    } catch (error) {
      console.error('Error updating material:', error);
      toast.error('فشل في تحديث السعر');
      return null;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      const { error } = await supabase
        .from('material_prices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('تم حذف السعر بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('فشل في حذف السعر');
      return false;
    }
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplier, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      setSuppliers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('تم إضافة المورد بنجاح');
      return data;
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('فشل في إضافة المورد');
      return null;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('تم حذف المورد بنجاح');
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('فشل في حذف المورد');
      return false;
    }
  };

  const importFromExcel = async (data: any[]) => {
    if (!user) return false;

    try {
      const materialsToInsert = data.map(row => ({
        user_id: user.id,
        name: row.name || row['اسم المادة'] || '',
        name_ar: row.name_ar || row['الاسم بالعربي'] || row.name || '',
        category: row.category || row['الفئة'] || 'other',
        unit: row.unit || row['الوحدة'] || 'unit',
        unit_price: parseFloat(row.unit_price || row['السعر'] || row['سعر الوحدة'] || 0),
        currency: row.currency || row['العملة'] || 'SAR',
        supplier_name: row.supplier_name || row['المورد'] || '',
        brand: row.brand || row['العلامة التجارية'] || '',
        description: row.description || row['الوصف'] || '',
        specifications: row.specifications || row['المواصفات'] || '',
        waste_percentage: parseFloat(row.waste_percentage || row['نسبة الهدر'] || 0),
        source: 'import',
        price_date: new Date().toISOString().split('T')[0],
        is_verified: false,
      })).filter(m => m.name && m.unit_price > 0);

      if (materialsToInsert.length === 0) {
        toast.error('لا توجد بيانات صالحة للاستيراد');
        return false;
      }

      const { error } = await supabase
        .from('material_prices')
        .insert(materialsToInsert);

      if (error) throw error;
      
      await fetchMaterials();
      toast.success(`تم استيراد ${materialsToInsert.length} سعر بنجاح`);
      return true;
    } catch (error) {
      console.error('Error importing materials:', error);
      toast.error('فشل في استيراد البيانات');
      return false;
    }
  };

  const findMatchingPrice = (description: string, category?: string): MaterialPrice | null => {
    if (!description || materials.length === 0) return null;
    
    const descLower = description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    let bestMatch: { material: MaterialPrice; score: number } | null = null;
    
    for (const material of materials) {
      const materialText = (
        material.name + ' ' + 
        (material.name_ar || '') + ' ' + 
        (material.description || '') + ' ' +
        (material.subcategory || '') + ' ' +
        (material.brand || '') + ' ' +
        (material.specifications || '')
      ).toLowerCase();
      
      let score = 0;
      
      if (materialText.includes(descLower) || descLower.includes(material.name.toLowerCase())) {
        score += 50;
      }
      
      for (const term of searchTerms) {
        if (materialText.includes(term)) {
          score += 10;
        }
      }
      
      if (category && material.category === category) {
        score += 15;
      }
      
      if (material.is_verified) {
        score += 5;
      }
      
      const priceAge = new Date().getTime() - new Date(material.price_date).getTime();
      const daysOld = priceAge / (1000 * 60 * 60 * 24);
      if (daysOld < 30) {
        score += 10;
      } else if (daysOld < 90) {
        score += 5;
      }
      
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { material, score };
      }
    }
    
    return bestMatch && bestMatch.score >= 20 ? bestMatch.material : null;
  };

  const findAllMatchingPrices = (description: string, category?: string, limit = 5): MaterialPrice[] => {
    if (!description || materials.length === 0) return [];
    
    const descLower = description.toLowerCase();
    const searchTerms = descLower.split(/[\s,،.-]+/).filter(t => t.length > 2);
    
    const scored = materials.map(material => {
      const materialText = (
        material.name + ' ' + 
        (material.name_ar || '') + ' ' + 
        (material.description || '') + ' ' +
        (material.brand || '') + ' ' +
        (material.specifications || '')
      ).toLowerCase();
      
      let score = 0;
      
      if (materialText.includes(descLower) || descLower.includes(material.name.toLowerCase())) {
        score += 50;
      }
      
      for (const term of searchTerms) {
        if (materialText.includes(term)) {
          score += 10;
        }
      }
      
      if (category && material.category === category) {
        score += 15;
      }
      
      return { material, score };
    });
    
    return scored
      .filter(s => s.score >= 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.material);
  };

  return {
    materials,
    suppliers,
    loading,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addSupplier,
    deleteSupplier,
    importFromExcel,
    findMatchingPrice,
    refreshMaterials: fetchMaterials,
    refreshSuppliers: fetchSuppliers,
    findAllMatchingPrices,
  };
};
