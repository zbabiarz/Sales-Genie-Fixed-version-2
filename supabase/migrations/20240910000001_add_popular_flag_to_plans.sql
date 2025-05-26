-- Add is_popular column to insurance_plans table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'insurance_plans' 
                AND column_name = 'is_popular') THEN
    ALTER TABLE insurance_plans ADD COLUMN is_popular BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Mark some plans as popular for demonstration
UPDATE insurance_plans
SET is_popular = true
WHERE id IN (
  -- Select a few plans to mark as popular (adjust these IDs as needed)
  SELECT id FROM insurance_plans WHERE product_category = 'Health' LIMIT 3
);

UPDATE insurance_plans
SET is_popular = true
WHERE id IN (
  -- Select a few dental plans to mark as popular
  SELECT id FROM insurance_plans WHERE product_category = 'Dental' LIMIT 2
);

UPDATE insurance_plans
SET is_popular = true
WHERE id IN (
  -- Select a few life insurance plans to mark as popular
  SELECT id FROM insurance_plans WHERE product_category = 'Life' LIMIT 2
);

-- Mark all plans with 'VL $250 Deductible' in product_name as popular
UPDATE insurance_plans
SET is_popular = true
WHERE product_name LIKE '%VL $250 Deductible%';

-- Mark all plans with 'Affordable Choice' in product_name as popular
UPDATE insurance_plans
SET is_popular = true
WHERE product_name LIKE '%Affordable Choice%';

-- Enable realtime for this table if not already enabled
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE insurance_plans;
