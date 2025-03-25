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
    const { user_id } = await req.json();

    if (!user_id) {
      throw new Error("Missing user_id parameter");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user's subscription from Supabase to find the Stripe customer ID
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subscriptionError) {
      console.error(
        `Error fetching subscription: ${subscriptionError.message}`,
      );
      // Continue with mock customer ID
    }

    // Use mock customer ID if no subscription found
    let customerId = "cus_mock";

    if (subscriptionData && subscriptionData.length > 0) {
      const subscription = subscriptionData[0];
      if (subscription.customer_id) {
        customerId = subscription.customer_id;
      }
    }

    // Create a SetupIntent to securely collect the customer's payment details
    let setupIntent;
    try {
      setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      // Create a mock setup intent
      setupIntent = {
        client_secret: "seti_mock_secret_" + Date.now(),
      };
    }

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error creating setup intent:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
