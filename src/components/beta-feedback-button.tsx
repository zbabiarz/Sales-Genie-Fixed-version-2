"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function BetaFeedbackButton() {
  return (
    <Button
      className="fixed bottom-4 right-4 bg-teal-600 hover:bg-teal-700 shadow-md z-50 md:flex md:items-center md:gap-2 p-2 md:p-4 rounded-full md:rounded-md"
      onClick={() =>
        window.open(
          "https://links.convertwave.ai/widget/form/jJ8HbAPeBLzRAFj9yGaL",
          "_blank",
        )
      }
    >
      <MessageSquare className="h-4 w-4" />
      <span className="hidden md:inline">Leave beta feedback</span>
    </Button>
  );
}
