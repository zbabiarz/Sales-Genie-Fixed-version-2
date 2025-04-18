-- Check if Reserve National Insurance Company plans exist and their criteria
SELECT 
  id, 
  company_name, 
  product_name, 
  product_category, 
  age_range, 
  available_states, 
  coverage_type,
  disqualifying_health_conditions,
  disqualifying_medications
FROM insurance_plans 
WHERE company_name ILIKE '%Reserve National%';

-- Add a sample Reserve National plan if none exists
INSERT INTO insurance_plans (company_name, product_name, product_category, product_price, product_benefits, age_range, available_states, coverage_type)
SELECT 
  'Reserve National Insurance Company', 
  'Essential Care Plus', 
  'Health', 
  249.99, 
  'Comprehensive health coverage with preventive care benefits', 
  '18-64', 
  ARRAY['AZ', 'CA', 'CO', 'FL', 'GA', 'IL', 'MI', 'NY', 'OH', 'TX'], 
  'individual'
WHERE NOT EXISTS (
  SELECT 1 FROM insurance_plans WHERE company_name ILIKE '%Reserve National%'
);

-- Enable realtime for the table (first drop if exists, then add)
DO $
BEGIN
  -- Check if the table is already in the publication
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'insurance_plans'
  ) THEN
    -- If it exists, drop it first
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE insurance_plans';
  END IF;
  
  -- Now add it (it's safe because we dropped it if it existed)
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE insurance_plans';
END
$;