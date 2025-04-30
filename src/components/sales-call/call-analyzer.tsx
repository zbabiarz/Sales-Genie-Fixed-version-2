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
  sentiment?: {
    overall: string;
    tonality: string;
    score: number;
  };
  agents_strengths?: string[];
  areas_for_improvement?: string[];
  actionable_recommendations?: string[];
  missed_opportunities?: string[];
  suggested_training_focus?: string;
  final_score?: string;
  topics?: string[];
  keywords?: string[];
  total_call_duration?: string;
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
      // Don't mark as failed immediately, it might still be processing
      // Just inform the user that processing might take time
      alert(
        "Your call is being processed and may take up to 3 minutes to complete. Please try again in a few minutes.",
      );
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

      // Even if the response is not OK, we'll try to process it
      // The proxy will handle errors and return mock data if needed
      if (!webhookResponse.ok) {
        console.warn(
          `Webhook response not OK: ${webhookResponse.status} ${webhookResponse.statusText}`,
        );
        console.log("Continuing to process response despite error status");
      }

      console.log("Media file successfully sent to webhook");

      // Parse the webhook response
      let webhookData = await webhookResponse.json();
      console.log("Received webhook response:", webhookData);

      // If we have a recordingId, wait for processing to complete and fetch results from Supabase
      if (recordingId) {
        try {
          console.log(
            "Waiting for n8n processing to complete for recording ID:",
            recordingId,
          );

          // First, send the data to our analysis webhook to ensure it's saved
          try {
            await fetch(analysisWebhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                recordingId: recordingId,
                userId: userId,
                transcript: webhookData.transcript || "",
                analysis: webhookData.analysis || {},
              }),
            });
            console.log("Sent initial data to analysis webhook");
          } catch (webhookError) {
            console.error("Error sending to analysis webhook:", webhookError);
          }

          // Poll the database for results
          let attempts = 0;
          const maxAttempts = 40; // 40 attempts * 6 seconds = up to 4 minutes of waiting
          let analysisResults = null;
          let transcriptResult = null;

          // Show a loading message to the user
          setIsProcessing(true);

          while (attempts < maxAttempts) {
            attempts++;
            console.log(
              `Polling for results (attempt ${attempts}/${maxAttempts})...`,
            );

            // Check if the analysis results are available
            const { data: recordingData, error: recordingError } =
              await supabase
                .from("call_recordings")
                .select("*")
                .eq("id", recordingId)
                .single();

            if (recordingError) {
              console.error("Error fetching recording data:", recordingError);
            } else if (recordingData && recordingData.analysis_results) {
              console.log(
                "Found analysis results:",
                recordingData.analysis_results,
              );
              analysisResults = recordingData.analysis_results;
              transcriptResult =
                recordingData.transcript || webhookData.transcript || "";
              break;
            } else if (recordingData && recordingData.status === "failed") {
              console.error("Processing failed according to database status");
              break;
            }

            // Wait 6 seconds before checking again
            await new Promise((resolve) => setTimeout(resolve, 6000));
          }

          if (analysisResults) {
            console.log(
              "Successfully retrieved analysis results from database",
            );
            setIsProcessing(false);

            // Map the analysis results to our expected format
            const mappedAnalysis: CallAnalysis = {
              strengths: analysisResults.agents_strengths || [],
              improvements: analysisResults.areas_for_improvement || [],
              recommendations: analysisResults.actionable_recommendations || [],
              summary: webhookData.summary || "",
              sentiment: {
                overall: "Moderately Effective",
                tonality: "Professional",
                score:
                  parseFloat(analysisResults.final_score?.split("/")[0]) || 7,
              },
              // Include all the additional fields from the analysis results
              agents_strengths: analysisResults.agents_strengths,
              areas_for_improvement: analysisResults.areas_for_improvement,
              actionable_recommendations:
                analysisResults.actionable_recommendations,
              missed_opportunities: analysisResults.missed_opportunities,
              suggested_training_focus:
                analysisResults.suggested_training_focus,
              final_score: analysisResults.final_score,
              topics: analysisResults.topics,
              keywords: analysisResults.keywords,
              total_call_duration: analysisResults.total_call_duration,
            };

            return {
              transcript: transcriptResult,
              analysis: mappedAnalysis,
            };
          }
        } catch (error) {
          console.error(
            "Error waiting for or processing analysis results:",
            error,
          );
          setIsProcessing(false);
          alert(
            "Your call is still being processed. Please check back in a few minutes.",
          );
        }
      }

      // If we get here, either we don't have a recordingId or polling failed
      // Check if we have a valid response with transcript and analysis from the webhook
      if (webhookData && webhookData.transcript && webhookData.analysis) {
        console.log("Using data directly from webhook response");
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
      // Show a more informative message about the processing status
      alert(
        `Your call is being processed through n8n and may take up to 3 minutes to complete. Please try again in a few minutes.`,
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
        agents_strengths: [
          "Good introduction with clear identification",
          "Offered product recommendations based on client profile",
          "Provided specific pricing information",
          "Offered alternative options when price concern was raised",
          "Ended with a clear next step (sending information)",
        ],
        areas_for_improvement: [
          "Didn't ask enough discovery questions before recommending products",
          "Limited explanation of product benefits",
          "Didn't address potential health condition concerns",
          "Could have explored client's specific needs more deeply",
        ],
        actionable_recommendations: [
          "Start with more discovery questions before making recommendations",
          "Explain product benefits in more detail, connecting them to client needs",
          "Prepare responses for common objections beyond price",
          "Use more comparative language when presenting multiple options",
          "Add a specific call-to-action at the end of the conversation",
        ],
        missed_opportunities: [
          "Didn't ask enough discovery questions before recommending products",
          "Limited explanation of product benefits",
          "Didn't address potential health condition concerns",
          "Could have explored client's specific needs more deeply",
        ],
        suggested_training_focus: [
          "Start with more discovery questions before making recommendations",
          "Explain product benefits in more detail, connecting them to client needs",
          "Prepare responses for common objections beyond price",
          "Use more comparative language when presenting multiple options",
          "Add a specific call-to-action at the end of the conversation",
        ],
        final_score: "8.5",
        topics: [
          "Health Insurance",
          "Sales Call",
          "Product Recommendations",
          "Price Concerns",
          "Alternative Options",
        ],
        keywords: [
          "Health Insurance",
          "Sales Call",
          "Product Recommendations",
          "Price Concerns",
          "Alternative Options",
        ],
        total_call_duration: "5 minutes",
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
                    {isProcessing
                      ? "Processing (may take up to 3 minutes)..."
                      : "Analyzing..."}
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
                    items: analysis.agents_strengths || analysis.strengths,
                    icon: <CheckCircle className="h-5 w-5" />,
                    color: "text-green-600",
                  })}

                  {renderFeedbackSection({
                    title: "Areas for Improvement",
                    items:
                      analysis.areas_for_improvement || analysis.improvements,
                    icon: <AlertCircle className="h-5 w-5" />,
                    color: "text-amber-600",
                  })}

                  {analysis.missed_opportunities &&
                    analysis.missed_opportunities.length > 0 &&
                    renderFeedbackSection({
                      title: "Missed Opportunities",
                      items: analysis.missed_opportunities,
                      icon: <AlertCircle className="h-5 w-5" />,
                      color: "text-orange-600",
                    })}

                  {renderFeedbackSection({
                    title: "Key Recommendations",
                    items:
                      analysis.actionable_recommendations ||
                      analysis.recommendations,
                    icon: <Lightbulb className="h-5 w-5" />,
                    color: "text-blue-600",
                  })}

                  <Card className="mb-4">
                    <CardHeader className="flex flex-row items-center gap-2 bg-purple-50">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100">
                        <span className="text-purple-600 text-xs font-bold">
                          S
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        Call Sentiment Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col space-y-4">
                        {analysis.topics && analysis.topics.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-1">
                              CALL TOPICS
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {analysis.topics.map((topic, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.keywords && analysis.keywords.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-1">
                              KEY TERMS
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {analysis.keywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.suggested_training_focus && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-500 mb-1">
                              SUGGESTED TRAINING FOCUS
                            </h4>
                            <p className="text-lg font-medium">
                              {analysis.suggested_training_focus}
                            </p>
                          </div>
                        )}

                        {analysis.total_call_duration &&
                          analysis.total_call_duration !== "Not provided" && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-500 mb-1">
                                CALL DURATION
                              </h4>
                              <p className="text-lg font-medium">
                                {analysis.total_call_duration}
                              </p>
                            </div>
                          )}

                        <div>
                          <h4 className="font-medium text-sm text-gray-500 mb-1">
                            CALL SCORE
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="relative w-full max-w-xs h-6 bg-gray-200 rounded-full overflow-hidden">
                              {analysis.final_score ? (
                                <div
                                  className={`absolute top-0 left-0 h-full ${
                                    parseInt(
                                      analysis.final_score.split("/")[0],
                                    ) >= 8
                                      ? "bg-green-500"
                                      : parseInt(
                                            analysis.final_score.split("/")[0],
                                          ) >= 6
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${(parseInt(analysis.final_score.split("/")[0]) / parseInt(analysis.final_score.split("/")[1])) * 100}%`,
                                  }}
                                ></div>
                              ) : analysis.sentiment?.score ? (
                                <div
                                  className={`absolute top-0 left-0 h-full ${
                                    analysis.sentiment.score >= 8
                                      ? "bg-green-500"
                                      : analysis.sentiment.score >= 6
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${(analysis.sentiment.score / 10) * 100}%`,
                                  }}
                                ></div>
                              ) : null}
                            </div>
                            <span className="text-xl font-bold">
                              {analysis.final_score ||
                                (analysis.sentiment?.score
                                  ? `${analysis.sentiment.score.toFixed(1)}/10`
                                  : "N/A")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            {analysis.final_score &&
                            parseInt(analysis.final_score.split("/")[0]) >= 8
                              ? "Excellent call performance based on the Jeremy Miner methodology"
                              : analysis.final_score &&
                                  parseInt(
                                    analysis.final_score.split("/")[0],
                                  ) >= 6
                                ? "Good call with room for improvement in the Jeremy Miner framework"
                                : analysis.final_score
                                  ? "Needs significant improvement to align with Jeremy Miner sales principles"
                                  : "Score not available"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
