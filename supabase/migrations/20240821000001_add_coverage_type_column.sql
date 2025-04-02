-- Add coverage_type column to insurance_plans table

-- First, add the column
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS coverage_type TEXT;

-- Set default values based on product name
UPDATE insurance_plans
SET coverage_type = 'family'
WHERE 
  product_name ILIKE '%family%' OR
  product_name ILIKE '%spouse%' OR
  product_name ILIKE '%child%' OR
  product_name ILIKE '%children%' OR
  product_name ILIKE '%dependent%' OR
  product_name ILIKE '%+ spouse%' OR
  product_name ILIKE '%+ child%';

-- Set all other plans to 'individual'
UPDATE insurance_plans
SET coverage_type = 'individual'
WHERE coverage_type IS NULL;

-- Verify the updates
SELECT id, product_name, coverage_type FROM insurance_plans;
