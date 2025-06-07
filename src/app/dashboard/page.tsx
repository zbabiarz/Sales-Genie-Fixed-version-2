"use client";

import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/client";
import { redirect } from "next/navigation";
import { SubscriptionCheck } from "@/components/subscription-check";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardCheck, MessageSquareText, Users } from "lucide-react";
import { RobotIcon } from "@/components/robot-icon";
import { ClientIntakePage } from "@/components/client-intake/client-intake-page";
import { AIChat } from "@/components/ai-assistant/ai-chat";
import { CallAnalyzerPage } from "@/components/sales-call/call-analyzer-page";
import { ClientManagement } from "@/components/client-management/client-management";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";

// Create a client component for search params
function SearchParamsWrapper({
  children,
}: {
  children: (tabParam: string | null) => React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  return <>{children(tabParam)}</>;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("ai");

  // Create refs for each section to enable scrolling
  const aiSectionRef = useRef<HTMLDivElement>(null);
  const intakeSectionRef = useRef<HTMLDivElement>(null);
  const callsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user data
    const fetchUser = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      } else {
        window.location.href = "/sign-in";
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <SubscriptionCheck>
      <DashboardNavbar />
      <main className="w-full bg-gray-50 min-h-screen">
        <div className="container mx-auto px-4 py-8 flex flex-col gap-8">
          {/* Header Section */}
          <DashboardHeader user={user} />

          {/* Quick Actions */}
          <QuickActions
            onTabChange={setActiveTab}
            aiSectionRef={aiSectionRef}
            intakeSectionRef={intakeSectionRef}
            callsSectionRef={callsSectionRef}
          />

          {/* Stats Section */}
          <DashboardStats />

          {/* Main Content Tabs */}
          <Suspense fallback={<div>Loading...</div>}>
            <SearchParamsWrapper>
              {(tabParam) => {
                useEffect(() => {
                  if (
                    tabParam &&
                    ["ai", "intake", "calls", "clients"].includes(tabParam)
                  ) {
                    setActiveTab(tabParam);
                  }
                }, [tabParam]);

                return (
                  <Tabs
                    value={activeTab}
                    onValueChange={(tab) => {
                      setActiveTab(tab);
                      if (tab !== "intake") {
                        // Remove clientId and age from the URL when leaving Intake tab
                        const url = new URL(window.location.href);
                        url.searchParams.delete("clientId");
                        url.searchParams.delete("age");
                        window.history.replaceState({}, "", url);
                      }
                    }}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-4 mb-8 overflow-x-auto">
                      <TabsTrigger
                        value="ai"
                        className="flex flex-col md:flex-row items-center justify-center md:gap-2 px-1 md:px-3 py-2"
                      >
                        <RobotIcon className="h-5 w-5 md:h-4 md:w-4 text-teal-600" />
                        <span className="text-[10px] md:text-sm mt-1 md:mt-0 block font-medium">
                          AI Chat
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="intake"
                        className="flex flex-col md:flex-row items-center justify-center md:gap-2 px-1 md:px-3 py-2"
                      >
                        <ClipboardCheck className="h-5 w-5 md:h-4 md:w-4 text-teal-600" />
                        <span className="text-[10px] md:text-sm mt-1 md:mt-0 block font-medium">
                          Intake
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="calls"
                        className="flex flex-col md:flex-row items-center justify-center md:gap-2 px-1 md:px-3 py-2"
                      >
                        <MessageSquareText className="h-5 w-5 md:h-4 md:w-4 text-teal-600" />
                        <span className="text-[10px] md:text-sm mt-1 md:mt-0 block font-medium">
                          Calls
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="clients"
                        className="flex flex-col md:flex-row items-center justify-center md:gap-2 px-1 md:px-3 py-2"
                      >
                        <Users className="h-5 w-5 md:h-4 md:w-4 text-teal-600" />
                        <span className="text-[10px] md:text-sm mt-1 md:mt-0 block font-medium">
                          Clients
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai">
                      <div ref={aiSectionRef} className="space-y-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center gap-2">
                            <RobotIcon className="h-6 w-6 text-teal-600" />
                            <div>
                              <CardTitle>AI Chatbot Assistant</CardTitle>
                              <CardDescription>
                                Get real-time product information and
                                recommendations
                              </CardDescription>
                            </div>
                          </CardHeader>
                        </Card>

                        {/* Info Banner */}
                        <div className="w-full bg-green-100 border border-green-300 rounded-lg p-4 text-green-800">
                          <p className="text-center font-medium">
                            Please make sure you include the company name,
                            product name, and product type in all each of your
                            questions and prompts to get the most accurate
                            responses.
                          </p>
                        </div>

                        {/* AI Chat Component */}
                        <div className="h-[500px]">
                          <AIChat />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="intake">
                      <div ref={intakeSectionRef} className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Client Intake & Matching</CardTitle>
                            <CardDescription>
                              Add new clients and match them with insurance
                              plans
                            </CardDescription>
                          </CardHeader>
                        </Card>

                        {/* Client Intake Form */}
                        <div>
                          <ClientIntakePage />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="calls">
                      <div ref={callsSectionRef} className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Sales Call Analyzer</CardTitle>
                            <CardDescription>
                              Upload and analyze your sales calls
                            </CardDescription>
                          </CardHeader>
                        </Card>

                        {/* Sales Call Analyzer Component */}
                        <div>
                          <CallAnalyzerPage />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="clients">
                      <Card>
                        <CardHeader>
                          <CardTitle>Client Management</CardTitle>
                          <CardDescription>
                            Manage your clients and their information
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ClientManagement />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                );
              }}
            </SearchParamsWrapper>
          </Suspense>
        </div>
      </main>
    </SubscriptionCheck>
  );
}
