-- Fix age range filtering to ensure plans are only shown to clients in the correct age range

-- Update any plans with incorrect age ranges based on product name
UPDATE insurance_plans
SET age_range = '30-44'
WHERE product_name LIKE '%250 Plan (30-44%' OR product_name LIKE '%500 Plan (30-44%' OR product_name LIKE '%750 Plan (30-44%';

UPDATE insurance_plans
SET age_range = '45-54'
WHERE product_name LIKE '%250 Plan (45-54%' OR product_name LIKE '%500 Plan (45-54%' OR product_name LIKE '%750 Plan (45-54%';

UPDATE insurance_plans
SET age_range = '55-64'
WHERE product_name LIKE '%250 Plan (55-64%' OR product_name LIKE '%500 Plan (55-64%' OR product_name LIKE '%750 Plan (55-64%';

-- Make sure Americas Choice plans have correct age ranges
UPDATE insurance_plans
SET age_range = '45-54'
WHERE company_name = 'Americas Choice / Population Science Management (PSM)'
AND product_name LIKE '%45-54%';

UPDATE insurance_plans
SET age_range = '30-44'
WHERE company_name = 'Americas Choice / Population Science Management (PSM)'
AND product_name LIKE '%30-44%';

UPDATE insurance_plans
SET age_range = '55-64'
WHERE company_name = 'Americas Choice / Population Science Management (PSM)'
AND product_name LIKE '%55-64%';

-- Add an index on the age_range column for faster filtering
CREATE INDEX IF NOT EXISTS idx_insurance_plans_age_range ON insurance_plans(age_range);
