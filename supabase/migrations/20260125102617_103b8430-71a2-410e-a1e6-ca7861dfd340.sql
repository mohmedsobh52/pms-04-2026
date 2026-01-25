-- Add columns for direct costs and project area to tender_pricing table
ALTER TABLE tender_pricing
ADD COLUMN IF NOT EXISTS project_area numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_materials_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_labor_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_equipment_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_direct_costs numeric DEFAULT 0;