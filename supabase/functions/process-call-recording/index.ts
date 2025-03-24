// This edge function handles processing call recordings and sending them to N8N
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the recording ID from the request
    const { recordingId } = await req.json();

    if (!recordingId) {
      throw new Error("Recording ID is required");
    }

    // Get the recording details from the database
    const { data: recording, error: recordingError } = await supabase
      .from("call_recordings")
      .select("*")
      .eq("id", recordingId)
      .single();

    if (recordingError || !recording) {
      throw new Error(`Recording not found: ${recordingError?.message}`);
    }

    // Update the recording status to processing
    await supabase
      .from("call_recordings")
      .update({ status: "processing" })
      .eq("id", recordingId);

    // Get the file URL from storage
    const { data: fileData } = await supabase.storage
      .from("call_recordings")
      .createSignedUrl(recording.file_path, 60 * 60); // 1 hour expiry

    if (!fileData?.signedUrl) {
      throw new Error("Failed to generate signed URL for the recording");
    }

    // Send the file to N8N webhook
    // Replace this URL with your actual N8N webhook URL
    const n8nWebhookUrl = "https://your-n8n-instance.com/webhook/call-analysis";

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recordingId: recording.id,
        userId: recording.user_id,
        fileName: recording.file_name,
        fileUrl: fileData.signedUrl,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error(
        `Failed to send recording to N8N: ${await n8nResponse.text()}`,
      );
    }

    // Update the recording status to sent
    await supabase
      .from("call_recordings")
      .update({ status: "sent_to_n8n" })
      .eq("id", recordingId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Recording sent to N8N for processing",
        recordingId,
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error processing call recording:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});
