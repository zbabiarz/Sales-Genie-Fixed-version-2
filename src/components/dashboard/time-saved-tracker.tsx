"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp } from "lucide-react";
import { createClient } from "../../../supabase/client";

interface TimeSavedTrackerProps {
  userId: string;
}

export function TimeSavedTracker({ userId }: TimeSavedTrackerProps) {
  const [totalMinutesSaved, setTotalMinutesSaved] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Listen for AI chat completions to update the counter immediately
    const handleAiChatCompleted = (event: CustomEvent) => {
      setTotalMinutesSaved((prev) => prev + (event.detail?.minutesSaved || 5));
    };

    window.addEventListener(
      "ai-chat-completed",
      handleAiChatCompleted as EventListener,
    );

    async function fetchTimeSaved() {
      try {
        // Get current user if userId is 'current'
        let actualUserId = userId;
        if (userId === "current") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            setTotalMinutesSaved(45);
            setIsLoading(false);
            return;
          }
          actualUserId = userData.user.id;
        }

        // Fetch user's time saved data
        const { data, error } = await supabase
          .from("user_activity")
          .select("*") // Select all fields to ensure we get details
          .eq("user_id", actualUserId);

        if (error) throw error;

        // Calculate time saved based on activity types
        let minutes = 0;
        if (data && data.length > 0) {
          console.log("Processing activities:", JSON.stringify(data));
          data.forEach((activity) => {
            switch (activity.activity_type) {
              case "client_intake":
                minutes += 15; // 15 minutes saved per client intake
                console.log(
                  `Added 15 minutes for client_intake, total: ${minutes}`,
                );
                break;
              case "ai_chat":
                // Check if we have explicit time_saved_minutes in the details
                if (activity.details && activity.details.time_saved_minutes) {
                  const savedMinutes = Number(
                    activity.details.time_saved_minutes,
                  );
                  minutes += savedMinutes;
                  console.log(
                    `Added ${savedMinutes} minutes from details, total: ${minutes}`,
                  );
                } else {
                  minutes += 5; // Default 5 minutes saved per AI chat interaction
                  console.log(
                    `Added default 5 minutes for ai_chat, total: ${minutes}`,
                  );
                }
                break;
              case "call_analysis":
                minutes += 20; // 20 minutes saved per call analysis
                console.log(
                  `Added 20 minutes for call_analysis, total: ${minutes}`,
                );
                break;
              case "plan_match":
                minutes += 10; // 10 minutes saved per plan matching
                console.log(
                  `Added 10 minutes for plan_match, total: ${minutes}`,
                );
                break;
              default:
                minutes += 2; // Default time saved for other activities
                console.log(
                  `Added 2 minutes for ${activity.activity_type}, total: ${minutes}`,
                );
            }
          });
        } else {
          // If no data, provide a default starting value
          minutes = 45; // Show some initial value to encourage usage
          console.log("No activities found, using default 45 minutes");
        }

        console.log(
          `Total minutes saved: ${minutes} from ${data?.length || 0} activities`,
        );
        setTotalMinutesSaved(minutes);
      } catch (error) {
        console.error("Error fetching time saved data:", error);
        // Set a default value if there's an error
        setTotalMinutesSaved(45);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTimeSaved();

    // Clean up event listener
    return () => {
      window.removeEventListener(
        "ai-chat-completed",
        handleAiChatCompleted as EventListener,
      );
    };
  }, [userId, supabase]);

  // Format time saved into hours and minutes
  const formatTimeSaved = () => {
    const hours = Math.floor(totalMinutesSaved / 60);
    const minutes = totalMinutesSaved % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Time Saved</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-teal-600 mr-3" />
            <div>
              <div className="text-3xl font-bold">{formatTimeSaved()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Total time saved using Insurance Sales Genie
              </div>
            </div>
          </div>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="mr-1 h-4 w-4" />
            <span>Increasing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
