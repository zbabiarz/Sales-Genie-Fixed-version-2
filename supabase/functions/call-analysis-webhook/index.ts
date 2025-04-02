// This edge function receives call analysis data from n8n and forwards it to the client
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Use hardcoded values for Supabase URL and service key
    const supabaseUrl = "https://uzwpqhhrtfzjgytbadxl.supabase.co";
    const supabaseServiceKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6d3BxaGhydGZ6amd5dGJhZHhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTY2MzQ5MiwiZXhwIjoyMDU3MjM5NDkyfQ.gX2vUc5R50inxpt8F4n0LSBRorpeRQdDmoizdtoM4cE";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // For GET requests, return mock data for testing
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Call analysis webhook is working",
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Parse the incoming data from n8n
    let data;
    try {
      data = await req.json();
      console.log("Received JSON data from n8n:", data);
    } catch (jsonError) {
      // If JSON parsing fails, try to get the data as text and parse it
      const textData = await req.text();
      console.log("Received text data:", textData);

      try {
        // Try to parse the text as JSON
        data = JSON.parse(textData);
        console.log("Successfully parsed text as JSON:", data);
      } catch (parseError) {
        // If that fails too, create a simple object with the text as feedback
        console.error("Error parsing data as JSON:", parseError);
        data = {
          feedback: textData,
          recordingId: null,
          error: "Received non-JSON data",
        };
      }
    }

    // If we have a recordingId, update the database record
    if (data.recordingId) {
      console.log("Updating recording with ID:", data.recordingId);
      console.log(
        "Transcript data:",
        data.transcript
          ? "Present (length: " + data.transcript.length + ")"
          : "Missing",
      );
      console.log("Analysis data:", data.analysis ? "Present" : "Missing");

      const { error } = await supabase
        .from("call_recordings")
        .update({
          transcript: data.transcript || "No transcript available",
          analysis_results: data.analysis || {},
          status: "analyzed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.recordingId);

      if (error) {
        console.error("Error updating recording:", error);
      } else {
        console.log("Successfully updated recording", data.recordingId);
      }
    }

    // Return the data to the client
    return new Response(JSON.stringify(data), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
      status: 400,
    });
  }
});
