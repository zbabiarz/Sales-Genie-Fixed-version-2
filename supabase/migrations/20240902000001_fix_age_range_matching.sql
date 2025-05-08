-- Fix age range matching in the database

-- Create a function to check if an age is within a range
CREATE OR REPLACE FUNCTION is_age_in_range(client_age INTEGER, age_range TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Handle 'All Ages' case or empty/null age range
  IF age_range IS NULL OR age_range = 'All Ages' THEN
    RETURN TRUE;
  END IF;

  -- Parse age range in format '18-29', '30-44', '45-54', '55-64', '65+'
  IF age_range LIKE '%+' THEN
    -- For ranges like '65+'
    DECLARE
      min_age INTEGER := CAST(REPLACE(age_range, '+', '') AS INTEGER);
    BEGIN
      RETURN client_age >= min_age;
    END;
  ELSIF age_range LIKE '%-%' THEN
    -- For ranges like '18-29'
    DECLARE
      min_age INTEGER := CAST(SPLIT_PART(age_range, '-', 1) AS INTEGER);
      max_age INTEGER := CAST(SPLIT_PART(age_range, '-', 2) AS INTEGER);
    BEGIN
      RETURN client_age >= min_age AND client_age <= max_age;
    END;
  END IF;

  RETURN FALSE; -- If format is unrecognized
END;
$$ LANGUAGE plpgsql;

-- Create a function to test age range matching
CREATE OR REPLACE FUNCTION test_age_range_matching()
RETURNS TABLE (age INTEGER, range TEXT, matches BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 33 AS age, '18-29' AS range, is_age_in_range(33, '18-29') AS matches
  UNION ALL SELECT 33, '30-44', is_age_in_range(33, '30-44')
  UNION ALL SELECT 33, '45-54', is_age_in_range(33, '45-54')
  UNION ALL SELECT 33, '55-64', is_age_in_range(33, '55-64')
  UNION ALL SELECT 33, '65+', is_age_in_range(33, '65+')
  UNION ALL SELECT 33, 'All Ages', is_age_in_range(33, 'All Ages');
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Enable the RLS policy to use the function
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;

-- Add a comment to the age_range column to document the format
COMMENT ON COLUMN insurance_plans.age_range IS 'Age range format: "18-29", "30-44", "45-54", "55-64", "65+", or "All Ages"';
