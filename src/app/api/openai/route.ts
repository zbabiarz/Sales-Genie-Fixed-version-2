import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "../../../../supabase/server";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-replace-me",
});

export async function POST(request: Request) {
  try {
    const { message, context, threadId, userId } = await request.json();
    const assistantId = process.env.OPENAI_ASSISTANT_ID;

    if (!assistantId) {
      return NextResponse.json(
        { error: "OpenAI Assistant ID not configured" },
        { status: 500 },
      );
    }

    // Use existing thread or create a new one
    let currentThreadId = threadId;
    let isNewThread = false;

    if (!currentThreadId) {
      // Create a new thread with the OpenAI-Beta header for v2
      const thread = await openai.beta.threads.create({
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      });
      currentThreadId = thread.id;
      isNewThread = true;
      console.log(`Created new thread: ${currentThreadId}`);
    } else {
      console.log(`Using existing thread: ${currentThreadId}`);
    }

    // Add a message to the thread with the OpenAI-Beta header for v2
    await openai.beta.threads.messages.create(
      currentThreadId,
      {
        role: "user",
        content: message,
      },
      {
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      },
    );

    // Prepare context as additional instructions if available
    let additionalInstructions = "";
    if (context) {
      additionalInstructions = `Here is additional context that might be helpful:\n\nInsurance Plans: ${JSON.stringify(
        context.insurancePlans,
      )}\n\nHealth Conditions: ${JSON.stringify(
        context.healthConditions,
      )}\n\nMedications: ${JSON.stringify(context.medications)}`;
    }

    // Run the assistant on the thread with the OpenAI-Beta header for v2
    const run = await openai.beta.threads.runs.create(
      currentThreadId,
      {
        assistant_id: assistantId,
        instructions: additionalInstructions
          ? additionalInstructions
          : undefined,
      },
      {
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      },
    );

    // Wait for the run to complete with the OpenAI-Beta header for v2
    let runStatus = await openai.beta.threads.runs.retrieve(
      currentThreadId,
      run.id,
      {
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      },
    );

    while (runStatus.status !== "completed") {
      if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        return NextResponse.json(
          { error: `Run ended with status: ${runStatus.status}` },
          { status: 500 },
        );
      }

      // Wait for a second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(
        currentThreadId,
        run.id,
        {
          headers: {
            "OpenAI-Beta": "assistants=v2",
          },
        },
      );
    }

    // Get the messages from the thread with the OpenAI-Beta header for v2
    const messages = await openai.beta.threads.messages.list(currentThreadId, {
      headers: {
        "OpenAI-Beta": "assistants=v2",
      },
    });

    // Find the last assistant message
    const assistantMessages = messages.data.filter(
      (m) => m.role === "assistant",
    );
    if (assistantMessages.length === 0) {
      return NextResponse.json(
        { error: "No response from assistant" },
        { status: 500 },
      );
    }

    // Get the content of the last assistant message
    const lastMessage = assistantMessages[0];
    let responseText = "";

    for (const content of lastMessage.content) {
      if (content.type === "text") {
        responseText += content.text.value;
      }
    }

    // If this is a new thread and we have a userId, store the thread ID in the database
    if (isNewThread && userId) {
      try {
        const supabase = await createClient();
        await supabase
          .from("users")
          .update({ openai_thread_id: currentThreadId })
          .eq("id", userId);
        console.log(`Associated thread ${currentThreadId} with user ${userId}`);
      } catch (dbError) {
        console.error("Error storing thread ID in database:", dbError);
        // Continue even if storing the thread ID fails
      }
    }

    return NextResponse.json({
      response: responseText,
      threadId: currentThreadId,
    });
  } catch (error) {
    console.error("Error processing OpenAI request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
