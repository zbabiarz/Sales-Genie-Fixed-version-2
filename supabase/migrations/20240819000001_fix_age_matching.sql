-- Update insurance plans to ensure age ranges are properly formatted
-- This will standardize the format to make age matching more reliable

-- First, let's check the current age ranges
SELECT id, product_name, age_range FROM insurance_plans;

-- Update plans with age ranges in product name to ensure they're properly extracted
UPDATE insurance_plans
SET age_range = '30-44'
WHERE product_name LIKE '%(30-44%';

-- Set default age ranges for plans without specific age ranges
UPDATE insurance_plans
SET age_range = 'All Ages'
WHERE age_range IS NULL OR age_range = '';

-- Verify the updates
SELECT id, product_name, age_range FROM insurance_plans;
