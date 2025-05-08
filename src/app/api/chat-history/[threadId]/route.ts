import { createClient } from "../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { threadId: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threadId = params.threadId;
    if (!threadId) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 },
      );
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
      return NextResponse.json({ messages: [] });
    }

    // Get all messages for this thread
    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in thread messages API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
