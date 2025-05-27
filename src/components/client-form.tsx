import { ClientData, InsurancePlan } from "@/lib/insurance-matching";

function isAgeInRange(clientAge: number, ageRange: string): boolean {
  if (ageRange.endsWith("+")) {
    // For ranges like '65+'
    const minAge = parseInt(ageRange.replace("+", ""));
    return clientAge >= minAge;
  } else if (ageRange.includes("-")) {
    // For ranges like '18-29'
    const [minAge, maxAge] = ageRange.split("-").map(Number);
    return clientAge >= minAge && clientAge <= maxAge;
  }
  return false;
}

export function checkAgeEligibility(
  clientData: ClientData,
  plan: InsurancePlan
): boolean {
  // Check age range eligibility
  if (clientData.age && plan.age_range && plan.age_range !== "All Ages") {
    console.log(
      `Checking age eligibility: Client age ${clientData.age}, Plan age range ${plan.age_range}`
    );
    const isEligibleAge = isAgeInRange(clientData.age, plan.age_range);
    if (!isEligibleAge) {
      console.log(
        `AGE CHECK: FAILED - Age range mismatch: ${clientData.age} not in ${plan.age_range}`
      );
      return false;
    } else {
      console.log(
        `AGE CHECK: PASSED - Client age ${clientData.age} is within plan range ${plan.age_range}`
      );
    }
  } else {
    console.log(
      `AGE CHECK: PASSED - Client age ${clientData.age || "not provided"}, Plan age range ${plan.age_range || "not specified"}`
    );
  }
  return true;
}
