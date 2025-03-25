import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

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
    const { customer_id, payment_method_id, action } = await req.json();

    if (!customer_id || !payment_method_id || !action) {
      throw new Error("Missing required parameters");
    }

    let result;

    if (action === "set_default") {
      // Set the payment method as the default for the customer
      result = await stripe.customers.update(customer_id, {
        invoice_settings: {
          default_payment_method: payment_method_id,
        },
      });
    } else if (action === "detach") {
      // Detach the payment method from the customer
      result = await stripe.paymentMethods.detach(payment_method_id);
    } else {
      throw new Error("Invalid action");
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(`Error ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
