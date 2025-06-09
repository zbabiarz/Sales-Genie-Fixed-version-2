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
import { SavedCallResults } from "./SavedCallResults";
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
  analysis?: string;
  identity_name?: string;
  identity_description?: string;
};

// Helper function to get identity name and description based on score
const getIdentityInfo = (
  score: number,
): { name: string; emoji: string; description: string; tone: string } => {
  if (score >= 9) {
    return {
      name: "The Sales Prodigy",
      emoji: "🏆",
      description: "You're a master of the call. Others should take notes.",
      tone: "Aspirational",
    };
  } else if (score >= 7) {
    return {
      name: "The Closer-in-Training",
      emoji: "💼",
      description: "You're smooth. A few tweaks and you'll be unstoppable.",
      tone: "Confident",
    };
  } else if (score >= 5) {
    return {
      name: "The Script Reader",
      emoji: "📝",
      description: "You're following the playbook—now make it yours.",
      tone: "Playful + Honest",
    };
  } else if (score >= 3) {
    return {
      name: "The Try-Hard",
      emoji: "🎯",
      description:
        "You've got heart! With a bit of finesse, you'll hit the mark.",
      tone: "Encouraging",
    };
  } else {
    return {
      name: "The Rookie",
      emoji: "🐣",
      description: "You're just hatching. Lots of potential—time to level up!",
      tone: "Light + Humorous",
    };
  }
};

