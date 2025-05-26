-- Update specific Affordable Choice product names to include age ranges

-- Update product names for Affordable Choice Classic Plus products
UPDATE insurance_plans
SET product_name = CONCAT(product_name, ' (', age_range, ')')
WHERE product_name LIKE '%Affordable Choice Classic Plus%' 
  AND age_range IS NOT NULL
  AND product_name NOT LIKE '%(%'; -- Skip if already has parentheses

-- Update product names for Affordable Choice Classic products
UPDATE insurance_plans
SET product_name = CONCAT(product_name, ' (', age_range, ')')
WHERE product_name LIKE '%Affordable Choice Classic%' 
  AND product_name NOT LIKE '%Affordable Choice Classic Plus%' -- Exclude the Plus variant
  AND age_range IS NOT NULL
  AND product_name NOT LIKE '%(%'; -- Skip if already has parentheses

-- Update product names for Affordable Choice Elite products
UPDATE insurance_plans
SET product_name = CONCAT(product_name, ' (', age_range, ')')
WHERE product_name LIKE '%Affordable Choice Elite%' 
  AND age_range IS NOT NULL
  AND product_name NOT LIKE '%(%'; -- Skip if already has parentheses

-- For any of these products without an age range, add (All Ages)
UPDATE insurance_plans
SET product_name = CONCAT(product_name, ' (All Ages)')
WHERE (product_name LIKE '%Affordable Choice Classic Plus%' 
   OR product_name LIKE '%Affordable Choice Classic%' 
   OR product_name LIKE '%Affordable Choice Elite%')
  AND (age_range IS NULL OR age_range = 'All Ages')
  AND product_name NOT LIKE '%(%'; -- Skip if already has parentheses
