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

    // Filter plans based on client data
    const matchingPlans = allPlans.filter((plan) => {
      // Check state availability
      if (
        plan.available_states &&
        !plan.available_states.includes(clientData.state)
      ) {
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
      if (clientData.age && plan.age_range && plan.age_range !== "All Ages") {
        console.log(
          `Checking age eligibility: Client age ${clientData.age}, Plan age range ${plan.age_range}`,
        );
        const isEligibleAge = isAgeInRange(clientData.age, plan.age_range);
        if (!isEligibleAge) {
          console.log(
            `Age range mismatch: ${clientData.age} not in ${plan.age_range}`,
          );
          return false;
        }
      }

      // Check disqualifying health conditions
      if (
        plan.disqualifying_health_conditions &&
        plan.disqualifying_health_conditions.length > 0
      ) {
        for (const condition of clientData.health_conditions || []) {
          if (plan.disqualifying_health_conditions.includes(condition)) {
            return false;
          }
        }

        // Also check dependents' health conditions if any
        if (clientData.dependents && clientData.dependents.length > 0) {
          for (const dependent of clientData.dependents) {
            for (const condition of dependent.health_conditions || []) {
              if (plan.disqualifying_health_conditions.includes(condition)) {
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
