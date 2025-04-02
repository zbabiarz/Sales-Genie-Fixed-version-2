-- First, let's identify any duplicate rows based on company_name, product_name, and product_category
-- These are likely the key business identifiers for an insurance plan

-- Create a temporary table to store duplicate records
CREATE TEMP TABLE duplicate_plans AS
SELECT 
    id,
    company_name,
    product_name,
    product_category,
    COUNT(*) OVER (PARTITION BY company_name, product_name, product_category) as duplicate_count
FROM insurance_plans
WHERE (company_name, product_name, product_category) IN (
    SELECT company_name, product_name, product_category
    FROM insurance_plans
    GROUP BY company_name, product_name, product_category
    HAVING COUNT(*) > 1
);

-- Display the duplicates for review
SELECT * FROM duplicate_plans ORDER BY company_name, product_name, product_category;

-- If duplicates exist and you want to remove them, keeping only one record per unique combination:
-- This will keep the record with the lowest ID for each duplicate group
DELETE FROM insurance_plans
WHERE id IN (
    SELECT id FROM (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY company_name, product_name, product_category ORDER BY id) as row_num
        FROM insurance_plans
    ) t
    WHERE t.row_num > 1
);

-- Verify that duplicates have been removed
SELECT 
    company_name, 
    product_name, 
    product_category, 
    COUNT(*) as count
FROM insurance_plans
GROUP BY company_name, product_name, product_category
HAVING COUNT(*) > 1;

-- Drop the temporary table
DROP TABLE IF EXISTS duplicate_plans;
