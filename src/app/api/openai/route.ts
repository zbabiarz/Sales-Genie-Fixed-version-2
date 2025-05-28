import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/app/supabase/server";
import { cleanResponse } from "@/utils/format-utils";

// Initialize the OpenAI client with the API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System message prompt for the AI chatbot
const SYSTEM_MESSAGE = `# Overview  
Your name is Sales Genie AI, an intelligent assistant that helps independent insurance brokers determine client eligibility and understand insurance product offerings quickly and accurately.

## Context  
- Brokers need to quickly assess if a client qualifies for specific insurance products.  
- The system references uploaded product details and guidelines.  
- Responses must be short, accurate, and easy to act on.  
- When eligibility isn't met, alternative options should be offered if available.  

## Instructions  
1. Evaluate a client's eligibility based on:
   - Age range  
   - Pre-existing conditions  
   - State availability  
   - Product-specific requirements (e.g., group size, income level, employment status)  

2. When presenting product information:
   - Include plan name, coverage limits, premiums, copays, out-of-pocket costs, and state availability  
   - Highlight key exclusions and limitations  

3. When asked about availability by state:
   - Respond with YES or NO  
   - If YES: provide key plan details  
   - If NO: offer alternatives if available  

4. When asked about pricing:
   - Share monthly premium (based on age group & coverage)  
   - Explain deductible, copay, and any variable cost factors (e.g., location, number of dependents)  

5. When comparing plans:
   - Present key differences (deductibles, copays, coverage limits)  
   - List pros and cons using bullet points  
   - Recommend based on client priorities (e.g., low cost vs. comprehensive coverage)  

6. When asked about exclusions:
   - Clearly state what is NOT covered  
   - Mention preauthorization rules or common disqualifiers  

7. Always mention if the plan has state-specific compliance requirements or mandated benefits.  

8. If information is missing or unclear:
   - Say: "I don't have that information available, but you can check with [relevant source]."  
   - Never guess eligibility.  

## Tools  
- Product Knowledge Base (uploaded documents)  
- Client Input Data (age, location, conditions, etc.)  
- State Regulation Reference Guide (if applicable)  

## Examples  
- Input: "Is a 55-year-old in Texas with diabetes eligible for Plan ABC?"  
  Output:  
  - Not eligible due to diabetes being an excluded pre-existing condition.  
  - Plan ABC is available in Texas for ages 25–50 without chronic conditions.  
  - Alternative: Plan XYZ covers diabetes with a higher premium.  

- Input: "Is Plan DEF available in California?"  
  Output:  
  - YES  
  - Plan DEF: $250/month for 40-year-old, $2,000 deductible, $40 copay  
  - Covers outpatient, ER, and preventive care  
  - Not available to self-employed individuals without a group  

- Input: "Compare Plan A and Plan B for a 30-year-old in Florida."  
  Output:  
  - Plan A: $180/month, $1,000 deductible, $20 copay  
  - Plan B: $220/month, $500 deductible, $10 copay  
  - Plan A Pros: Lower premium  
  - Plan B Pros: Lower out-of-pocket  
  - Recommendation: Plan B for better overall coverage if budget allows  

## SOP (Standard Operating Procedure)  
1. Receive client details (age, location, health conditions, employment status).  
2. Cross-check client info with plan eligibility rules.  
3. Provide a YES/NO qualification result.  
4. If qualified, provide concise plan summary.  
5. If not qualified, suggest alternatives if available.  
6. If pricing is requested, break down premium, deductible, copay.  
7. If comparison is requested, list pros/cons and give a recommendation.  
8. Always flag exclusions, limitations, and regulatory compliance.  
9. If uncertain, respond with a disclaimer and refer to source.  

## Final Notes  
- Use bullet points for clarity.  
- Keep answers simple and actionable.  
- Avoid insurance jargon unless broker-specific.  
- Never fabricate data—always use verified plan details.
`;

