import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

interface ClientData {
  full_name: string;
  date_of_birth: string;
  zip_code: string;
  state: string;
  height?: number;
  weight?: number;
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
  weight?: number;
  health_conditions: string[];
  medications: string[];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Function to check if a client's age is within a plan's age range
function isAgeInRange(clientAge: number, ageRange: string): boolean {
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

interface BuildChartEntry {
  gender: string;
  min_weight: number;
  max_weight: number;
  height_feet: number;
  height_inches: number;
}

function checkBuildEligibility(
  gender: string,
  weight: number,
  heightFeet: number,
  heightInches: number,
  legacyHeight: number | undefined,
  buildChart: BuildChartEntry[],
): boolean {
  // If no build chart data, consider eligible
  if (!buildChart || !Array.isArray(buildChart) || buildChart.length === 0) {
    console.log("No build chart data available, considering eligible");
    return true;
  }

  console.log(
    `Checking build eligibility - weight: ${weight}, height: ${heightFeet}ft ${heightInches}in`,
  );

  // Filter build chart entries for the client's gender
  const genderEntries = buildChart.filter(
    (entry) => entry.gender.toLowerCase() === gender.toLowerCase(),
  );

  if (genderEntries.length === 0) {
    console.log(`No build chart entries found for gender: ${gender}`);
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
    return entryHeightInches === totalHeightInches;
  });

  // If no exact height match found, find the closest entry
  if (!matchingHeightEntry) {
    console.log(
      `No exact height match found for ${heightFeet}ft ${heightInches}in`,
    );
    // Find closest height entry
    let closestEntry = genderEntries[0];
    let minDifference = Infinity;

    for (const entry of genderEntries) {
      const entryHeightInches = entry.height_feet * 12 + entry.height_inches;
      const difference = Math.abs(entryHeightInches - totalHeightInches);

      if (difference < minDifference) {
        minDifference = difference;
        closestEntry = entry;
      }
    }

    // If the closest entry is within 1 inch, use it
    if (minDifference <= 1) {
      console.log(
        `Using closest height entry: ${closestEntry.height_feet}ft ${closestEntry.height_inches}in (min weight: ${closestEntry.min_weight}, max weight: ${closestEntry.max_weight})`,
      );

      const isEligible =
        weight >= closestEntry.min_weight && weight <= closestEntry.max_weight;
      console.log(
        `Weight ${weight} is ${isEligible ? "within" : "outside"} range ${closestEntry.min_weight}-${closestEntry.max_weight}`,
      );
      return isEligible;
    }

    // If no close match, consider eligible
    console.log("No close height match found, considering eligible");
    return true;
  }

  // Check if weight is within range for the matching height
  const isEligible =
    weight >= matchingHeightEntry.min_weight &&
    weight <= matchingHeightEntry.max_weight;
  console.log(
    `Exact height match found. Weight ${weight} is ${isEligible ? "within" : "outside"} range ${matchingHeightEntry.min_weight}-${matchingHeightEntry.max_weight}`,
  );
  return isEligible;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_KEY") ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6d3BxaGhydGZ6amd5dGJhZHhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTY2MzQ5MiwiZXhwIjoyMDU3MjM5NDkyfQ.gX2vUc5R50inxpt8F4n0LSBRorpeRQdDmoizdtoM4cE";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client data from request
    const clientData: ClientData = await req.json();

    // Validate required fields
    if (
      !clientData.full_name ||
      !clientData.date_of_birth ||
      !clientData.state ||
      !clientData.zip_code
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get all insurance plans
    const { data: allPlans, error: plansError } = await supabase
      .from("insurance_plans")
      .select("*");

    if (plansError) {
      throw plansError;
    }

    // Log all plans for debugging
    console.log(`Total plans found: ${allPlans.length}`);
    // Log Reserve National plans specifically
    const reservePlans = allPlans.filter((plan) =>
      plan.company_name.includes("Reserve National"),
    );
    console.log(`Reserve National plans found: ${reservePlans.length}`);
    if (reservePlans.length > 0) {
      console.log(
        "Reserve National plan details:",
        JSON.stringify(reservePlans[0]),
      );
    }

    // Filter plans based on client data
    const matchingPlans = allPlans.filter((plan) => {
      // Check state availability
      if (
        plan.available_states &&
        plan.available_states.length > 0 &&
        !plan.available_states.includes(clientData.state)
      ) {
        console.log(
          `State mismatch: Client state ${clientData.state} not in plan states ${JSON.stringify(plan.available_states)}`,
        );
        return false;
      }

      // Check ZIP code availability if specified
      if (
        plan.available_zip_codes &&
        plan.available_zip_codes.length > 0 &&
        !plan.available_zip_codes.includes(clientData.zip_code)
      ) {
        return false;
      }

      // Check coverage type (individual vs family)
      if (
        clientData.coverage_type === "individual" &&
        plan.coverage_type === "family"
      ) {
        console.log(`Filtering out family plan: ${plan.product_name}`);
        return false;
      } else if (
        clientData.coverage_type === "family" &&
        plan.coverage_type === "individual"
      ) {
        // For family coverage, filter out individual-only plans
        console.log(
          `Filtering out individual-only plan for family: ${plan.product_name}`,
        );
        return false;
      }

      // Check age range eligibility
      if (clientData.age) {
        console.log(
          `Checking age eligibility: Client age ${clientData.age}, Plan age range ${plan.age_range || "All Ages"}`,
        );

        // If plan has a specific age range (not "All Ages" or empty)
        if (plan.age_range && plan.age_range !== "All Ages") {
          // Parse age range in format '18-29', '30-44', '45-54', '55-64', '65+'
          let isEligibleAge = false;

          if (plan.age_range.endsWith("+")) {
            // For ranges like '65+'
            const minAge = parseInt(plan.age_range.replace("+", ""));
            isEligibleAge = clientData.age >= minAge;
            console.log(
              `Range ${plan.age_range}: minAge=${minAge}, result=${isEligibleAge}`,
            );
          } else if (plan.age_range.includes("-")) {
            // For ranges like '18-29'
            const [minAge, maxAge] = plan.age_range.split("-").map(Number);
            isEligibleAge =
              clientData.age >= minAge && clientData.age <= maxAge;
            console.log(
              `Range ${plan.age_range}: minAge=${minAge}, maxAge=${maxAge}, result=${isEligibleAge}`,
            );
          }

          if (!isEligibleAge) {
            console.log(
              `AGE CHECK: FAILED - Age range mismatch: ${clientData.age} not in ${plan.age_range}`,
            );
            return false;
          }
        }

        console.log(
          `AGE CHECK: PASSED - Client age ${clientData.age} is acceptable for plan`,
        );
      } else {
        console.log(
          `Age check skipped: Client age not provided, Plan age range ${plan.age_range || "All Ages"}`,
        );
      }

      // Check disqualifying health conditions
      if (
        plan.disqualifying_health_conditions &&
        plan.disqualifying_health_conditions.length > 0
      ) {
        for (const condition of clientData.health_conditions || []) {
          // Check for partial matches in disqualifying conditions
          const partialMatch = plan.disqualifying_health_conditions.some(
            (disqualifyingCondition) => {
              // Case insensitive check
              const clientConditionLower = condition.toLowerCase();
              const disqualifyingConditionLower =
                disqualifyingCondition.toLowerCase();

              // Check if client condition is part of a disqualifying condition
              // or if disqualifying condition contains the client condition
              const isPartialMatch =
                disqualifyingConditionLower.includes(clientConditionLower) ||
                clientConditionLower.includes(disqualifyingConditionLower) ||
                // Split by common separators and check each part
                disqualifyingConditionLower
                  .split(/[\/,\-\s]+/)
                  .some(
                    (part) =>
                      part === clientConditionLower ||
                      (part.length > 3 && clientConditionLower.includes(part)),
                  );

              console.log(
                `Partial match check - Client: "${clientConditionLower}" vs Disqualifying: "${disqualifyingConditionLower}" - Match: ${isPartialMatch}`,
              );

              return isPartialMatch;
            },
          );

          if (partialMatch) {
            console.log(
              `HEALTH CONDITIONS CHECK: FAILED - Client has disqualifying condition (partial match): ${condition}`,
            );
            return false;
          }
        }

        // Also check dependents' health conditions if any
        if (clientData.dependents && clientData.dependents.length > 0) {
          for (const dependent of clientData.dependents) {
            for (const condition of dependent.health_conditions || []) {
              // Check for partial matches in disqualifying conditions
              const partialMatch = plan.disqualifying_health_conditions.some(
                (disqualifyingCondition) => {
                  // Case insensitive check
                  const dependentConditionLower = condition.toLowerCase();
                  const disqualifyingConditionLower =
                    disqualifyingCondition.toLowerCase();

                  // Check if dependent condition is part of a disqualifying condition
                  // or if disqualifying condition contains the dependent condition
                  const isPartialMatch =
                    disqualifyingConditionLower.includes(
                      dependentConditionLower,
                    ) ||
                    dependentConditionLower.includes(
                      disqualifyingConditionLower,
                    ) ||
                    // Split by common separators and check each part
                    disqualifyingConditionLower
                      .split(/[\/,\-\s]+/)
                      .some(
                        (part) =>
                          part === dependentConditionLower ||
                          (part.length > 3 &&
                            dependentConditionLower.includes(part)),
                      );

                  console.log(
                    `Dependent partial match check - Dependent: "${dependentConditionLower}" vs Disqualifying: "${disqualifyingConditionLower}" - Match: ${isPartialMatch}`,
                  );

                  return isPartialMatch;
                },
              );

              if (partialMatch) {
                console.log(
                  `HEALTH CONDITIONS CHECK: FAILED - Dependent has disqualifying condition (partial match): ${condition}`,
                );
                return false;
              }
            }
          }
        }
      }

      // Check disqualifying medications
      if (
        plan.disqualifying_medications &&
        plan.disqualifying_medications.length > 0
      ) {
        for (const medication of clientData.medications || []) {
          if (plan.disqualifying_medications.includes(medication)) {
            return false;
          }
        }

        // Also check dependents' medications if any
        if (clientData.dependents && clientData.dependents.length > 0) {
          for (const dependent of clientData.dependents) {
            for (const medication of dependent.medications || []) {
              if (plan.disqualifying_medications.includes(medication)) {
                return false;
              }
            }
          }
        }
      }

      // Check build chart eligibility if available
      if (plan.build_chart_jsonb && clientData.weight && clientData.gender) {
        console.log(`Checking build chart for ${plan.product_name}`);

        // Use either the new height fields or legacy height
        const heightFeet = clientData.height_feet || 0;
        const heightInches = clientData.height_inches || 0;
        const legacyHeight = clientData.height
          ? parseFloat(String(clientData.height))
          : undefined;

        console.log(
          `Before eligibility check - weight: ${weightNum} (${typeof weightNum}), height: ${heightFeet}ft ${heightInches}in`,
        );
        console.log(
          `Weight conversion: ${clientData.weight} (${typeof clientData.weight}) -> ${weightNum} (${typeof weightNum})`,
        );

        // Quick check against maximum weight in chart
        if (weightNum > maxWeightInChart) {
          console.log(
            `QUICK CHECK FAILED: Client weight ${weightNum} exceeds maximum chart weight ${maxWeightInChart}`,
          );
          return false;
        }
      }

      // If all checks pass, the plan is a match
      return true;
    });

    return new Response(JSON.stringify({ matchingPlans }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
