export interface ClientData {
  full_name: string;
  date_of_birth: string;
  zip_code?: string;
  state: string;
  height?: number;
  height_feet?: number;
  height_inches?: number;
  weight?: number;
  gender?: string;
  age?: number;
  health_conditions: string[];
  medications: string[];
  coverage_type?: "individual" | "family";
  dependents?: Dependent[];
}

interface Dependent {
  relationship: string;
  full_name: string;
  date_of_birth: string;
  height?: number;
  height_feet?: number;
  height_inches?: number;
  weight?: number;
  gender?: string;
  health_conditions: string[];
  medications: string[];
}

interface HeightWeightEntry {
  gender: string;
  min_weight: number;
  max_weight: number;
  height_feet: number;
  height_inches: number;
}

export interface InsurancePlanV2 {
  id: string;
  carrier_id?: string;
  company_name: string;
  product_name: string;
  product_category: string;
  available_states: string[];
  age_min?: number | null;
  age_max?: number | null;
  gender?: string | null;
  underwriting_type: string;
  disqualifying_conditions: string[];
  disqualifying_medications: string[];
  height_weight_table?: HeightWeightEntry[] | null;
  max_weight_male?: number | null;
  max_weight_female?: number | null;
  plan_type?: string;
  benefit_summary?: string | null;
  key_features: string[];
  price_min?: number | null;
  price_max?: number | null;
  price_notes?: string | null;
  deductible_options: string[];
  coverage_duration?: string | null;
  waiting_period?: string | null;
  network?: string | null;
  tobacco_affects_rate?: boolean;
  source_pdf?: string | null;
  extraction_confidence?: string;
  notes?: string | null;
  // Computed fields for compatibility with table component
  eligibility_status?: "eligible" | "potential";
}

// Backward compatibility alias
export type InsurancePlan = InsurancePlanV2;

// Check if client age is within plan's age range
export function isAgeEligible(clientAge: number, ageMin?: number | null, ageMax?: number | null): boolean {
  if (ageMin == null && ageMax == null) return true;
  if (ageMin != null && clientAge < ageMin) return false;
  if (ageMax != null && clientAge > ageMax) return false;
  return true;
}

// Check height/weight eligibility against the plan's build chart
export function checkBuildEligibility(
  gender: string,
  weight: number,
  heightFeet: number,
  heightInches: number,
  legacyHeight: number | undefined,
  buildChart: HeightWeightEntry[] | null | undefined,
  maxWeightMale?: number | null,
  maxWeightFemale?: number | null,
): boolean {
  // Quick max weight check (uses the simple per-gender max if available)
  if (gender?.toLowerCase() === "male" && maxWeightMale && weight > maxWeightMale) {
    return false;
  }
  if (gender?.toLowerCase() === "female" && maxWeightFemale && weight > maxWeightFemale) {
    return false;
  }

  // If no detailed build chart, pass
  if (!buildChart || !Array.isArray(buildChart) || buildChart.length === 0) {
    return true;
  }

  // Filter by gender
  const genderEntries = buildChart.filter(
    (entry) => entry.gender?.toLowerCase() === gender?.toLowerCase(),
  );
  if (genderEntries.length === 0) return true;

  // Calculate total height in inches
  let totalHeightInches: number;
  if (legacyHeight !== undefined && legacyHeight > 0) {
    totalHeightInches = legacyHeight;
  } else {
    totalHeightInches = heightFeet * 12 + heightInches;
  }

  // Find exact or closest height match
  let bestEntry = genderEntries[0];
  let bestDiff = Infinity;

  for (const entry of genderEntries) {
    const entryInches = entry.height_feet * 12 + entry.height_inches;
    const diff = Math.abs(entryInches - totalHeightInches);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestEntry = entry;
    }
  }

  // Only use if within 1 inch
  if (bestDiff > 1) return true;

  return weight >= bestEntry.min_weight && weight <= bestEntry.max_weight;
}

// Check if a client condition matches any disqualifying condition (fuzzy match)
function conditionMatches(clientCondition: string, disqualifyingConditions: string[]): boolean {
  if (!disqualifyingConditions || disqualifyingConditions.length === 0) return false;

  const clientLower = clientCondition.toLowerCase().trim();

  return disqualifyingConditions.some((dq) => {
    const dqLower = dq.toLowerCase().trim();
    // Exact match
    if (clientLower === dqLower) return true;
    // Substring match (either direction)
    if (clientLower.includes(dqLower) || dqLower.includes(clientLower)) return true;
    // Word-part match (for multi-word conditions)
    const dqParts = dqLower.split(/[\/,\-\s]+/).filter((p) => p.length > 3);
    return dqParts.some((part) => clientLower.includes(part));
  });
}

export function filterMatchingPlans(
  clientData: ClientData,
  allPlans: InsurancePlanV2[],
): InsurancePlanV2[] {
  return allPlans.filter((plan) => {
    // 1. State check
    if (
      plan.available_states &&
      plan.available_states.length > 0 &&
      !plan.available_states.includes(clientData.state)
    ) {
      return false;
    }

    // 2. Age check
    if (clientData.age) {
      if (!isAgeEligible(clientData.age, plan.age_min, plan.age_max)) {
        return false;
      }
    }

    // 3. Gender check (some plans are gender-specific)
    if (plan.gender && clientData.gender) {
      if (plan.gender.toLowerCase() !== "any" && plan.gender.toLowerCase() !== clientData.gender.toLowerCase()) {
        return false;
      }
    }

    // 4. Disqualifying health conditions
    if (plan.disqualifying_conditions && plan.disqualifying_conditions.length > 0) {
      for (const condition of clientData.health_conditions || []) {
        if (conditionMatches(condition, plan.disqualifying_conditions)) {
          return false;
        }
      }
      // Check dependents too
      if (clientData.dependents) {
        for (const dep of clientData.dependents) {
          for (const condition of dep.health_conditions || []) {
            if (conditionMatches(condition, plan.disqualifying_conditions)) {
              return false;
            }
          }
        }
      }
    }

    // 5. Disqualifying medications
    if (plan.disqualifying_medications && plan.disqualifying_medications.length > 0) {
      for (const med of clientData.medications || []) {
        if (conditionMatches(med, plan.disqualifying_medications)) {
          return false;
        }
      }
      if (clientData.dependents) {
        for (const dep of clientData.dependents) {
          for (const med of dep.medications || []) {
            if (conditionMatches(med, plan.disqualifying_medications)) {
              return false;
            }
          }
        }
      }
    }

    // 6. Height/weight build chart check
    if (plan.height_weight_table && clientData.weight && clientData.gender) {
      const weightNum = parseFloat(String(clientData.weight)) || 0;
      const heightFeet = parseFloat(String(clientData.height_feet)) || 0;
      const heightInches = parseFloat(String(clientData.height_inches)) || 0;
      const legacyHeight = clientData.height ? parseFloat(String(clientData.height)) : undefined;

      const isEligibleBuild = checkBuildEligibility(
        clientData.gender,
        weightNum,
        heightFeet,
        heightInches,
        legacyHeight,
        plan.height_weight_table,
        plan.max_weight_male,
        plan.max_weight_female,
      );

      if (!isEligibleBuild) return false;
    }

    // All checks passed
    return true;
  });
}
