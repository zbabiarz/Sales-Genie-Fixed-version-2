import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use hardcoded values for Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Function to extract age range from product name
    const extractAgeRangeFromName = (productName: string): string | null => {
      // Look for patterns like (30-44, Family) or (45-54, Employee)
      const ageRangeMatch = productName.match(
        /\((\d+\-\d+|\d+\+)\s*,\s*[^)]+\)/,
      );
      if (ageRangeMatch && ageRangeMatch[1]) {
        return ageRangeMatch[1]; // Return just the age range part
      }
      return null;
    };

    // Get all Americas Choice plans
    const { data: americasChoicePlans, error: fetchError } = await supabase
      .from("insurance_plans")
      .select("id, product_name, age_range")
      .ilike("company_name", "%Americas Choice%");

    if (fetchError) {
      throw fetchError;
    }

    console.log(
      `Found ${americasChoicePlans?.length || 0} Americas Choice plans`,
    );

    // Update each plan with the correct age range based on product name
    const updates = [];
    for (const plan of americasChoicePlans || []) {
      const ageRangeFromName = extractAgeRangeFromName(plan.product_name);

      if (ageRangeFromName && plan.age_range !== ageRangeFromName) {
        console.log(
          `Updating plan ${plan.id}: ${plan.product_name} from ${plan.age_range} to ${ageRangeFromName}`,
        );

        const { error: updateError } = await supabase
          .from("insurance_plans")
          .update({ age_range: ageRangeFromName })
          .eq("id", plan.id);

        if (updateError) {
          console.error(`Error updating plan ${plan.id}:`, updateError);
        } else {
          updates.push({
            id: plan.id,
            product_name: plan.product_name,
            old_age_range: plan.age_range,
            new_age_range: ageRangeFromName,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updates.length} Americas Choice plans with correct age ranges`,
        updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error fixing Americas Choice plans:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
