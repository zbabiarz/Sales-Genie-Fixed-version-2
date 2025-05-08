// Replace this

// Check age range eligibility
if (clientData.age && plan.age_range && plan.age_range !== "All Ages") {
  console.log(
    `Checking age eligibility: Client age ${clientData.age}, Plan age range ${plan.age_range}`,
  );
  const isEligibleAge = isAgeInRange(clientData.age, plan.age_range);
  if (!isEligibleAge) {
    console.log(
      `AGE CHECK: FAILED - Age range mismatch: ${clientData.age} not in ${plan.age_range}`,
    );
    return false;
  } else {
    console.log(
      `AGE CHECK: PASSED - Client age ${clientData.age} is within plan range ${plan.age_range}`,
    );
  }
} else {
  console.log(
    `AGE CHECK: PASSED - Client age ${clientData.age || "not provided"}, Plan age range ${plan.age_range || "not specified"}`,
  );
}
