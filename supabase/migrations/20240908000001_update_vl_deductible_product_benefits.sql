-- Update product benefits for VL $500/$1,000 Deductible plans
UPDATE insurance_plans
SET product_benefits = 'Coverage includes in-network services with a deductible of $500 for individuals and $1000 for families. Out-of-pocket limits are $9,200 for individuals and $18,400 for families. Covered services include annual lab/x-ray tests, cancer screenings, diabetic supply, immunizations, telemedicine, urgent care, and wellness visits. Some services require precertification.'
WHERE product_name LIKE '%VL $500/$1,000 Deductible%';