export function CallAnalyzer() {
  const [activeTab, setActiveTab] = useState("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  // Direct webhook URL for processing
  const webhookUrl =
    "https://effortlessai.app.n8n.cloud/webhook/5735f10d-5868-44b8-884e-cff2b722cb8d";
  const useMockData = false; // Always use the real webhook
  // Use our own API route instead of calling Supabase function directly
  const analysisWebhookUrl = "/api/call-analysis-webhook";
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
        console.log("Starting media file processing...");
        const transcriptAndAnalysis = await processMediaFile(
          uploadedFile,
          newRecordingId,
          userId,
        );
        console.log("Media file processing completed", transcriptAndAnalysis);

        // Add detailed logging before state updates
        console.log("About to update state with:", {
          transcript: transcriptAndAnalysis.transcript || "",
          analysis: transcriptAndAnalysis.analysis,
          analysisType: typeof transcriptAndAnalysis.analysis,
          analysisKeys: transcriptAndAnalysis.analysis
            ? Object.keys(transcriptAndAnalysis.analysis)
            : "null",
        });

        // Update state with detailed logging
        console.log("Setting transcript...");
        setTranscript(transcriptAndAnalysis.transcript || "");

        console.log("Setting analysis...");
        setAnalysis(transcriptAndAnalysis.analysis);

        console.log("Setting active tab to results...");
        setActiveTab("results");

        console.log("Setting isProcessing to false...");
        setIsProcessing(false);

        console.log(
          "State updates completed. Current analysis state should be:",
          transcriptAndAnalysis.analysis,
        );
      }
    } catch (error) {
      console.error("Error analyzing call:", error);
      const errorMessage = (error as Error).message;

      // Show appropriate error message based on error type
      if (errorMessage.includes("File too large")) {
        alert(
          "File too large. Please use a file smaller than 25MB and try again.",
        );
      } else if (errorMessage.includes("timeout")) {
        alert(
          "Request timeout. Please try with a smaller file or try again later.",
        );
      } else {
        alert(`Error processing file: ${errorMessage}`);
      }

      // Reset processing state
      setIsProcessing(false);
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
        "This file is very large (over 50MB). Processing may take longer and might fail. Consider using a smaller file for better results.",
      );
    }

    // Log file details for debugging
    console.log("Processing file:", {
      name: mediaFile.name,
      size: mediaFile.size,
      type: mediaFile.type,
      sizeInMB: (mediaFile.size / (1024 * 1024)).toFixed(2) + "MB",
    });

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
      let timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minute timeout for larger files

      // Send through our proxy endpoint to avoid CORS issues
      let proxyEndpoint = "/api/proxy-webhook";
      console.log("Using proxy endpoint:", proxyEndpoint);

      // Log what we're sending for debugging
      console.log("Sending to proxy with parameters:", {
        file: mediaFile.name,
        fileType: mediaFile.type,
        fileSize: mediaFile.size,
        binaryPropertyName: "file",
        recordingId: recordingId || "not set",
        userId: userId || "not set",
      });

      console.log("Sending request to proxy endpoint...");
      let webhookResponse = await fetch(proxyEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          "X-Target-Url": webhookUrl,
          // IMPORTANT: Do NOT set Content-Type manually for FormData
          // The browser will automatically set it with the correct boundary
        },
        signal: controller.signal,
      });
      console.log(
        "Received response from proxy endpoint:",
        webhookResponse.status,
      );

      clearTimeout(timeoutId);

      // Handle different error responses
      if (!webhookResponse.ok) {
        console.warn(
          `Webhook response not OK: ${webhookResponse.status} ${webhookResponse.statusText}`,
        );

        if (webhookResponse.status === 413) {
          const responseText = await webhookResponse.text();
          console.error("413 error response:", responseText);
          throw new Error(
            "File too large for the server. Please use a file smaller than 25MB. Current file size: " +
              (mediaFile.size / (1024 * 1024)).toFixed(2) +
              "MB",
          );
        } else if (webhookResponse.status === 408) {
          throw new Error(
            "Request timeout. Please try with a smaller file or try again later.",
          );
        } else if (webhookResponse.status >= 500) {
          const responseText = await webhookResponse.text();
          console.error("Server error response:", responseText);
          throw new Error("Server error occurred. Please try again later.");
        }

        // For other errors, try to get the error message from response
        try {
          const errorData = await webhookResponse.json();
          if (errorData.error) {
            throw new Error(errorData.error);
          }
        } catch (parseError) {
          console.error("Could not parse error response");
        }

        throw new Error(
          `Server returned error: ${webhookResponse.status} ${webhookResponse.statusText}`,
        );
      }

      console.log("Media file successfully sent to webhook");

      // Parse the webhook response
      let webhookData = await webhookResponse.json();
      console.log("Received webhook response:", webhookData);

      // Check if the response indicates an error
      if (webhookData.error && !webhookData.success) {
        throw new Error(webhookData.error);
      }

      // If we have a recordingId, wait for processing to complete and fetch results from Supabase
      if (recordingId) {
        try {
          console.log(
            "Waiting for n8n processing to complete for recording ID:",
            recordingId,
          );

          // First, send the data to our analysis webhook to ensure it's saved
          try {
            const analysisResponse = await fetch(analysisWebhookUrl, {
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
              analysisResults,
            );
            console.log("Type of analysisResults:", typeof analysisResults);
            console.log("About to call setIsProcessing(false)");
            setIsProcessing(false);
            console.log("setIsProcessing(false) completed");

            // Handle case where analysisResults might be a string instead of an object
            let parsedResults = analysisResults;
            if (typeof analysisResults === "string") {
              console.log(
                "Analysis results is a string, attempting to parse or structure it",
              );
              // If it's a comma-separated string, split it into an array
              const items = analysisResults
                .split(",")
                .map((item) => item.trim());
              parsedResults = {
                agents_strengths: items.slice(0, Math.ceil(items.length / 3)),
                areas_for_improvement: items.slice(
                  Math.ceil(items.length / 3),
                  Math.ceil((2 * items.length) / 3),
                ),
                actionable_recommendations: items.slice(
                  Math.ceil((2 * items.length) / 3),
                ),
                analysis: analysisResults,
                final_score: "7.5/10",
              };
              console.log("Parsed results from string:", parsedResults);
            }

            // Map the analysis results to our expected format
            const scoreValue =
              parsedResults.final_score &&
              typeof parsedResults.final_score === "string"
                ? parseFloat(parsedResults.final_score.split("/")[0]) || 7.5
                : 7.5;

            // Get identity info based on score
            const identityInfo = getIdentityInfo(scoreValue);

            const mappedAnalysis: CallAnalysis = {
              strengths: Array.isArray(parsedResults.agents_strengths)
                ? parsedResults.agents_strengths
                : parsedResults.agents_strengths
                  ? [parsedResults.agents_strengths]
                  : [],
              improvements: Array.isArray(parsedResults.areas_for_improvement)
                ? parsedResults.areas_for_improvement
                : parsedResults.areas_for_improvement
                  ? [parsedResults.areas_for_improvement]
                  : [],
              recommendations: Array.isArray(
                parsedResults.actionable_recommendations,
              )
                ? parsedResults.actionable_recommendations
                : parsedResults.actionable_recommendations
                  ? [parsedResults.actionable_recommendations]
                  : [],
              summary:
                webhookData.summary ||
                parsedResults.summary ||
                "Call analysis completed successfully.",
              sentiment: {
                overall: "Moderately Effective",
                tonality: "Professional",
                score: scoreValue,
              },
              // Include all the additional fields from the analysis results, ensuring they're properly formatted
              agents_strengths: Array.isArray(parsedResults.agents_strengths)
                ? parsedResults.agents_strengths
                : parsedResults.agents_strengths
                  ? [parsedResults.agents_strengths]
                  : [],
              areas_for_improvement: Array.isArray(
                parsedResults.areas_for_improvement,
              )
                ? parsedResults.areas_for_improvement
                : parsedResults.areas_for_improvement
                  ? [parsedResults.areas_for_improvement]
                  : [],
              actionable_recommendations: Array.isArray(
                parsedResults.actionable_recommendations,
              )
                ? parsedResults.actionable_recommendations
                : parsedResults.actionable_recommendations
                  ? [parsedResults.actionable_recommendations]
                  : [],
              missed_opportunities: Array.isArray(
                parsedResults.missed_opportunities,
              )
                ? parsedResults.missed_opportunities
                : parsedResults.missed_opportunities
                  ? [parsedResults.missed_opportunities]
                  : [],
              suggested_training_focus:
                typeof parsedResults.suggested_training_focus === "string"
                  ? parsedResults.suggested_training_focus
                  : "Focus on discovery questions and benefit explanations",
              final_score:
                typeof parsedResults.final_score === "string"
                  ? parsedResults.final_score
                  : "7.5/10",
              topics: Array.isArray(parsedResults.topics)
                ? parsedResults.topics
                : parsedResults.topics
                  ? [parsedResults.topics]
                  : ["Sales Call", "Insurance"],
              keywords: Array.isArray(parsedResults.keywords)
                ? parsedResults.keywords
                : parsedResults.keywords
                  ? [parsedResults.keywords]
                  : ["Sales", "Insurance", "Call Analysis"],
              total_call_duration:
                typeof parsedResults.total_call_duration === "string"
                  ? parsedResults.total_call_duration
                  : "Unknown duration",
              analysis:
                typeof parsedResults.analysis === "string"
                  ? parsedResults.analysis
                  : typeof analysisResults === "string"
                    ? analysisResults
                    : "Analysis completed",
              identity_name: `${identityInfo.emoji} ${identityInfo.name}`,
              identity_description: identityInfo.description,
            };

            console.log("Mapped analysis object created:", mappedAnalysis);
            console.log("About to return analysis data to main function");

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
          console.log("Error occurred, calling setIsProcessing(false)");
          setIsProcessing(false);
          console.log("setIsProcessing(false) completed after error");
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

      // Show specific error messages based on the error type
      const errorMessage = (error as Error).message;
      if (errorMessage.includes("File too large")) {
        alert("File too large. Please use a file smaller than 25MB.");
      } else if (errorMessage.includes("timeout")) {
        alert(
          "Request timeout. Please try with a smaller file or try again later.",
        );
      } else {
        alert(
          `Error processing file: ${errorMessage}. Please try again with a smaller file.`,
        );
      }

      // Don't return mock data, let the error propagate
      throw error;
    }
  };

  // Helper function to format transcript with speaker separation
  const formatTranscript = (transcriptText: string): React.ReactNode => {
    if (!transcriptText || transcriptText.trim() === "") {
      return "No transcript available";
    }

    // Split by common speaker indicators or natural breaks
    const speakerPatterns = [
      /([A-Za-z\s]+):\s/g, // "Speaker: text"
      /\[([^\]]+)\]:\s/g, // "[Speaker]: text"
      /\n\s*-\s+/g, // New line with dash
      /\n\n+/g, // Multiple new lines
      /\.\s+(?=[A-Z])/g, // Period followed by capital letter
      /\?\s+(?=[A-Z])/g, // Question mark followed by capital letter
      /!\s+(?=[A-Z])/g, // Exclamation mark followed by capital letter
    ];

    // First check if transcript already has speaker labels
    const hasExistingSpeakers = /([A-Za-z\s]+:|\[[^\]]+\]:)/.test(
      transcriptText,
    );

    if (hasExistingSpeakers) {
      // If transcript already has speaker labels, just format it nicely
      const parts = transcriptText.split(/([A-Za-z\s]+:|\[[^\]]+\]:)/);
      const formattedParts: React.ReactNode[] = [];

      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0 && i > 0) {
          // This is content after a speaker label
          formattedParts.push(<span key={`content-${i}`}>{parts[i]}</span>);
          formattedParts.push(<br key={`br-${i}`} />);
          formattedParts.push(<br key={`br2-${i}`} />);
        } else if (/([A-Za-z\s]+:|\[[^\]]+\]:)/.test(parts[i])) {
          // This is a speaker label
          formattedParts.push(
            <span key={`speaker-${i}`} className="font-bold text-teal-700">
              {parts[i]}
            </span>,
          );
        } else if (parts[i]) {
          // This is content without a speaker label
          formattedParts.push(<span key={`text-${i}`}>{parts[i]}</span>);
        }
      }

      return <>{formattedParts}</>;
    } else {
      // If no existing speaker labels, try to identify different speakers
      let segments: string[] = [transcriptText];

      // Apply each pattern to split the text
      for (const pattern of speakerPatterns) {
        const newSegments: string[] = [];
        for (const segment of segments) {
          const splitParts = segment.split(pattern);
          if (splitParts.length > 1) {
            for (let i = 0; i < splitParts.length; i++) {
              if (splitParts[i].trim()) {
                newSegments.push(splitParts[i].trim());
              }
            }
          } else {
            newSegments.push(segment);
          }
        }
        segments = newSegments.filter((s) => s.trim() !== "");
      }

      // Assign speakers to segments
      const formattedSegments: React.ReactNode[] = [];
      let currentSpeaker = 1;
      let lastSpeaker = 1;

      segments.forEach((segment, index) => {
        // Simple heuristic: alternate speakers for each segment
        // In a real implementation, you might use more sophisticated speaker diarization
        if (index > 0 && segment.length > 15) {
          // Only switch speakers for substantial segments
          currentSpeaker = currentSpeaker === 1 ? 2 : 1;
        }

        // Only add speaker label if it's different from the last one
        if (currentSpeaker !== lastSpeaker || index === 0) {
          formattedSegments.push(
            <div
              key={`speaker-${index}`}
              className="font-bold text-teal-700 mt-4"
            >
              Caller {currentSpeaker}:
            </div>,
          );
          lastSpeaker = currentSpeaker;
        }

        formattedSegments.push(
          <div key={`segment-${index}`} className="ml-4 mb-2">
            {segment}
          </div>,
        );
      });

      return <>{formattedSegments}</>;
    }
  };

  // Helper function to get mock analysis data
  const getMockAnalysisData = () => {
    const mockTranscript =
      "Hello, this is John from Insurance Sales Genie. I'm calling to discuss your insurance needs. Based on your profile, I think our Premium Health plan would be a great fit for you. It offers comprehensive coverage with a low deductible. What do you think about that? ... Yes, the monthly premium is $450. ... I understand your concern about the price. We do have a more affordable Basic Care plan at $250 per month, but it doesn't include dental and vision. ... Great, I'll send you more information about both plans. Is there anything specific you'd like to know about these plans?";

    const mockScore = 8.5;
    const identityInfo = getIdentityInfo(mockScore);

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
        identity_name: `${identityInfo.emoji} ${identityInfo.name}`,
        identity_description: identityInfo.description,
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

  const saveAnalysis = async () => {
    if (!analysis || !recordingId) {
      alert("No analysis available to save");
      return;
    }

    setIsSaving(true);
    try {
      // Update the call recording record to mark it as saved
      const { error } = await supabase
        .from("call_recordings")
        .update({
          status: "completed",
          analysis_results: analysis,
          transcript: transcript,
        })
        .eq("id", recordingId);

      if (error) {
        console.error("Error saving analysis:", error);
        alert("Failed to save analysis. Please try again.");
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000); // Reset success message after 3 seconds
      }
    } catch (error) {
      console.error("Error saving analysis:", error);
      alert("An unexpected error occurred while saving the analysis.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" disabled={isAnalyzing}>
            Upload & Analyze
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!analysis || isAnalyzing}>
            Analysis Results
          </TabsTrigger>
          <TabsTrigger value="saved">Saved Call Results</TabsTrigger>
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
                      Recommended file size: under 25MB
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
          {/* Debug logging for analysis state */}
          {console.log("Rendering results tab. Analysis state:", analysis)}
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

                  {renderFeedbackSection({
                    title: "Strengths",
                    items: Array.isArray(analysis.agents_strengths)
                      ? analysis.agents_strengths
                      : Array.isArray(analysis.strengths)
                        ? analysis.strengths
                        : [],
                    icon: <CheckCircle className="h-5 w-5" />,
                    color: "text-green-600",
                  })}

                  {renderFeedbackSection({
                    title: "Areas for Improvement",
                    items: Array.isArray(analysis.areas_for_improvement)
                      ? analysis.areas_for_improvement
                      : Array.isArray(analysis.improvements)
                        ? analysis.improvements
                        : [],
                    icon: <AlertCircle className="h-5 w-5" />,
                    color: "text-amber-600",
                  })}

                  {Array.isArray(analysis.missed_opportunities) &&
                    analysis.missed_opportunities.length > 0 &&
                    renderFeedbackSection({
                      title: "Missed Opportunities",
                      items: analysis.missed_opportunities,
                      icon: <AlertCircle className="h-5 w-5" />,
                      color: "text-orange-600",
                    })}

                  {renderFeedbackSection({
                    title: "Key Recommendations",
                    items: Array.isArray(analysis.actionable_recommendations)
                      ? analysis.actionable_recommendations
                      : Array.isArray(analysis.recommendations)
                        ? analysis.recommendations
                        : [],
                    icon: <Lightbulb className="h-5 w-5" />,
                    color: "text-blue-600",
                  })}

                  <Card className="mb-4">
                    <CardHeader className="flex flex-row items-center gap-2 text-purple-600">
                      <Lightbulb className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        Detailed Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                        {analysis.analysis || "No detailed analysis available"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="mb-4">
                    <CardHeader className="flex flex-row items-center gap-2 bg-purple-50">
                      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100">
                        <span className="text-purple-600 text-xs font-bold">
                          📊
                        </span>
                      </div>
                      <CardTitle className="text-lg">
                        Final Call Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col space-y-4">
                        {analysis.topics &&
                          Array.isArray(analysis.topics) &&
                          analysis.topics.length > 0 && (
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

                        {analysis.keywords &&
                          Array.isArray(analysis.keywords) &&
                          analysis.keywords.length > 0 && (
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

                        {analysis.suggested_training_focus &&
                          typeof analysis.suggested_training_focus ===
                            "string" && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-500 mb-1">
                                SUGGESTED TRAINING FOCUS
                              </h4>
                              <p className="text-lg font-medium">
                                {analysis.suggested_training_focus}
                              </p>
                            </div>
                          )}

                        <div>
                          <h4 className="font-medium text-sm text-gray-500 mb-1">
                            CALL SCORE
                          </h4>
                          <div className="flex items-center gap-3">
                            {/* Completely new implementation of the score bar */}
                            <div className="relative w-full max-w-xs h-6 bg-gray-200 rounded-full overflow-hidden">
                              {(() => {
                                // Get the score as a number between 0-10
                                let score = 0;
                                let maxScore = 10;

                                if (analysis.final_score) {
                                  const parts = analysis.final_score.split("/");
                                  score = parseFloat(parts[0]) || 0;
                                  maxScore = parseFloat(parts[1]) || 10;
                                } else if (analysis.sentiment?.score) {
                                  score = analysis.sentiment.score;
                                  maxScore = 10;
                                } else {
                                  score = 7; // Default score
                                  maxScore = 10;
                                }

                                // Calculate percentage width
                                const percentage = (score / maxScore) * 100;

                                // Determine color based on score
                                let color = "bg-red-500";
                                if (score >= 8) color = "bg-green-500";
                                else if (score >= 6) color = "bg-yellow-500";

                                return (
                                  <div
                                    className={`absolute top-0 left-0 h-full ${color}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                );
                              })()}
                            </div>
                            <span className="text-xl font-bold">
                              {analysis.final_score ||
                                (analysis.sentiment?.score
                                  ? `${analysis.sentiment.score.toFixed(1)}/10`
                                  : "N/A")}
                            </span>
                          </div>

                          {/* Identity name and description */}
                          {analysis.identity_name && (
                            <div className="mt-3">
                              <h4 className="text-lg font-semibold text-purple-700">
                                {analysis.identity_name}
                              </h4>
                              {analysis.identity_description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {analysis.identity_description}
                                </p>
                              )}
                            </div>
                          )}
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
                    onClick={saveAnalysis}
                    disabled={isSaving || !recordingId}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      "Saved Successfully!"
                    ) : (
                      "Save Analysis"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Call Analyses</CardTitle>
              <CardDescription>
                View and manage your previously analyzed sales calls
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Import and use the SavedCallResults component */}
              <SavedCallResults />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
