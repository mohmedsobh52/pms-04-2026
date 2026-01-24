import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Sample Materials Data (15 items)
const SAMPLE_MATERIALS = [
  { name: "Ready-Mix Concrete C30", name_ar: "خرسانة جاهزة C30", category: "concrete", unit: "m3", unit_price: 350, brand: "Saudi Readymix" },
  { name: "Ready-Mix Concrete C40", name_ar: "خرسانة جاهزة C40", category: "concrete", unit: "m3", unit_price: 400, brand: "Saudi Readymix" },
  { name: "Rebar 12mm", name_ar: "حديد تسليح 12مم", category: "steel", unit: "ton", unit_price: 3200, brand: "SABIC" },
  { name: "Rebar 16mm", name_ar: "حديد تسليح 16مم", category: "steel", unit: "ton", unit_price: 3100, brand: "SABIC" },
  { name: "Portland Cement", name_ar: "أسمنت بورتلاندي", category: "cement", unit: "ton", unit_price: 350, brand: "Yamama" },
  { name: "Concrete Block 20x20x40", name_ar: "بلوك خرساني 20×20×40", category: "blocks", unit: "unit", unit_price: 3.50 },
  { name: "Red Brick", name_ar: "طوب أحمر", category: "blocks", unit: "unit", unit_price: 0.85 },
  { name: "Washed Sand", name_ar: "رمل مغسول", category: "sand_aggregate", unit: "m3", unit_price: 80 },
  { name: "Aggregate/Gravel", name_ar: "حصمة/حصى", category: "sand_aggregate", unit: "m3", unit_price: 120 },
  { name: "Floor Tiles 60x60", name_ar: "سيراميك أرضيات 60×60", category: "tiles", unit: "m2", unit_price: 55, brand: "RAK Ceramics" },
  { name: "Interior Plastic Paint", name_ar: "دهان بلاستيك داخلي", category: "paint", unit: "unit", unit_price: 180, brand: "Jotun" },
  { name: "Waterproofing Membrane", name_ar: "عزل مائي ممبرين", category: "insulation", unit: "m2", unit_price: 35, brand: "Sika" },
  { name: "Aluminum Door", name_ar: "باب ألمنيوم", category: "aluminum", unit: "m2", unit_price: 450 },
  { name: "Electric Cable 2.5mm", name_ar: "سلك كهربائي 2.5مم", category: "electrical", unit: "m", unit_price: 3.50, brand: "Riyadh Cables" },
  { name: "PVC Pipe 4 inch", name_ar: "ماسورة PVC 4 بوصة", category: "plumbing", unit: "m", unit_price: 18 },
];

// Sample Labor Data (10 items)
const SAMPLE_LABOR = [
  { code: "L001", name: "Master Mason", name_ar: "معلم بناء", category: "mason", skill_level: "skilled", unit_rate: 250, working_hours_per_day: 8 },
  { code: "L002", name: "Mason Helper", name_ar: "مساعد بناء", category: "mason", skill_level: "unskilled", unit_rate: 120, working_hours_per_day: 8 },
  { code: "L003", name: "Rebar Carpenter", name_ar: "نجار مسلح", category: "carpenter", skill_level: "skilled", unit_rate: 280, working_hours_per_day: 8 },
  { code: "L004", name: "Plumber", name_ar: "سباك", category: "plumber", skill_level: "skilled", unit_rate: 300, working_hours_per_day: 8 },
  { code: "L005", name: "Electrician", name_ar: "كهربائي", category: "electrician", skill_level: "skilled", unit_rate: 320, working_hours_per_day: 8 },
  { code: "L006", name: "Painter", name_ar: "دهان", category: "painter", skill_level: "semi-skilled", unit_rate: 200, working_hours_per_day: 8 },
  { code: "L007", name: "Welder", name_ar: "لحام", category: "welder", skill_level: "skilled", unit_rate: 350, working_hours_per_day: 8 },
  { code: "L008", name: "Heavy Equipment Operator", name_ar: "مشغل معدات ثقيلة", category: "operator", skill_level: "skilled", unit_rate: 400, working_hours_per_day: 8 },
  { code: "L009", name: "Site Supervisor", name_ar: "مشرف موقع", category: "supervisor", skill_level: "skilled", unit_rate: 450, working_hours_per_day: 8 },
  { code: "L010", name: "General Helper", name_ar: "عامل مساعد", category: "helper", skill_level: "unskilled", unit_rate: 100, working_hours_per_day: 8 },
];

