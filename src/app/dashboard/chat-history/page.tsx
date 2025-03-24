"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../supabase/client";
import DashboardNavbar from "@/components/dashboard-navbar";
import { SubscriptionCheck } from "@/components/subscription-check";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type ConversationGroup = {
  id: string;
  title: string;
  preview: string;
  date: string;
  message_count: number;
};

export default function ChatHistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        fetchConversations(data.user.id);
      } else {
        window.location.href = "/sign-in";
      }
    };

    fetchUser();
  }, []);

  const fetchConversations = async (userId: string) => {
    setIsLoading(true);
    try {
      // Get all chat messages for this user, grouped by thread_id
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group messages by thread_id
      const threadMap = new Map<string, any[]>();
      data.forEach((message) => {
        if (!threadMap.has(message.thread_id)) {
          threadMap.set(message.thread_id, []);
        }
        threadMap.get(message.thread_id)?.push(message);
      });

      // Format the conversations for display
      const formattedConversations: ConversationGroup[] = [];

      threadMap.forEach((messages, threadId) => {
        // Sort messages by created_at
        messages.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        // Get the first user message as the title
        const firstUserMessage = messages.find((msg) => msg.role === "user");
        const title = firstUserMessage
          ? firstUserMessage.content.length > 50
            ? firstUserMessage.content.substring(0, 50) + "..."
            : firstUserMessage.content
          : "New Conversation";

        // Get the last message as preview
        const lastMessage = messages[messages.length - 1];
        const preview = lastMessage
          ? lastMessage.content.length > 60
            ? lastMessage.content.substring(0, 60) + "..."
            : lastMessage.content
          : "";

        // Get the date of the most recent message
        const mostRecentDate = new Date(
          messages[messages.length - 1].created_at,
        );

        formattedConversations.push({
          id: threadId,
          title,
          preview,
          date: format(mostRecentDate, "MM/dd/yyyy"),
          message_count: messages.length,
        });
      });

      setConversations(formattedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (threadId: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      // Delete all messages with this thread_id
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .eq("thread_id", threadId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update the UI
      setConversations(conversations.filter((conv) => conv.id !== threadId));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard?tab=ai">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Conversation History</h1>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your AI Chat History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : filteredConversations.length > 0 ? (
                <div className="space-y-4">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors relative"
                    >
                      <Link
                        href={`/dashboard/chat-history/${conversation.id}`}
                        className="block"
                      >
                        <div className="flex justify-between items-start mb-2 pr-8">
                          <h3 className="font-medium text-lg">
                            {conversation.title}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {conversation.date}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {conversation.preview}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{conversation.message_count} messages</span>
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery
                    ? "No conversations match your search"
                    : "No conversations yet"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
