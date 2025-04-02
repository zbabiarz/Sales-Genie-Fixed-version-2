-- Update America's Choice plans to have the correct age range

-- First, let's check the current plans
SELECT id, company_name, product_name, age_range FROM insurance_plans 
WHERE company_name LIKE '%America%Choice%';

-- Update all America's Choice plans to have the correct age range
UPDATE insurance_plans
SET age_range = '30-44'
WHERE company_name LIKE '%America%Choice%' AND product_name LIKE '%(30-44%';

-- Verify the updates
SELECT id, company_name, product_name, age_range FROM insurance_plans 
WHERE company_name LIKE '%America%Choice%';
