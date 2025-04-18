ALTER TABLE insurance_plans DROP COLUMN IF EXISTS height;
ALTER TABLE insurance_plans DROP COLUMN IF EXISTS weight;

-- Update the realtime publication
alter publication supabase_realtime add table insurance_plans;