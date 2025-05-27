"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, User, Loader2, RefreshCw, History } from "lucide-react";
import Link from "next/link";
import { RobotIcon } from "@/components/robot-icon";
import { createClient } from "../../../supabase/client";
import { cleanResponse } from "@/utils/format-utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load conversation history when component mounts
  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        // Get current user
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        console.log("Loading conversation history for user:", userData.user.id);

        // First try to load from local chat_messages table
        const { data: localMessages, error: localError } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: true });

        if (localError) {
          console.error("Error loading local messages:", localError);
          // If the table doesn't exist, log it but don't try to create it
          if (localError.message.includes("does not exist")) {
            console.log(
              "Chat messages table doesn't exist, it should be created via migration",
            );
          }
        }

        if (localMessages && localMessages.length > 0) {
          console.log("Found local messages:", localMessages.length);
          // We have local messages, use them
          const formattedMessages = localMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          }));
          setMessages(formattedMessages);

          // Get the thread ID from the most recent message
          const threadIdFromMessages = localMessages[0].thread_id;
          if (threadIdFromMessages) {
            setThreadId(threadIdFromMessages);
            console.log("Using thread ID from messages:", threadIdFromMessages);
          }
          return;
        }

        // If no local messages, check if user has an existing thread ID
        const { data: userThreadData } = await supabase
          .from("users")
          .select("openai_thread_id")
          .eq("id", userData.user.id)
          .single();

        if (userThreadData?.openai_thread_id) {
          setThreadId(userThreadData.openai_thread_id);
          // Fetch messages from this thread
          const response = await fetch("/api/openai/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              threadId: userThreadData.openai_thread_id,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              // Format messages for display without cleaning
              const formattedMessages = data.messages.map((msg: any) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content[0]?.text?.value || "",
              }));

              // Let the OpenAI Assistant handle all messages

              const reversedMessages = formattedMessages.reverse();
              setMessages(reversedMessages);

              // Store these messages in our local database for future use
              try {
                const messagesToStore = reversedMessages.map((msg) => ({
                  user_id: userData.user.id,
                  thread_id: userThreadData.openai_thread_id,
                  role: msg.role,
                  content: msg.content,
                }));

                await supabase.from("chat_messages").insert(messagesToStore);
              } catch (storeError) {
                console.error(
                  "Error storing messages in database:",
                  storeError,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading conversation history:", error);
      }
    };

    loadConversationHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Only store messages if this is an actual user prompt (not the initial welcome message)
    if (
      messages.length > 1 ||
      (messages.length === 1 && messages[0].role !== "assistant")
    ) {
      // Store the user message in our local database
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          console.log("Storing user message for user:", userData.user.id);
          // Don't use "pending" as a thread ID placeholder as it causes OpenAI API errors
          const currentThreadId = threadId || null;
          console.log("Using thread ID:", currentThreadId || "<no thread yet>");

          // Only insert with thread_id if we have a valid one
          const insertData = {
            user_id: userData.user.id,
            role: "user",
            content: input,
            ...(currentThreadId ? { thread_id: currentThreadId } : {}),
          };

          const { error: insertError } = await supabase
            .from("chat_messages")
            .insert(insertData);

          if (insertError) {
            console.error("Error inserting user message:", insertError);
            // If the table doesn't exist, log it but don't try to create it
            if (insertError.message.includes("does not exist")) {
              console.log(
                "Chat messages table doesn't exist, it should be created via migration",
              );
            }
          } else {
            console.log("User message stored successfully");
          }
        }
      } catch (storeError) {
        console.error("Error storing user message:", storeError);
      }
    }

    // Add a temporary thinking message from the assistant
    setMessages((prev) => [
      ...prev,
      { role: "assistant" as const, content: "" },
    ]);

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      // Log activity for time saved tracking with increased time (5 minutes per interaction)
      try {
        // Add 5 minutes to time saved for each AI chat interaction
        const { data: activityData, error: activityError } = await supabase
          .from("user_activity")
          .insert({
            user_id: userData.user.id,
            activity_type: "ai_chat",
            details: {
              message_length: input.length,
              time_saved_minutes: 5, // Explicitly save 5 minutes per interaction
            },
          })
          .select();

        if (activityError) {
          console.error("Error inserting activity:", activityError);
        } else {
          console.log("Activity logged successfully:", activityData);

          // Force refresh the time saved tracker
          const event = new CustomEvent("ai-chat-completed", {
            detail: { minutesSaved: 5 },
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error("Error logging activity:", error);
      }

      // Get insurance plans from Supabase
      const { data: insurancePlans } = await supabase
        .from("insurance_plans")
        .select("*");

      // Get health conditions from Supabase
      const { data: healthConditions } = await supabase
        .from("health_conditions")
        .select("*");

      // Get medications from Supabase
      const { data: medications } = await supabase
        .from("medications")
        .select("*");

      // Use the server API route instead of client-side processing
      const context = {
        insurancePlans: insurancePlans || [],
        healthConditions: healthConditions || [],
        medications: medications || [],
      };

      try {
        // Call the API route with thread ID if available
        const apiResponse = await fetch("/api/openai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage.content,
            context,
            threadId,
            userId: userData.user.id,
          }),
        });

        if (apiResponse.ok) {
          const data = await apiResponse.json();

          // Save the thread ID if it's new
          if (data.threadId && (!threadId || threadId !== data.threadId)) {
            setThreadId(data.threadId);

            // Update the user's thread ID in the database
            await supabase
              .from("users")
              .update({ openai_thread_id: data.threadId })
              .eq("id", userData.user.id);
          }

          // Replace the temporary thinking message with the raw response
          // No cleaning or modification of the response
          setMessages((prev) => {
            const newMessages = [...prev];
            if (
              newMessages.length > 0 &&
              newMessages[newMessages.length - 1].role === "assistant"
            ) {
              newMessages[newMessages.length - 1] = {
                role: "assistant",
                content: data.response,
              };
              return newMessages;
            } else {
              return [...prev, { role: "assistant", content: data.response }];
            }
          });

          // Only store messages if this is an actual conversation (not just the welcome message)
          if (
            messages.length > 1 ||
            (messages.length === 1 && messages[0].role !== "assistant")
          ) {
            // Store the message in our local database
            try {
              if (userData.user && data.threadId) {
                console.log(
                  "Storing assistant message for thread:",
                  data.threadId,
                );

                const { error: insertError } = await supabase
                  .from("chat_messages")
                  .insert({
                    user_id: userData.user.id,
                    thread_id: data.threadId,
                    role: "assistant",
                    content: data.response,
                  });

                if (insertError) {
                  console.error(
                    "Error inserting assistant message:",
                    insertError,
                  );
                  // If the table doesn't exist, log it but don't try to create it
                  if (insertError.message.includes("does not exist")) {
                    console.log(
                      "Chat messages table doesn't exist, it should be created via migration",
                    );
                  }
                } else {
                  console.log("Assistant message stored successfully");
                }
              }
            } catch (storeError) {
              console.error("Error storing assistant message:", storeError);
            }
          }
        } else {
          // If API call fails, remove the thinking message
          setMessages((prev) => {
            const newMessages = [...prev];
            if (
              newMessages.length > 0 &&
              newMessages[newMessages.length - 1].role === "assistant" &&
              newMessages[newMessages.length - 1].content === ""
            ) {
              newMessages.pop(); // Remove the empty thinking message
            }
            return newMessages;
          });
        }
      } catch (apiError) {
        console.error("Error calling OpenAI API:", apiError);
        // Remove the thinking message on error
        setMessages((prev) => {
          const newMessages = [...prev];
          if (
            newMessages.length > 0 &&
            newMessages[newMessages.length - 1].role === "assistant" &&
            newMessages[newMessages.length - 1].content === ""
          ) {
            newMessages.pop(); // Remove the empty thinking message
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error processing query:", error);
      // Remove the thinking message on error
      setMessages((prev) => {
        const newMessages = [...prev];
        if (
          newMessages.length > 0 &&
          newMessages[newMessages.length - 1].role === "assistant" &&
          newMessages[newMessages.length - 1].content === ""
        ) {
          newMessages.pop(); // Remove the empty thinking message
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Clear local messages (only in the current UI)
      setMessages([]);

      // Create a new thread by setting threadId to null
      // This will cause a new thread to be created on the next message
      setThreadId(null);

      // Update user's current thread ID in the database to null
      // This doesn't delete any history, just disconnects the user from the current thread
      await supabase
        .from("users")
        .update({ openai_thread_id: null })
        .eq("id", userData.user.id);

      // IMPORTANT: We do NOT delete any chat messages from the database
      // This preserves the chat history for the history page
      console.log(
        "Chat refreshed - starting new conversation while preserving history",
      );
    } catch (error) {
      console.error("Error refreshing chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <RobotIcon className="h-6 w-6" />
            AI Assistant
          </CardTitle>
          <div className="flex gap-2">
            <Link href="/dashboard/chat-history">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                title="View conversation history"
              >
                <History className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">View History</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Start a new conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col h-[500px]">
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
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
                    {message.role === "assistant" &&
                    isLoading &&
                    index === messages.length - 1 ? (
                      <div className="flex items-center">
                        <span>Thinking</span>
                        <span className="flex ml-2">
                          <span className="animate-bounce mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                          <span className="animate-bounce animation-delay-200 mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                          <span className="animate-bounce animation-delay-400 mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                        </span>
                      </div>
                    ) : (
                      message.content.split("\n").map((line, i) => (
                        <div key={i} className="py-0.5">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {message.role === "user" && (
                  <User className="h-5 w-5 mt-1 text-white bg-teal-600 rounded-full p-1 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 sticky bottom-0 bg-card pt-2 mb-12">
          <Input
            placeholder="Ask about insurance products or client eligibility..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-700 flex-shrink-0"
          >
            {isLoading ? (
              <div className="flex items-center">
                <span className="mr-2 text-xs font-medium">Thinking</span>
                <span className="flex">
                  <span className="animate-bounce mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                  <span className="animate-bounce animation-delay-200 mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                  <span className="animate-bounce animation-delay-400 mx-0.5 h-1 w-1 rounded-full bg-current"></span>
                </span>
              </div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
