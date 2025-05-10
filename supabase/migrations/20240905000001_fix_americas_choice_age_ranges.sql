-- Fix Americas Choice age ranges to ensure they match the age ranges in the product names

-- Update Americas Choice plans with age ranges from product names
UPDATE insurance_plans
SET age_range = '30-44'
WHERE company_name LIKE '%Americas Choice%' AND product_name LIKE '%Plan (30-44%';

UPDATE insurance_plans
SET age_range = '45-54'
WHERE company_name LIKE '%Americas Choice%' AND product_name LIKE '%Plan (45-54%';

UPDATE insurance_plans
SET age_range = '55-64'
WHERE company_name LIKE '%Americas Choice%' AND product_name LIKE '%Plan (55-64%';

-- Add an index on product_name for faster searching
CREATE INDEX IF NOT EXISTS idx_insurance_plans_product_name ON insurance_plans(product_name);
