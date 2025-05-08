"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus, Phone, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

export function QuickActions({
  onTabChange,
  aiSectionRef,
  intakeSectionRef,
  callsSectionRef,
}: {
  onTabChange?: (tab: string) => void;
  aiSectionRef?: React.RefObject<HTMLDivElement>;
  intakeSectionRef?: React.RefObject<HTMLDivElement>;
  callsSectionRef?: React.RefObject<HTMLDivElement>;
}) {
  const router = useRouter();

  const handleNewClient = () => {
    if (onTabChange) {
      onTabChange("intake");

      // Scroll to the intake section after a short delay to allow tab change to complete
      setTimeout(() => {
        if (intakeSectionRef?.current) {
          intakeSectionRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      // If used outside of dashboard, navigate to dashboard with intake tab
      router.push("/dashboard?tab=intake");
    }
  };

  const handleUploadCall = () => {
    if (onTabChange) {
      onTabChange("calls");

      // Scroll to the calls section after a short delay to allow tab change to complete
      setTimeout(() => {
        if (callsSectionRef?.current) {
          callsSectionRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      router.push("/dashboard?tab=calls");
    }
  };

  const handleAskAI = () => {
    if (onTabChange) {
      onTabChange("ai");

      // Scroll to the AI section after a short delay to allow tab change to complete
      setTimeout(() => {
        if (aiSectionRef?.current) {
          aiSectionRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      router.push("/dashboard?tab=ai");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
        <CardDescription>Common tasks you can perform</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Button
          onClick={handleNewClient}
          className="flex items-center justify-start gap-2 bg-teal-600 hover:bg-teal-700"
        >
          <UserPlus className="h-4 w-4 animate-pulse" />
          <span>New Client</span>
        </Button>
        <Button
          onClick={handleUploadCall}
          className="flex items-center justify-start gap-2 bg-teal-600 hover:bg-teal-700"
        >
          <Phone className="h-4 w-4 animate-pulse" />
          <span>Upload Call</span>
        </Button>
        <Button
          onClick={handleAskAI}
          className="flex items-center justify-start gap-2 bg-teal-600 hover:bg-teal-700"
        >
          <MessageSquare className="h-4 w-4 animate-pulse" />
          <span>Ask AI</span>
        </Button>
      </CardContent>
    </Card>
  );
}
