import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify the token is available
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN environment variable is not set");
      return NextResponse.json(
        {
          error: "Server configuration error: BLOB_READ_WRITE_TOKEN not found",
        },
        { status: 500 },
      );
    }

    console.log(
      "BLOB_READ_WRITE_TOKEN is available and starts with:",
      blobToken.substring(0, 20) + "...",
    );

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      token: blobToken,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Here you can add authentication/authorization logic
        // For now, we'll allow uploads but you should add proper auth
        console.log("Generating token for upload:", pathname);
        console.log("Client payload:", clientPayload);
        console.log(
          "Token available in callback:",
          process.env.BLOB_READ_WRITE_TOKEN ? "Yes" : "No",
        );

        return {
          allowedContentTypes: [
            "audio/mpeg",
            "audio/wav",
            "audio/mp3",
            "audio/m4a",
            "audio/aac",
            "audio/ogg",
            "audio/webm",
            "video/mp4",
            "video/mpeg",
            "video/quicktime",
            "video/x-msvideo",
            "video/webm",
            "video/ogg",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB limit
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            recordingId: clientPayload?.recordingId,
            userId: clientPayload?.userId,
            fileName: clientPayload?.fileName,
            fileSize: clientPayload?.fileSize,
            fileType: clientPayload?.fileType,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Call recording upload completed", blob.url, tokenPayload);

        try {
          // Parse the token payload
          const payload = tokenPayload ? JSON.parse(tokenPayload) : {};
          const { recordingId, userId, fileName, fileSize, fileType } = payload;

          // Create Supabase client
          const supabase = createClient();

          // Update the recording record with the blob URL
          if (recordingId) {
            const { error } = await supabase
              .from("call_recordings")
              .update({
                file_url: blob.url,
                status: "uploaded",
                updated_at: new Date().toISOString(),
              })
              .eq("id", recordingId);

            if (error) {
              console.error("Error updating recording with blob URL:", error);
            } else {
              console.log(
                "Successfully updated recording with blob URL:",
                recordingId,
              );
            }
          }

          // Trigger the call analysis webhook with the blob URL
          const webhookUrl =
            "https://effortlessai.app.n8n.cloud/webhook/5735f10d-5868-44b8-884e-cff2b722cb8d";

          // Prepare webhook payload
          const webhookPayload = {
            fileUrl: blob.url,
            fileName: fileName || "recording",
            fileSize: fileSize || 0,
            fileType: fileType || "audio/mpeg",
            recordingId: recordingId || null,
            userId: userId || null,
          };

          console.log("Sending webhook payload:", webhookPayload);

          // Send to the analysis webhook
          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(webhookPayload),
          });

          if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            console.error(
              "Webhook response not OK:",
              webhookResponse.status,
              webhookResponse.statusText,
              errorText,
            );
          } else {
            const responseText = await webhookResponse.text();
            console.log(
              "Successfully triggered analysis webhook:",
              responseText,
            );
          }
        } catch (error) {
          console.error("Error in onUploadCompleted:", error);
          // Don't throw here as it would prevent the upload from completing
          console.error("Upload completed but post-processing failed");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Error in call upload handler:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
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
