// This function acts as a CORS proxy for the n8n webhook

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      throw new Error("No target URL provided");
    }

    // Forward the request to the target URL
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // Forward all headers except host
        ...Object.fromEntries(
          [...req.headers.entries()].filter(
            ([key]) => key.toLowerCase() !== "host",
          ),
        ),
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? await req.blob()
          : undefined,
    });

    // Get the response body
    const responseBody = await response.blob();

    // Return the response with CORS headers
    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        ...Object.fromEntries(response.headers.entries()),
      },
    });
  } catch (error) {
    console.error("Error in proxy function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
