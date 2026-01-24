-- إضافة أعمدة الصلاحية لجدول العمالة
ALTER TABLE labor_rates 
ADD COLUMN IF NOT EXISTS price_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE;

-- إضافة أعمدة الصلاحية لجدول المعدات
ALTER TABLE equipment_rates 
ADD COLUMN IF NOT EXISTS price_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS valid_until DATE;