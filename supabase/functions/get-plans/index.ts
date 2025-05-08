import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching active products from Stripe...");
    // Fetch all active products
    const products = await stripe.products.list({
      active: true,
    });

    console.log(
      `Found ${products.data.length} active products:`,
      JSON.stringify(products.data.map((p) => ({ id: p.id, name: p.name }))),
    );

    // Fetch all active prices
    const prices = await stripe.prices.list({
      active: true,
    });

    console.log(`Found ${prices.data.length} active prices`);

    // Combine products with their prices
    const plans = prices.data
      .map((price) => {
        const product = products.data.find((p) => p.id === price.product);

        // Skip if product is not found or not active
        if (!product) return null;

        return {
          id: price.id,
          name: product.name,
          description: product.description || "",
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || "month",
          popular: product.metadata?.popular === "true",
          metadata: product.metadata || {},
          product_id: product.id,
        };
      })
      .filter((plan) => plan !== null); // Remove null entries

    console.log(`Returning ${plans.length} plans`);
    console.log("Plans:", JSON.stringify(plans));

    return new Response(JSON.stringify(plans), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error getting products:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
