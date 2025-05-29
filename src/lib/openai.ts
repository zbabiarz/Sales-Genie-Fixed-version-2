import OpenAI from "openai";

// Initialize the OpenAI client with the API key from environment variables
let openai: OpenAI | null = null;

export const getOpenAIClient = () => {
  // Only create a new client if one doesn't exist and if the API key is available
  if (!openai) {
    // Check if we're on client or server side
    const isClient = typeof window !== "undefined";

    // Use the appropriate environment variable based on client/server context
    const apiKey = isClient
      ? process.env.NEXT_PUBLIC_OPENAI_API_KEY
      : process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === "dummy-key-replace-me") {
      console.error("OpenAI API key is missing or invalid");
    }

    openai = new OpenAI({
      apiKey: apiKey || "dummy-key-replace-me",
      dangerouslyAllowBrowser: isClient, // Only needed for client-side
    });
  }

  return openai;
};

export const getAssistantId = () => {
  return process.env.NEXT_PUBLIC_OPENAI_ASSISTANT_ID;
};

// Function to create a thread and send a message to the OpenAI Assistant
export const sendMessageToAssistant = async (
  message: string,
  context?: any,
) => {
  const client = getOpenAIClient();
  const assistantId = getAssistantId();

  if (!client || !assistantId) {
    throw new Error("OpenAI client or Assistant ID not configured");
  }

  try {
    console.log("Sending message to OpenAI Assistant:", message);
    console.log("Using Assistant ID:", assistantId);

    // Create a thread with the OpenAI-Beta header for v2
    const thread = await client.beta.threads.create({
      headers: {
        "OpenAI-Beta": "assistants=v2",
      },
    });
    console.log("Created thread:", thread.id);

    // Add a message to the thread with the OpenAI-Beta header for v2
    await client.beta.threads.messages.create(
      thread.id,
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
    console.log("Added message to thread");

    // Prepare context as additional instructions if available
    let additionalInstructions = "";
    if (context) {
      try {
        // Truncate each part of the context to ensure we don't exceed OpenAI's limit
        // Total token limit is ~128K tokens which is roughly 256K chars
        const maxCharsPerSection = 20000; // Significantly reduced to prevent context overflow
        const maxTotalChars = 60000; // Reduced total character limit to stay well under API limits

        // Helper function to truncate JSON strings
        const truncateJSON = (obj, maxLength) => {
          if (!obj || (Array.isArray(obj) && obj.length === 0)) return "[]";

          try {
            const str = JSON.stringify(obj);
            if (str.length <= maxLength) return str;

            // For arrays, prioritize the first few items
            if (Array.isArray(obj) && obj.length > 0) {
              // Calculate how many items we can include
              const avgItemSize = str.length / obj.length;
              const itemsToInclude = Math.max(
                1,
                Math.floor(maxLength / avgItemSize) - 1,
              );

              // Include the most important items (first few)
              return (
                JSON.stringify(obj.slice(0, itemsToInclude)) +
                `... (${obj.length - itemsToInclude} more items truncated)`
              );
            }

            return str.substring(0, maxLength) + "... (truncated)";
          } catch (jsonError) {
            console.error("Error stringifying context object:", jsonError);
            return "[Error processing data]";
          }
        };

        // Limit the total context size more aggressively
        const maxPlansToInclude = 20;
        const plansToUse = Array.isArray(context.insurancePlans)
          ? context.insurancePlans.slice(0, maxPlansToInclude)
          : [];

        // Prioritize insurance plans as they're most relevant
        const insurancePlansStr = truncateJSON(
          plansToUse,
          maxCharsPerSection / 2, // Reduce size further
        );

        // Calculate remaining space for other sections
        const remainingChars = maxTotalChars / 2 - insurancePlansStr.length;
        const charsPerRemaining = Math.floor(remainingChars / 2);

        const healthConditionsStr = truncateJSON(
          context.healthConditions || [],
          charsPerRemaining,
        );

        const medicationsStr = truncateJSON(
          context.medications || [],
          charsPerRemaining,
        );

        // Only provide the data without any additional instructions
        additionalInstructions = `Insurance Plans (sample of ${plansToUse.length} plans): ${insurancePlansStr}\n\nHealth Conditions: ${healthConditionsStr}\n\nMedications: ${medicationsStr}`;

        console.log(
          `Context sizes - Plans: ${insurancePlansStr.length}, Health: ${healthConditionsStr.length}, Meds: ${medicationsStr.length}, Total: ${additionalInstructions.length} chars`,
        );
      } catch (contextError) {
        console.error("Error processing context data:", contextError);
        additionalInstructions = "";
      }
    }

    // Run the assistant on the thread with the OpenAI-Beta header for v2
    const run = await client.beta.threads.runs.create(
      thread.id,
      {
        assistant_id: assistantId,
        instructions:
          additionalInstructions && additionalInstructions.length < 32000
            ? additionalInstructions
            : "",
      },
      {
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      },
    );
    console.log("Started run:", run.id);

    // Wait for the run to complete with the OpenAI-Beta header for v2
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id, {
      headers: {
        "OpenAI-Beta": "assistants=v2",
      },
    });
    console.log("Initial run status:", runStatus.status);

    while (runStatus.status !== "completed") {
      if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
        throw new Error(`Run ended with status: ${runStatus.status}`);
      }

      // Wait for a second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id, {
        headers: {
          "OpenAI-Beta": "assistants=v2",
        },
      });
      console.log("Updated run status:", runStatus.status);
    }

    // Get the messages from the thread with the OpenAI-Beta header for v2
    const messages = await client.beta.threads.messages.list(thread.id, {
      headers: {
        "OpenAI-Beta": "assistants=v2",
      },
    });
    console.log("Retrieved messages");

    // Find the last assistant message
    const assistantMessages = messages.data.filter(
      (m) => m.role === "assistant",
    );
    if (assistantMessages.length === 0) {
      throw new Error("No response from assistant");
    }

    // Get the content of the last assistant message
    const lastMessage = assistantMessages[0];
    let responseText = "";

    for (const content of lastMessage.content) {
      if (content.type === "text") {
        responseText += content.text.value;
      }
    }

    console.log("Assistant response received");
    return responseText;
  } catch (error) {
    console.error("Error sending message to OpenAI Assistant:", error);

    // Detailed error logging
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`);
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);

      // Check for specific OpenAI API errors
      if ("status" in error) {
        console.error(`Status code: ${(error as any).status}`);
      }

      if ("code" in error) {
        console.error(`Error code: ${(error as any).code}`);
      }

      if ("type" in error) {
        console.error(`Error type: ${(error as any).type}`);
      }

      // Transform common errors into more helpful messages
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      } else if (
        error.message.includes("maximum context length") ||
        error.message.includes("token limit")
      ) {
        throw new Error(
          "The query contains too much information. Please try a shorter question.",
        );
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        throw new Error(
          "The request took too long to process. Please try with a simpler query.",
        );
      }
    }

    throw error;
  }
};
