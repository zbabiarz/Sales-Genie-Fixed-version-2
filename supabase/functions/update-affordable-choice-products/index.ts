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
    // Use environment variables for Supabase URL and service key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all Affordable Choice products that need updating
    const { data: affordableChoiceProducts, error: fetchError } = await supabase
      .from("insurance_plans")
      .select("id, product_name, age_range")
      .or(
        "product_name.ilike.%Affordable Choice Classic Plus%," +
          "product_name.ilike.%Affordable Choice Classic%," +
          "product_name.ilike.%Affordable Choice Elite%",
      );

    if (fetchError) {
      throw fetchError;
    }

    console.log(
      `Found ${affordableChoiceProducts?.length || 0} Affordable Choice products to update`,
    );

    // Update each product with the age range included in the name
    const updates = [];
    for (const product of affordableChoiceProducts || []) {
      // Skip if the product name already contains parentheses (likely already has age range)
      if (
        product.product_name.includes("(") &&
        product.product_name.includes(")")
      ) {
        console.log(
          `Skipping ${product.product_name} as it already appears to have age range info`,
        );
        continue;
      }

      // Determine the new product name with age range
      let newProductName;
      if (product.age_range) {
        newProductName = `${product.product_name} (${product.age_range})`;
      } else {
        newProductName = `${product.product_name} (All Ages)`;
      }

      console.log(
        `Updating product ${product.id}: from "${product.product_name}" to "${newProductName}"`,
      );

      const { error: updateError } = await supabase
        .from("insurance_plans")
        .update({ product_name: newProductName })
        .eq("id", product.id);

      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
      } else {
        updates.push({
          id: product.id,
          old_product_name: product.product_name,
          new_product_name: newProductName,
          age_range: product.age_range || "All Ages",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated ${updates.length} Affordable Choice products with age ranges in product names`,
        updates,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error updating Affordable Choice products:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
