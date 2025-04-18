-- Add height_feet and height_inches columns to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS height_feet NUMERIC,
ADD COLUMN IF NOT EXISTS height_inches NUMERIC;

-- Add height_feet and height_inches columns to dependents table
ALTER TABLE dependents
ADD COLUMN IF NOT EXISTS height_feet NUMERIC,
ADD COLUMN IF NOT EXISTS height_inches NUMERIC;

-- Add height_feet_min, height_feet_max, height_inches_min, height_inches_max columns to insurance_plans table
ALTER TABLE insurance_plans
ADD COLUMN IF NOT EXISTS height_feet_min NUMERIC,
ADD COLUMN IF NOT EXISTS height_feet_max NUMERIC,
ADD COLUMN IF NOT EXISTS height_inches_min NUMERIC,
ADD COLUMN IF NOT EXISTS height_inches_max NUMERIC;