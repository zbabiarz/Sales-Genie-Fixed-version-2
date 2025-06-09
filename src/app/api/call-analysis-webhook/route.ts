import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    // Parse the incoming data
    const data = await request.json();
    console.log("Received analysis data:", data);

    // Create Supabase client with service key for admin operations
    const supabase = createClient();

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
        return NextResponse.json(
          { error: "Failed to update recording" },
          { status: 500 },
        );
      } else {
        console.log("Successfully updated recording", data.recordingId);
      }
    }

    // Return success response
    return NextResponse.json(
      { success: true, message: "Analysis data processed successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error processing analysis data:", error);
    return NextResponse.json(
      { error: "Failed to process analysis data" },
      { status: 500 },
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
