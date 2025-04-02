-- Improved extraction of age ranges from product_name

-- Extract age ranges using a more precise regex pattern
UPDATE insurance_plans
SET age_range = regexp_replace(product_name, '.*\((\d+)-(\d+).*', '\1-\2')
WHERE product_name ~ '\(\d+-\d+.*\)';

-- Set default for any remaining NULL values
UPDATE insurance_plans
SET age_range = 'All Ages'
WHERE age_range IS NULL;

-- Verify the data has been updated correctly
SELECT product_name, age_range FROM insurance_plans;
