-- Update Life X product names to include age range
UPDATE insurance_plans
SET product_name = product_name || ' (' || age_range || ')'
WHERE company_name = 'Life X'
AND age_range IS NOT NULL
AND product_name NOT LIKE '%(%)';
