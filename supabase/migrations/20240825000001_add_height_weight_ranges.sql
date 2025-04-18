-- Add min_height, max_height, min_weight, and max_weight columns to insurance_plans table
ALTER TABLE insurance_plans
ADD COLUMN min_height numeric,
ADD COLUMN max_height numeric,
ADD COLUMN min_weight numeric,
ADD COLUMN max_weight numeric;

-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN insurance_plans.min_height IS 'Minimum height in inches for eligibility';
COMMENT ON COLUMN insurance_plans.max_height IS 'Maximum height in inches for eligibility';
COMMENT ON COLUMN insurance_plans.min_weight IS 'Minimum weight in pounds for eligibility';
COMMENT ON COLUMN insurance_plans.max_weight IS 'Maximum weight in pounds for eligibility';