// Sample Equipment Data (10 items)
const SAMPLE_EQUIPMENT = [
  { code: "E001", name: "Caterpillar Excavator 320", name_ar: "حفار كاتربلر 320", category: "excavator", rental_rate: 1800, includes_operator: true, includes_fuel: false },
  { code: "E002", name: "Caterpillar Wheel Loader 950", name_ar: "شيول كاتربلر 950", category: "loader", rental_rate: 1500, includes_operator: true, includes_fuel: false },
  { code: "E003", name: "Tower Crane", name_ar: "رافعة برجية", category: "crane", rental_rate: 2500, includes_operator: false, includes_fuel: false },
  { code: "E004", name: "Dump Truck 20 Ton", name_ar: "قلاب 20 طن", category: "truck", rental_rate: 800, includes_operator: true, includes_fuel: false },
  { code: "E005", name: "Concrete Mixer", name_ar: "خلاطة خرسانة", category: "mixer", rental_rate: 400, includes_operator: false, includes_fuel: false },
  { code: "E006", name: "Concrete Pump", name_ar: "مضخة خرسانة", category: "pump", rental_rate: 3000, includes_operator: true, includes_fuel: true },
  { code: "E007", name: "Vibratory Roller", name_ar: "رولر اهتزازي", category: "compactor", rental_rate: 900, includes_operator: true, includes_fuel: false },
  { code: "E008", name: "Generator 100 KVA", name_ar: "مولد كهرباء 100 KVA", category: "generator", rental_rate: 600, includes_operator: false, includes_fuel: false },
  { code: "E009", name: "Forklift", name_ar: "رافعة شوكية", category: "forklift", rental_rate: 500, includes_operator: true, includes_fuel: false },
  { code: "E010", name: "Steel Scaffolding", name_ar: "سقالة حديد", category: "scaffold", rental_rate: 5, unit: "m2", includes_operator: false, includes_fuel: false },
];

export const useSampleLibraryData = () => {
  const { user } = useAuth();

  const addSampleMaterials = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 3); // Valid for 3 months

      const materialsToInsert = SAMPLE_MATERIALS.map((m, index) => ({
        user_id: user.id,
        name: m.name,
        name_ar: m.name_ar,
        category: m.category,
        unit: m.unit,
        unit_price: m.unit_price,
        brand: m.brand || null,
        currency: "SAR",
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 5 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // Stagger validity
        is_verified: index < 5, // First 5 are verified
        source: "sample_data",
        waste_percentage: index % 3 === 0 ? 5 : index % 3 === 1 ? 3 : 0,
      }));

      const { error } = await supabase
        .from('material_prices')
        .insert(materialsToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample materials:', error);
      return false;
    }
  }, [user]);

  const addSampleLabor = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 2); // Valid for 2 months

      const laborToInsert = SAMPLE_LABOR.map((l, index) => ({
        user_id: user.id,
        code: l.code,
        name: l.name,
        name_ar: l.name_ar,
        category: l.category,
        skill_level: l.skill_level,
        unit: "day",
        unit_rate: l.unit_rate,
        working_hours_per_day: l.working_hours_per_day,
        hourly_rate: l.unit_rate / l.working_hours_per_day,
        currency: "SAR",
        overtime_percentage: 50,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from('labor_rates')
        .insert(laborToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample labor:', error);
      return false;
    }
  }, [user]);

  const addSampleEquipment = useCallback(async () => {
    if (!user) return false;

    try {
      const today = new Date();
      const validUntil = new Date(today);
      validUntil.setMonth(validUntil.getMonth() + 2); // Valid for 2 months

      const equipmentToInsert = SAMPLE_EQUIPMENT.map((e, index) => ({
        user_id: user.id,
        code: e.code,
        name: e.name,
        name_ar: e.name_ar,
        category: e.category,
        unit: e.unit || "day",
        rental_rate: e.rental_rate,
        operation_rate: 0,
        hourly_rate: e.rental_rate / 8,
        monthly_rate: e.rental_rate * 26,
        currency: "SAR",
        includes_operator: e.includes_operator,
        includes_fuel: e.includes_fuel,
        price_date: today.toISOString().split('T')[0],
        valid_until: new Date(validUntil.getTime() - (index * 4 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      }));

      const { error } = await supabase
        .from('equipment_rates')
        .insert(equipmentToInsert);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding sample equipment:', error);
      return false;
    }
  }, [user]);

  const addAllSampleData = useCallback(async () => {
    try {
      const results = await Promise.all([
        addSampleMaterials(),
        addSampleLabor(),
        addSampleEquipment(),
      ]);

      if (results.every(r => r)) {
        toast.success('تم إضافة البيانات التجريبية بنجاح');
        return true;
      } else {
        toast.error('فشل في إضافة بعض البيانات');
        return false;
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
      toast.error('فشل في إضافة البيانات التجريبية');
      return false;
    }
  }, [addSampleMaterials, addSampleLabor, addSampleEquipment]);

  return {
    addSampleMaterials,
    addSampleLabor,
    addSampleEquipment,
    addAllSampleData,
    sampleCounts: {
      materials: SAMPLE_MATERIALS.length,
      labor: SAMPLE_LABOR.length,
      equipment: SAMPLE_EQUIPMENT.length,
    },
  };
};
