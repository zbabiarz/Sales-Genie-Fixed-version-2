"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../../../supabase/client";
import DashboardNavbar from "@/components/dashboard-navbar";
import { SubscriptionCheck } from "@/components/subscription-check";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { RobotIcon } from "@/components/robot-icon";
import { format } from "date-fns";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function ConversationDetailPage({
  params,
}: {
  params: { threadId: string };
}) {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("Conversation");
  const supabase = createClient();
  const { threadId } = params;

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        fetchMessages(data.user.id, threadId);
      } else {
        window.location.href = "/sign-in";
      }
    };

    fetchUser();
  }, [threadId]);

  const fetchMessages = async (userId: string, threadId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", userId)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setMessages(data as Message[]);

        // Set the title based on the first user message
        const firstUserMessage = data.find((msg) => msg.role === "user");
        if (firstUserMessage) {
          setTitle(
            firstUserMessage.content.length > 50
              ? firstUserMessage.content.substring(0, 50) + "..."
              : firstUserMessage.content,
          );
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6 flex items-center gap-4">
            <Link href="/dashboard/chat-history">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold truncate">{title}</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversation Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`flex items-start gap-2 max-w-[80%] ${message.role === "assistant" ? "bg-muted p-3 rounded-lg" : ""}`}
                      >
                        {message.role === "assistant" && (
                          <div className="w-6 h-6 mt-1 flex-shrink-0 flex items-center justify-center">
                            <RobotIcon
                              className="h-5 w-5"
                              style={{ minWidth: "20px", minHeight: "20px" }}
                            />
                          </div>
                        )}
                        <div className="space-y-1 overflow-hidden">
                          <div
                            className={`${message.role === "user" ? "bg-teal-600 text-white p-3 rounded-lg" : ""} break-words whitespace-pre-wrap`}
                          >
                            {message.content.split("\n").map((line, i) => (
                              <div key={i} className="py-0.5">
                                {line}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(
                              new Date(message.created_at),
                              "MMM d, yyyy h:mm a",
                            )}
                          </div>
                        </div>
                        {message.role === "user" && (
                          <User className="h-5 w-5 mt-1 text-white bg-teal-600 rounded-full p-1 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No messages found in this conversation
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
