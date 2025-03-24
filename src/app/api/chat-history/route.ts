import { createClient } from "@/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if chat_messages table exists
    const { error: tableCheckError } = await supabase
      .from("chat_messages")
      .select("id")
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes("does not exist")) {
      // Table doesn't exist, create it
      // Table doesn't exist, but we've already created it via migration
      console.log(
        "Chat messages table doesn't exist, but we've already created it via migration",
      );
      return NextResponse.json({ threads: [] });
    }

    // Get distinct thread IDs for this user
    const { data: threads, error: threadsError } = await supabase
      .from("chat_messages")
      .select("thread_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (threadsError) {
      console.error("Error fetching threads:", threadsError);
      return NextResponse.json(
        { error: "Failed to fetch chat history" },
        { status: 500 },
      );
    }

    // Get the first message of each thread to use as a preview
    const threadPreviews = [];
    const processedThreadIds = new Set();

    for (const thread of threads) {
      // Skip if we've already processed this thread ID
      if (processedThreadIds.has(thread.thread_id)) continue;
      processedThreadIds.add(thread.thread_id);

      // Get the first user message in this thread
      const { data: firstMessage, error: messageError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("thread_id", thread.thread_id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1);

      if (!messageError && firstMessage && firstMessage.length > 0) {
        // Get the most recent message timestamp for sorting
        const { data: latestMessage } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("thread_id", thread.thread_id)
          .order("created_at", { ascending: false })
          .limit(1);

        threadPreviews.push({
          threadId: thread.thread_id,
          preview:
            firstMessage[0].content.substring(0, 100) +
            (firstMessage[0].content.length > 100 ? "..." : ""),
          created_at: firstMessage[0].created_at,
          updated_at:
            latestMessage && latestMessage[0]
              ? latestMessage[0].created_at
              : firstMessage[0].created_at,
        });
      }
    }

    // Sort by most recently updated
    threadPreviews.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    return NextResponse.json({ threads: threadPreviews });
  } catch (error) {
    console.error("Error in chat history API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
