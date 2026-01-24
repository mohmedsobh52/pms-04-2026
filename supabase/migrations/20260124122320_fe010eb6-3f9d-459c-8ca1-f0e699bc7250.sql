-- إضافة الأعمدة الجديدة لجدول المواد material_prices
ALTER TABLE material_prices 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS specifications TEXT;

-- إضافة الأعمدة الجديدة لجدول العمالة labor_rates
ALTER TABLE labor_rates 
ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'skilled',
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR',
ADD COLUMN IF NOT EXISTS working_hours_per_day INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;

-- إضافة الأعمدة الجديدة لجدول المعدات equipment_rates
ALTER TABLE equipment_rates 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'SAR',
ADD COLUMN IF NOT EXISTS includes_operator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS includes_fuel BOOLEAN DEFAULT false;