-- Add age_range column to insurance_plans table
ALTER TABLE insurance_plans ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Update existing records with default age ranges based on product_category
UPDATE insurance_plans SET age_range = 'All Ages' WHERE product_category = 'Health';
UPDATE insurance_plans SET age_range = '0-26' WHERE product_category = 'Child';
UPDATE insurance_plans SET age_range = '27-64' WHERE product_category = 'Adult';
UPDATE insurance_plans SET age_range = '65+' WHERE product_category = 'Senior';
UPDATE insurance_plans SET age_range = 'All Ages' WHERE age_range IS NULL;

-- Add table to realtime publication
alter publication supabase_realtime add table insurance_plans;