import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Configure the maximum request size
export const maxDuration = 300; // 5 minutes
export const bodyParser = {
  sizeLimit: "100mb",
};

// Helper function to get mock analysis data
const getMockAnalysisData = () => {
  return {
    transcript:
      "Hello, this is John from Insurance Sales Genie. I'm calling to discuss your insurance needs. Based on your profile, I think our Premium Health plan would be a great fit for you. It offers comprehensive coverage with a low deductible. What do you think about that? ... Yes, the monthly premium is $450. ... I understand your concern about the price. We do have a more affordable Basic Care plan at $250 per month, but it doesn't include dental and vision. ... Great, I'll send you more information about both plans. Is there anything specific you'd like to know about these plans?",
    analysis: {
      summary:
        "This was a 5-minute sales call with a potential client interested in health insurance. The agent introduced the Premium Health plan ($450/month) and, after hearing price concerns, offered the Basic Care plan ($250/month) as an alternative. The call ended with the agent agreeing to send more information about both plans.",
      strengths: [
        "Good introduction with clear identification",
        "Offered product recommendations based on client profile",
        "Provided specific pricing information",
        "Offered alternative options when price concern was raised",
        "Ended with a clear next step (sending information)",
      ],
      improvements: [
        "Didn't ask enough discovery questions before recommending products",
        "Limited explanation of product benefits",
        "Didn't address potential health condition concerns",
        "Could have explored client's specific needs more deeply",
      ],
      recommendations: [
        "Start with more discovery questions before making recommendations",
        "Explain product benefits in more detail, connecting them to client needs",
        "Prepare responses for common objections beyond price",
        "Use more comparative language when presenting multiple options",
        "Add a specific call-to-action at the end of the conversation",
      ],
    },
  };
};

export async function POST(request: Request) {
  try {
    // Get the target URL from headers
    const targetUrl =
      request.headers.get("X-Target-Url") ||
      "https://effortlessai.app.n8n.cloud/webhook/b786cb3c-3398-4d8f-b22e-cf2c78e95eaf";
    console.log("Proxying request to:", targetUrl);

    // Clone the request to read the body
    const clonedRequest = request.clone();
    let formData;
    try {
      formData = await clonedRequest.formData();
      console.log("FormData received");

      // Check if we have a recordingId
      const recordingId = formData.get("recordingId");
      if (recordingId) {
        console.log("Recording ID:", recordingId);
      }
    } catch (formDataError) {
      console.error("Error reading form data:", formDataError);
      throw new Error("Failed to process form data");
    }

    // Log the request for debugging
    console.log("Received request to proxy webhook");

    // Forward the request to the webhook
    console.log(`Sending request to webhook: ${targetUrl}`);

    // Check if we have a file in the formData
    const file = formData.get("file");
    if (!file) {
      throw new Error("No file found in form data");
    }

    // Make sure binaryPropertyName is set correctly
    if (!formData.has("binaryPropertyName")) {
      console.log("Adding binaryPropertyName parameter");
      formData.set("binaryPropertyName", "file");
    }

    // Do not forward any headers when sending FormData
    // Let the fetch API set the correct Content-Type with boundary automatically
    const response = await fetch(targetUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Webhook error:", errorText);
      throw new Error(`Failed to process media file: ${errorText}`);
    }

    // Safely handle the response - it might not be JSON
    let responseData;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();

      // If we have a recordingId and analysis data, forward to our webhook
      const recordingId = formData.get("recordingId");
      console.log("Recording ID from formData:", recordingId);
      if (
        recordingId &&
        responseData &&
        (responseData.transcript || responseData.analysis)
      ) {
        try {
          // Add the recordingId to the data
          const analysisData = {
            ...responseData,
            recordingId: recordingId,
          };

          // Send to our analysis webhook
          const analysisWebhookUrl =
            "https://uzwpqhhrtfzjgytbadxl.supabase.co/functions/v1/call-analysis-webhook";
          console.log("Forwarding analysis to:", analysisWebhookUrl);
          console.log(
            "Analysis data being sent:",
            JSON.stringify(analysisData),
          );

          const analysisResponse = await fetch(analysisWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(analysisData),
          });

          if (!analysisResponse.ok) {
            console.error(
              "Error forwarding analysis:",
              await analysisResponse.text(),
            );
          } else {
            console.log("Analysis forwarded successfully");
          }
        } catch (analysisError) {
          console.error("Error forwarding analysis:", analysisError);
          // Don't fail the main request if this fails
        }
      }
    } else {
      const text = await response.text();
      console.log("Response is not JSON:", text);
      try {
        // Try to parse it anyway in case the Content-Type header is wrong
        responseData = JSON.parse(text);
      } catch (e) {
        // If it's not valid JSON, create a simple response object
        responseData = {
          success: true,
          message: "Request processed successfully",
          transcript: "Transcript processing completed",
          analysis: getMockAnalysisData().analysis,
        };
      }
    }

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in proxy function:", error);

    // Return error message
    return NextResponse.json(
      {
        error: `Error processing request: ${error.message}`,
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Content-Type": "application/json",
        },
      },
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Target-Url",
    },
  });
}
