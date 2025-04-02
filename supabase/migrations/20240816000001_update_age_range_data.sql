-- Extract age ranges from product_name and update age_range column

-- Update records with age ranges in parentheses (e.g., '(18-29, Family)')
UPDATE insurance_plans
SET age_range = substring(product_name from '\((\d+)-(\d+),')
WHERE product_name ~ '\(\d+-\d+,';

-- Clean up the extracted age ranges to remove trailing comma
UPDATE insurance_plans
SET age_range = regexp_replace(age_range, ',', '')
WHERE age_range ~ ',';

-- For records that didn't match the first pattern, try another pattern
UPDATE insurance_plans
SET age_range = substring(product_name from '\((\d+)-(\d+)\)')
WHERE age_range IS NULL AND product_name ~ '\(\d+-\d+\)';

-- Set default for any remaining NULL values
UPDATE insurance_plans
SET age_range = 'All Ages'
WHERE age_range IS NULL;
