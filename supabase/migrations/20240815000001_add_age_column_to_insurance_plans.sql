-- Add age column to insurance_plans table
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Update existing records with default age ranges
UPDATE insurance_plans SET age_range = '18-65' WHERE product_category = 'Health';
UPDATE insurance_plans SET age_range = '65+' WHERE product_category = 'Medicare Supplement';
UPDATE insurance_plans SET age_range = '18-75' WHERE product_category = 'Life';
UPDATE insurance_plans SET age_range = 'All Ages' WHERE product_category IN ('Dental', 'Vision');

-- Add publication for realtime
alter publication supabase_realtime add table insurance_plans;
