interface ClientData {
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

interface BuildChartEntry {
  gender: string;
  min_weight: number;
  max_weight: number;
  height_feet: number;
  height_inches: number;
}

interface InsurancePlan {
  id: string;
  company_name: string;
  product_name: string;
  product_category: string;
  product_price: number;
  product_benefits: string;
  available_states?: string[];
  available_zip_codes?: string[];
  coverage_type?: string;
  age_range?: string;
  disqualifying_health_conditions?: string[];
  disqualifying_medications?: string[];
  build_chart_jsonb?: BuildChartEntry[];
}

// Function to check if a client's age is within a plan's age range
export function isAgeInRange(clientAge: number, ageRange: string): boolean {
  // Handle 'All Ages' case or empty/null age range
  if (!ageRange || ageRange === "All Ages") return true;

  // Parse age range in format '18-29', '30-44', '45-54', '55-64', '65+'
  if (ageRange.endsWith("+")) {
    // For ranges like '65+'
    const minAge = parseInt(ageRange.replace("+", ""));
    return clientAge >= minAge;
  } else if (ageRange.includes("-")) {
    // For ranges like '18-29'
    const [minAge, maxAge] = ageRange.split("-").map(Number);
    return clientAge >= minAge && clientAge <= maxAge;
  }

  return false; // If format is unrecognized
}

export function checkBuildEligibility(
  gender: string,
  weight: number,
  heightFeet: number,
  heightInches: number,
  legacyHeight: number | undefined,
  buildChart: BuildChartEntry[],
): boolean {
  // Quick check for weight exceeding maximum in chart
  let maxWeightInChart = 0;
  if (buildChart && Array.isArray(buildChart)) {
    buildChart.forEach((entry) => {
      if (entry.max_weight > maxWeightInChart) {
        maxWeightInChart = entry.max_weight;
      }
    });

    if (weight > maxWeightInChart) {
      console.log(
        `IMMEDIATE REJECTION: Weight ${weight} exceeds maximum chart weight ${maxWeightInChart}`,
      );
      return false;
    }
  }
  console.log("\n===== BUILD ELIGIBILITY CHECK START =====");
  console.log(`Input values - Gender: ${gender}, Weight: ${weight} lbs`);
  console.log(
    `Height: ${heightFeet}ft ${heightInches}in, Legacy height: ${legacyHeight || "N/A"}`,
  );
  console.log(
    `Weight type: ${typeof weight}, Height feet type: ${typeof heightFeet}, Height inches type: ${typeof heightInches}`,
  );

  // If no build chart data, consider eligible
  if (!buildChart || !Array.isArray(buildChart) || buildChart.length === 0) {
    console.log("No build chart data available, considering eligible");
    console.log("===== BUILD ELIGIBILITY CHECK END =====\n");
    return true;
  }

  console.log(`Build chart entries: ${buildChart.length}`);
  console.log(`First entry sample: ${JSON.stringify(buildChart[0])}`);
  console.log(
    `Checking build eligibility - weight: ${weight}, height: ${heightFeet}ft ${heightInches}in`,
  );

  // Filter build chart entries for the client's gender
  const genderEntries = buildChart.filter(
    (entry) => entry.gender.toLowerCase() === gender.toLowerCase(),
  );

  console.log(
    `Gender-specific entries found: ${genderEntries.length} for ${gender}`,
  );

  if (genderEntries.length === 0) {
    console.log(`No build chart entries found for gender: ${gender}`);
    console.log("===== BUILD ELIGIBILITY CHECK END =====\n");
    return true; // If no entries for this gender, consider eligible
  }

  // Calculate total height in inches for comparison
  let totalHeightInches: number;

  if (legacyHeight !== undefined && legacyHeight > 0) {
    // Use legacy height if provided
    totalHeightInches = legacyHeight;
    console.log(`Using legacy height: ${totalHeightInches} inches`);
  } else {
    // Calculate from feet and inches
    totalHeightInches = heightFeet * 12 + heightInches;
    console.log(
      `Calculated height: ${totalHeightInches} inches (${heightFeet}ft ${heightInches}in)`,
    );
  }

  // Find the entry that matches the client's height
  const matchingHeightEntry = genderEntries.find((entry) => {
    const entryHeightInches = entry.height_feet * 12 + entry.height_inches;
    const matches = entryHeightInches === totalHeightInches;
    console.log(
      `Comparing heights - Entry: ${entry.height_feet}ft ${entry.height_inches}in (${entryHeightInches}in) vs Client: ${totalHeightInches}in - Match: ${matches}`,
    );
    return matches;
  });

  // If no exact height match found, find the closest entry
  if (!matchingHeightEntry) {
    console.log(
      `No exact height match found for ${heightFeet}ft ${heightInches}in (${totalHeightInches}in)`,
    );
    // Find closest height entry
    let closestEntry = genderEntries[0];
    let minDifference = Infinity;

    console.log("Searching for closest height match:");
    for (const entry of genderEntries) {
      const entryHeightInches = entry.height_feet * 12 + entry.height_inches;
      const difference = Math.abs(entryHeightInches - totalHeightInches);

      console.log(
        `Entry: ${entry.height_feet}ft ${entry.height_inches}in (${entryHeightInches}in) - Difference: ${difference}in`,
      );

      if (difference < minDifference) {
        minDifference = difference;
        closestEntry = entry;
        console.log(
          `New closest match: ${entry.height_feet}ft ${entry.height_inches}in with difference of ${difference}in`,
        );
      }
    }

    // If the closest entry is within 1 inch, use it
    if (minDifference <= 1) {
      console.log(
        `Using closest height entry: ${closestEntry.height_feet}ft ${closestEntry.height_inches}in (min weight: ${closestEntry.min_weight}, max weight: ${closestEntry.max_weight})`,
      );
      console.log(
        `Client weight: ${weight} lbs, Min allowed: ${closestEntry.min_weight} lbs, Max allowed: ${closestEntry.max_weight} lbs`,
      );
      console.log(
        `Weight >= Min check: ${weight} >= ${closestEntry.min_weight} = ${weight >= closestEntry.min_weight}`,
      );
      console.log(
        `Weight <= Max check: ${weight} <= ${closestEntry.max_weight} = ${weight <= closestEntry.max_weight}`,
      );

      const isEligible =
        weight >= closestEntry.min_weight && weight <= closestEntry.max_weight;
      console.log(
        `Weight ${weight} is ${isEligible ? "within" : "outside"} range ${closestEntry.min_weight}-${closestEntry.max_weight}`,
      );
      console.log(`Final eligibility result: ${isEligible}`);
      console.log("===== BUILD ELIGIBILITY CHECK END =====\n");
      return isEligible;
    }

    // If no close match, consider eligible
    console.log("No close height match found, considering eligible");
    console.log("===== BUILD ELIGIBILITY CHECK END =====\n");
    return true;
  }

  // Check if weight is within range for the matching height
  console.log(
    `Exact height match found: ${matchingHeightEntry.height_feet}ft ${matchingHeightEntry.height_inches}in`,
  );
  console.log(
    `Client weight: ${weight} lbs, Min allowed: ${matchingHeightEntry.min_weight} lbs, Max allowed: ${matchingHeightEntry.max_weight} lbs`,
  );
  console.log(
    `Weight >= Min check: ${weight} >= ${matchingHeightEntry.min_weight} = ${weight >= matchingHeightEntry.min_weight}`,
  );
  console.log(
    `Weight <= Max check: ${weight} <= ${matchingHeightEntry.max_weight} = ${weight <= matchingHeightEntry.max_weight}`,
  );

  const isEligible =
    weight >= matchingHeightEntry.min_weight &&
    weight <= matchingHeightEntry.max_weight;
  console.log(
    `Exact height match found. Weight ${weight} is ${isEligible ? "within" : "outside"} range ${matchingHeightEntry.min_weight}-${matchingHeightEntry.max_weight}`,
  );
  console.log(`Final eligibility result: ${isEligible}`);
  console.log("===== BUILD ELIGIBILITY CHECK END =====\n");
  return isEligible;
}

export function filterMatchingPlans(
  clientData: ClientData,
  allPlans: InsurancePlan[],
): InsurancePlan[] {
  console.log("========== PLAN FILTERING START ==========");
  console.log(`Total plans to filter: ${allPlans.length}`);
  console.log(
    `Client data: ${JSON.stringify({
      full_name: clientData.full_name,
      gender: clientData.gender,
      state: clientData.state,
      weight: clientData.weight,
      height_feet: clientData.height_feet,
      height_inches: clientData.height_inches,
      age: clientData.age,
      coverage_type: clientData.coverage_type,
      health_conditions_count: clientData.health_conditions?.length || 0,
      medications_count: clientData.medications?.length || 0,
      dependents_count: clientData.dependents?.length || 0,
    })}`,
  );

  // Filter plans based on client data
  const matchingPlans = allPlans.filter((plan) => {
    console.log(
      `\n----- Evaluating Plan: ${plan.company_name} - ${plan.product_name} -----`,
    );

    // Check state availability
    if (
      plan.available_states &&
      plan.available_states.length > 0 &&
      !plan.available_states.includes(clientData.state)
    ) {
      console.log(
        `STATE CHECK: FAILED - Client state ${clientData.state} not in plan states ${JSON.stringify(plan.available_states)}`,
      );
      return false;
    } else {
      console.log(
        `STATE CHECK: PASSED - Client state ${clientData.state} is acceptable`,
      );
    }

    // Check ZIP code availability if specified
    if (
      plan.available_zip_codes &&
      plan.available_zip_codes.length > 0 &&
      clientData.zip_code &&
      !plan.available_zip_codes.includes(clientData.zip_code)
    ) {
      console.log(
        `ZIP CODE CHECK: FAILED - Client zip ${clientData.zip_code} not in plan zip codes`,
      );
      return false;
    } else if (
      plan.available_zip_codes &&
      plan.available_zip_codes.length > 0
    ) {
      console.log(
        `ZIP CODE CHECK: PASSED - Client zip ${clientData.zip_code || "not provided"} is acceptable`,
      );
    }

    // Check coverage type (individual vs family)
    if (
      clientData.coverage_type === "individual" &&
      plan.coverage_type === "family"
    ) {
      console.log(
        `COVERAGE TYPE CHECK: FAILED - Filtering out family plan: ${plan.product_name} for individual client`,
      );
      return false;
    } else if (
      clientData.coverage_type === "family" &&
      plan.coverage_type === "individual"
    ) {
      // For family coverage, filter out individual-only plans
      console.log(
        `COVERAGE TYPE CHECK: FAILED - Filtering out individual-only plan for family: ${plan.product_name}`,
      );
      return false;
    } else {
      console.log(
        `COVERAGE TYPE CHECK: PASSED - Client coverage type ${clientData.coverage_type || "not specified"} matches plan type ${plan.coverage_type || "not specified"}`,
      );
    }

    // Check age range eligibility
    if (clientData.age && plan.age_range && plan.age_range !== "All Ages") {
      console.log(
        `AGE CHECK: Checking age eligibility - Client age ${clientData.age}, Plan age range ${plan.age_range}`,
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

    // Check disqualifying health conditions
    if (
      plan.disqualifying_health_conditions &&
      plan.disqualifying_health_conditions.length > 0
    ) {
      console.log(
        `HEALTH CONDITIONS CHECK: Plan has ${plan.disqualifying_health_conditions.length} disqualifying conditions`,
      );

      for (const condition of clientData.health_conditions || []) {
        const isDisqualifying =
          plan.disqualifying_health_conditions.includes(condition);
        console.log(
          `Checking condition: ${condition} - Disqualifying: ${isDisqualifying}`,
        );
        if (isDisqualifying) {
          console.log(
            `HEALTH CONDITIONS CHECK: FAILED - Client has disqualifying condition: ${condition}`,
          );
          return false;
        }
      }

      // Also check dependents' health conditions if any
      if (clientData.dependents && clientData.dependents.length > 0) {
        console.log(
          `Checking ${clientData.dependents.length} dependents for disqualifying health conditions`,
        );
        for (const dependent of clientData.dependents) {
          for (const condition of dependent.health_conditions || []) {
            const isDisqualifying =
              plan.disqualifying_health_conditions.includes(condition);
            console.log(
              `Checking dependent condition: ${condition} - Disqualifying: ${isDisqualifying}`,
            );
            if (isDisqualifying) {
              console.log(
                `HEALTH CONDITIONS CHECK: FAILED - Dependent has disqualifying condition: ${condition}`,
              );
              return false;
            }
          }
        }
      }
      console.log(
        `HEALTH CONDITIONS CHECK: PASSED - No disqualifying conditions found`,
      );
    } else {
      console.log(
        `HEALTH CONDITIONS CHECK: PASSED - Plan has no disqualifying conditions`,
      );
    }

    // Check disqualifying medications
    if (
      plan.disqualifying_medications &&
      plan.disqualifying_medications.length > 0
    ) {
      console.log(
        `MEDICATIONS CHECK: Plan has ${plan.disqualifying_medications.length} disqualifying medications`,
      );

      for (const medication of clientData.medications || []) {
        const isDisqualifying =
          plan.disqualifying_medications.includes(medication);
        console.log(
          `Checking medication: ${medication} - Disqualifying: ${isDisqualifying}`,
        );
        if (isDisqualifying) {
          console.log(
            `MEDICATIONS CHECK: FAILED - Client has disqualifying medication: ${medication}`,
          );
          return false;
        }
      }

      // Also check dependents' medications if any
      if (clientData.dependents && clientData.dependents.length > 0) {
        console.log(
          `Checking ${clientData.dependents.length} dependents for disqualifying medications`,
        );
        for (const dependent of clientData.dependents) {
          for (const medication of dependent.medications || []) {
            // Check for partial matches in disqualifying medications
            const partialMatch = plan.disqualifying_medications.some(
              (disqualifyingMedication) => {
                // Case insensitive check
                const dependentMedicationLower = medication.toLowerCase();
                const disqualifyingMedicationLower =
                  disqualifyingMedication.toLowerCase();

                // Check if dependent medication is part of a disqualifying medication
                // or if disqualifying medication contains the dependent medication
                const isPartialMatch =
                  disqualifyingMedicationLower.includes(
                    dependentMedicationLower,
                  ) ||
                  dependentMedicationLower.includes(
                    disqualifyingMedicationLower,
                  ) ||
                  // Split by common separators and check each part
                  disqualifyingMedicationLower
                    .split(/[\/,\-\s]+/)
                    .some(
                      (part) =>
                        part === dependentMedicationLower ||
                        (part.length > 3 &&
                          dependentMedicationLower.includes(part)),
                    );

                console.log(
                  `Dependent partial match check - Dependent: "${dependentMedicationLower}" vs Disqualifying: "${disqualifyingMedicationLower}" - Match: ${isPartialMatch}`,
                );

                return isPartialMatch;
              },
            );

            console.log(
              `Checking dependent medication: ${medication} - Partial match found: ${partialMatch}`,
            );

            if (partialMatch) {
              console.log(
                `MEDICATIONS CHECK: FAILED - Dependent has disqualifying medication (partial match): ${medication}`,
              );
              return false;
            }
          }
        }
      }
      console.log(
        `MEDICATIONS CHECK: PASSED - No disqualifying medications found`,
      );
    } else {
      console.log(
        `MEDICATIONS CHECK: PASSED - Plan has no disqualifying medications`,
      );
    }

    // Check build chart eligibility if available
    if (plan.build_chart_jsonb && clientData.weight && clientData.gender) {
      console.log(
        `BUILD CHART CHECK: Checking build chart for ${plan.product_name}`,
      );
      console.log(
        `Company: ${plan.company_name}, Product: ${plan.product_name}`,
      );
      console.log(
        `Client weight: ${clientData.weight} (${typeof clientData.weight}), gender: ${clientData.gender}`,
      );

      // Find the maximum weight in the build chart for debugging
      let maxWeightInChart = 0;
      if (plan.build_chart_jsonb && Array.isArray(plan.build_chart_jsonb)) {
        plan.build_chart_jsonb.forEach((entry) => {
          if (entry.max_weight > maxWeightInChart) {
            maxWeightInChart = entry.max_weight;
          }
        });
      }
      console.log(`Maximum weight in build chart: ${maxWeightInChart}`);
      console.log(
        `Client weight: ${clientData.weight}, Maximum allowed: ${maxWeightInChart}`,
      );
      console.log(
        `Raw comparison: ${clientData.weight} > ${maxWeightInChart} = ${clientData.weight > maxWeightInChart}`,
      );

      // Ensure all values are properly typed as numbers before passing to checkBuildEligibility
      const weightNum = parseFloat(String(clientData.weight)) || 0;
      const heightFeet = parseFloat(String(clientData.height_feet)) || 0;
      const heightInches = parseFloat(String(clientData.height_inches)) || 0;
      const legacyHeight = clientData.height
        ? parseFloat(String(clientData.height))
        : undefined;

      console.log(
        `Before eligibility check - weight: ${weightNum} (${typeof weightNum}), height: ${heightFeet}ft ${heightInches}in`,
      );
      console.log(
        `Weight conversion: ${clientData.weight} (${typeof clientData.weight}) -> ${weightNum} (${typeof weightNum})`,
      );

      const isEligibleBuild = checkBuildEligibility(
        clientData.gender,
        weightNum,
        heightFeet,
        heightInches,
        legacyHeight,
        plan.build_chart_jsonb,
      );

      console.log(
        `BUILD CHART CHECK: Result for ${plan.product_name}: ${isEligibleBuild ? "PASSED" : "FAILED"}`,
      );

      if (!isEligibleBuild) {
        console.log(
          `BUILD CHART CHECK: FAILED - Client weight ${weightNum} outside range for height ${heightFeet}ft ${heightInches}in`,
        );
        return false;
      }
    } else {
      if (!plan.build_chart_jsonb) {
        console.log(
          `BUILD CHART CHECK: PASSED - Plan has no build chart restrictions`,
        );
      } else if (!clientData.weight) {
        console.log(`BUILD CHART CHECK: PASSED - Client weight not provided`);
      } else if (!clientData.gender) {
        console.log(`BUILD CHART CHECK: PASSED - Client gender not provided`);
      }
    }

    // If all checks pass, the plan is a match
    console.log(
      `ALL CHECKS PASSED - Plan is a match: ${plan.company_name} - ${plan.product_name}`,
    );
    return true;
  });

  console.log(`\n========== PLAN FILTERING COMPLETE ==========`);
  console.log(`Total plans evaluated: ${allPlans.length}`);
  console.log(`Matching plans found: ${matchingPlans.length}`);

  return matchingPlans;
}