export async function POST(request: Request) {
  try {
    const { message, context, threadId, userId } = await request.json();
    const assistantId = "asst_k3VIr7I5PX9RzQMWsx5eU12o";

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
      try {
        // Truncate each part of the context to ensure we don't exceed OpenAI's limit
        // Total token limit is ~128K tokens which is roughly 256K chars
        const maxCharsPerSection = 60000; // Reduced to ensure we stay well under limits
        const maxTotalChars = 180000; // Total character limit across all sections

        // Helper function to truncate JSON strings
        const truncateJSON = (
          obj: string | any[],
          maxLength: number | undefined,
        ) => {
          if (!obj || (Array.isArray(obj) && obj.length === 0)) return "[]";

          try {
            const str = JSON.stringify(obj);
            if (maxLength !== undefined && str.length <= maxLength) return str;

            // For arrays, prioritize the first few items
            if (Array.isArray(obj) && obj.length > 0) {
              // Calculate how many items we can include
              const avgItemSize = str.length / obj.length;
              const itemsToInclude =
                maxLength !== undefined
                  ? Math.max(1, Math.floor(maxLength / avgItemSize) - 1)
                  : obj.length;

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
        const maxPlansToInclude = 15;
        const plansToUse = Array.isArray(context.insurancePlans)
          ? context.insurancePlans.slice(0, maxPlansToInclude)
          : [];

        // Prioritize insurance plans as they're most relevant
        const insurancePlansStr = truncateJSON(
          plansToUse,
          maxCharsPerSection / 3, // Reduce size further
        );

        // Calculate remaining space for other sections
        const remainingChars = maxTotalChars / 3 - insurancePlansStr.length;
        const charsPerRemaining = Math.floor(remainingChars / 2);

        const healthConditionsStr = truncateJSON(
          context.healthConditions || [],
          charsPerRemaining,
        );

        const medicationsStr = truncateJSON(
          context.medications || [],
          charsPerRemaining,
        );

        additionalInstructions = `Insurance Plans (sample of ${plansToUse.length} plans): ${insurancePlansStr}\n\nHealth Conditions: ${healthConditionsStr}\n\nMedications: ${medicationsStr}`;

        console.log(
          `Context sizes - Plans: ${insurancePlansStr.length}, Health: ${healthConditionsStr.length}, Meds: ${medicationsStr.length}, Total: ${additionalInstructions.length} chars`,
        );
      } catch (contextError) {
        console.error("Error processing context data:", contextError);
        additionalInstructions =
          "Error processing context data. Proceeding without additional context.";
      }
    }

    // Run the assistant on the thread with the OpenAI-Beta header for v2
    const run = await openai.beta.threads.runs.create(
      currentThreadId,
      {
        assistant_id: assistantId,
        instructions: (
          SYSTEM_MESSAGE +
          (additionalInstructions && additionalInstructions.length < 32000
            ? "\n\n" + additionalInstructions
            : "")
        ).substring(0, 32000),
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

    // Clean the response to remove source indicators
    responseText = cleanResponse(responseText);

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
    }

    // Determine appropriate error message for the client
    let clientErrorMessage = "An error occurred while processing your request.";
    let statusCode = 500;

    if (error instanceof Error) {
      // Rate limiting errors
      if (
        error.message.includes("rate limit") ||
        error.message.includes("429")
      ) {
        clientErrorMessage =
          "We're experiencing high demand. Please try again in a moment.";
        statusCode = 429;
      }
      // Authentication errors
      else if (
        error.message.includes("authentication") ||
        error.message.includes("401")
      ) {
        clientErrorMessage =
          "Authentication error with AI service. Please contact support.";
        statusCode = 401;
      }
      // Timeout errors
      else if (
        error.message.includes("timeout") ||
        error.message.includes("timed out")
      ) {
        clientErrorMessage =
          "The request took too long to process. Please try with a simpler query.";
        statusCode = 408;
      }
      // Context length errors
      else if (
        error.message.includes("maximum context length") ||
        error.message.includes("token limit")
      ) {
        clientErrorMessage =
          "Your query contains too much information. Please try a shorter question.";
        statusCode = 413;
      }
      // For other errors, use a generic message but log the specific error
      else {
        clientErrorMessage =
          "An unexpected error occurred. Our team has been notified.";
      }
    }

    return NextResponse.json(
      { error: clientErrorMessage },
      { status: statusCode },
    );
  }
}
