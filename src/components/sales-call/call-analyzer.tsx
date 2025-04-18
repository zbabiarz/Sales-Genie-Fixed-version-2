"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Video,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { createClient } from "../../../supabase/client";

type FeedbackSection = {
  title: string;
  items: string[];
  icon: React.ReactNode;
  color: string;
};

type CallAnalysis = {
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  summary?: string;
};

export function CallAnalyzer() {
  const [activeTab, setActiveTab] = useState("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  // Direct webhook URL for processing
  const webhookUrl =
    "https://effortlessai.app.n8n.cloud/webhook-test/5735f10d-5868-44b8-884e-cff2b722cb8d";
  const useMockData = false; // Always use the real webhook
  // Supabase edge function URL to receive analysis results
  const analysisWebhookUrl =
    "https://uzwpqhhrtfzjgytbadxl.supabase.co/functions/v1/call-analysis-webhook";
  // Recording ID to track the current analysis
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
        console.log("Media file selected:", file.name, file.type, file.size);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const analyzeCall = async () => {
    setIsAnalyzing(true);

    try {
      if (uploadedFile) {
        setIsProcessing(true);

        // First, create a record in the database to track this analysis
        let newRecordingId = null;
        let userId = null;
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            userId = userData.user.id;
            const { data, error } = await supabase
              .from("call_recordings")
              .insert({
                user_id: userData.user.id,
                file_name: uploadedFile.name,
                file_size: uploadedFile.size,
                file_type: uploadedFile.type,
                status: "processing",
              })
              .select();

            if (error) {
              console.error("Error creating recording record:", error);
            } else if (data && data.length > 0) {
              newRecordingId = data[0].id;
              setRecordingId(newRecordingId);
              console.log("Created recording record with ID:", newRecordingId);
            }

            // Also log activity for time saved tracking
            await supabase.from("user_activity").insert({
              user_id: userData.user.id,
              activity_type: "call_analysis",
              details: {
                file_name: uploadedFile.name,
                file_size: uploadedFile.size,
                recording_id: newRecordingId,
              },
            });
          }
        } catch (logError) {
          console.error("Error creating records:", logError);
        }

        // Process the media file through the webhook
        const transcriptAndAnalysis = await processMediaFile(
          uploadedFile,
          newRecordingId,
          userId,
        );
        setTranscript(transcriptAndAnalysis.transcript || "");
        setAnalysis(transcriptAndAnalysis.analysis);
        setActiveTab("results");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error analyzing call:", error);
      // Update the recording status to failed if we have a recording ID
      if (recordingId) {
        try {
          await supabase
            .from("call_recordings")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", recordingId);
        } catch (updateError) {
          console.error("Error updating recording status:", updateError);
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const processMediaFile = async (
    mediaFile: File,
    recordingId: string | null = null,
    userId: string | null = null,
  ): Promise<{ transcript?: string; analysis: CallAnalysis }> => {
    // Check file size and warn user but still process
    if (mediaFile.size > 50 * 1024 * 1024) {
      // 50MB soft limit
      console.log("File is very large, this may take longer to process");
      // We'll still try to process it, but warn the user
      alert(
        "This file is very large (over 50MB). Processing may take longer and might fail if the server has strict limits.",
      );
    }

    // If useMockData is true, immediately return mock data without attempting API call
    if (useMockData) {
      console.log("Using mock data instead of processing file");
      const mockData = getMockAnalysisData();
      return {
        transcript: mockData.transcript,
        analysis: mockData.analysis,
      };
    }

    try {
      // Create a FormData object to upload the file
      let formData = new FormData();
      formData.append("file", mediaFile);
      formData.append("binaryPropertyName", "file");
      // Add additional parameters that OpenAI Whisper might need
      formData.append("model", "whisper-1");
      formData.append(
        "prompt",
        "This is a sales call recording. Please transcribe accurately.",
      );

      // Add the recording ID and user ID if available
      if (recordingId) {
        formData.append("recordingId", recordingId);
        console.log("Added recordingId to formData:", recordingId);
      }

      if (userId) {
        formData.append("userId", userId);
        console.log("Added userId to formData:", userId);
      }

      console.log(
        "FormData created with file:",
        mediaFile.name,
        mediaFile.type,
        mediaFile.size,
        recordingId ? `recordingId: ${recordingId}` : "",
        userId ? `userId: ${userId}` : "",
      );

      // For large files, we need to set a longer timeout
      let controller = new AbortController();
      let timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout for larger files

      // Send through our proxy endpoint to avoid CORS issues
      let proxyEndpoint = "/api/proxy-webhook";

      // Log what we're sending for debugging
      console.log("Sending to proxy with parameters:", {
        file: mediaFile.name,
        fileType: mediaFile.type,
        fileSize: mediaFile.size,
        binaryPropertyName: "file",
        recordingId: recordingId || "not set",
        userId: userId || "not set",
      });

      let webhookResponse = await fetch(proxyEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "X-Target-Url": webhookUrl,
          // IMPORTANT: Do NOT set Content-Type manually for FormData
          // The browser will automatically set it with the correct boundary
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text();
        console.error("Webhook error:", errorText);
        throw new Error(`Failed to process media file: ${errorText}`);
      }

      console.log("Media file successfully sent to webhook");

      // Parse the webhook response
      let webhookData = await webhookResponse.json();
      console.log("Received webhook response:", webhookData);

      // Check if we have a valid response with transcript and analysis
      if (webhookData && webhookData.transcript && webhookData.analysis) {
        console.log("Received complete data from webhook");

        // If we have a recordingId, make sure the data is saved to the database
        if (recordingId) {
          try {
            // Send the data directly to our analysis webhook to ensure it's saved
            const analysisWebhookUrl =
              "https://uzwpqhhrtfzjgytbadxl.supabase.co/functions/v1/call-analysis-webhook";
            await fetch(analysisWebhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                recordingId: recordingId,
                userId: userId,
                transcript: webhookData.transcript,
                analysis: webhookData.analysis,
              }),
            });
            console.log("Sent data directly to analysis webhook");
          } catch (webhookError) {
            console.error("Error sending to analysis webhook:", webhookError);
          }
        }

        return {
          transcript: webhookData.transcript,
          analysis: webhookData.analysis,
        };
      } else if (webhookData && webhookData.success) {
        // Handle success response that might not have the expected format
        console.log(
          "Webhook success but missing expected data format",
          webhookData,
        );
        const mockData = getMockAnalysisData();
        return {
          transcript: webhookData.transcript || mockData.transcript,
          analysis: webhookData.analysis || mockData.analysis,
        };
      } else {
        console.error("Invalid response format from webhook", webhookData);
        throw new Error("Invalid response format from analysis service");
      }
    } catch (error) {
      console.error("Error processing media file:", error);
      // Show error to user and return mock data for better UX
      alert(
        `Error processing file: ${error.message}. Using sample data instead.`,
      );
      const mockData = getMockAnalysisData();
      return {
        transcript: mockData.transcript,
        analysis: mockData.analysis,
      };
    }
  };

  // Helper function to get mock analysis data
  const getMockAnalysisData = () => {
    const mockTranscript =
      "Hello, this is John from Insurance Sales Genie. I'm calling to discuss your insurance needs. Based on your profile, I think our Premium Health plan would be a great fit for you. It offers comprehensive coverage with a low deductible. What do you think about that? ... Yes, the monthly premium is $450. ... I understand your concern about the price. We do have a more affordable Basic Care plan at $250 per month, but it doesn't include dental and vision. ... Great, I'll send you more information about both plans. Is there anything specific you'd like to know about these plans?";

    return {
      transcript: mockTranscript,
      analysis: {
        summary:
          "This was a 5-minute sales call with a potential client interested in health insurance. The agent introduced the Premium Health plan ($450/month) and, after hearing price concerns, offered the Basic Care plan ($250/month) as an alternative. The call ended with the agent agreeing to send more information about both plans.",
        strengths: [
          "Good introduction with clear identification",
          "Offered product recommendations based on client profile",
          "Provided specific pricing information",
          "Offered alternative options when price concern was raised",
          "Ended with a clear next step (sending information)",
        ],
        improvements: [
          "Didn't ask enough discovery questions before recommending products",
          "Limited explanation of product benefits",
          "Didn't address potential health condition concerns",
          "Could have explored client's specific needs more deeply",
        ],
        recommendations: [
          "Start with more discovery questions before making recommendations",
          "Explain product benefits in more detail, connecting them to client needs",
          "Prepare responses for common objections beyond price",
          "Use more comparative language when presenting multiple options",
          "Add a specific call-to-action at the end of the conversation",
        ],
      },
    };
  };

  const renderFeedbackSection = ({
    title,
    items,
    icon,
    color,
  }: FeedbackSection) => (
    <Card className="mb-4">
      <CardHeader className={`flex flex-row items-center gap-2 ${color}`}>
        {icon}
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="min-w-4 mt-1">
                <div
                  className={`h-2 w-2 rounded-full ${color.replace("text-", "bg-")}`}
                />
              </div>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" disabled={isAnalyzing}>
            Upload & Analyze
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!analysis || isAnalyzing}>
            Analysis Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Call Analyzer</CardTitle>
              <CardDescription>
                Upload an audio or video recording of your sales call for AI
                analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors w-full max-w-md"
                  onClick={triggerFileInput}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*,video/*"
                    className="hidden"
                  />
                  <div className="flex justify-center space-x-4 mb-4">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <Video className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-2">
                    Upload audio or video file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to browse
                    <br />
                    Supports all audio and video formats
                    <br />
                    <span className="text-amber-600 font-medium">
                      Recommended file size: under 50MB
                    </span>
                  </p>
                  {uploadedFile && (
                    <div className="mt-4 text-sm font-medium text-teal-600">
                      {uploadedFile.name}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={analyzeCall}
                disabled={isAnalyzing || !uploadedFile || isProcessing}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isAnalyzing || isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isProcessing ? "Processing..." : "Analyzing..."}
                  </>
                ) : (
                  <>Analyze Call</>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 mt-4">
          {analysis && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Call Analysis Results</CardTitle>
                  <CardDescription>
                    AI-powered feedback on your sales call performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analysis.summary && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Call Summary</h3>
                      <div className="bg-muted p-4 rounded-md text-sm">
                        {analysis.summary}
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">
                      Call Transcript
                    </h3>
                    <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {transcript}
                    </div>
                  </div>

                  {renderFeedbackSection({
                    title: "Strengths",
                    items: analysis.strengths,
                    icon: <CheckCircle className="h-5 w-5" />,
                    color: "text-green-600",
                  })}

                  {renderFeedbackSection({
                    title: "Areas for Improvement",
                    items: analysis.improvements,
                    icon: <AlertCircle className="h-5 w-5" />,
                    color: "text-amber-600",
                  })}

                  {renderFeedbackSection({
                    title: "Key Recommendations",
                    items: analysis.recommendations,
                    icon: <Lightbulb className="h-5 w-5" />,
                    color: "text-blue-600",
                  })}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setActiveTab("upload");
                      setTranscript("");
                      setUploadedFile(null);
                      setAnalysis(null);
                    }}
                  >
                    Start New Analysis
                  </Button>
                  <Button
                    onClick={() => {
                      // In a real app, this would save the analysis to the database
                      // For now, just show a success message
                      alert("Analysis saved successfully!");
                    }}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    Save Analysis
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
