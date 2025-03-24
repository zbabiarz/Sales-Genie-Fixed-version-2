import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { threadId } = await request.json();

    if (!threadId) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 },
      );
    }

    // Get the messages from the thread with the OpenAI-Beta header for v2
    const messages = await openai.beta.threads.messages.list(threadId, {
      headers: {
        "OpenAI-Beta": "assistants=v2",
      },
    });

    return NextResponse.json({ messages: messages.data });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve messages" },
      { status: 500 },
    );
  }
}
