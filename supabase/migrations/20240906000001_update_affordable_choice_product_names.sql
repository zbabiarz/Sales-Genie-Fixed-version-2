-- Update Affordable Choice product names to include age ranges

-- Update product names for Affordable Choice products
UPDATE insurance_plans
SET product_name = CONCAT('Affordable Choice (', age_range, ')')
WHERE product_name = 'Affordable Choice' AND age_range IS NOT NULL;

-- For any Affordable Choice products without an age range, keep the original name
UPDATE insurance_plans
SET product_name = 'Affordable Choice (All Ages)'
WHERE product_name = 'Affordable Choice' AND (age_range IS NULL OR age_range = 'All Ages');
