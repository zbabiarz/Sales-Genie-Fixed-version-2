"use client";

import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
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
    setIsUploading(true);

    try {
      if (uploadedFile) {
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
                status: "uploading",
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

        // Upload file to Vercel Blob
        console.log("Starting file upload to Vercel Blob...");
        try {
          const blob = await upload(uploadedFile.name, uploadedFile, {
            access: "public",
            handleUploadUrl: "/api/call-upload",
            clientPayload: {
              recordingId: newRecordingId,
              userId: userId,
              fileName: uploadedFile.name,
              fileSize: uploadedFile.size,
              fileType: uploadedFile.type,
            },
          });

          console.log("File uploaded successfully:", blob.url);
          setIsUploading(false);
          setIsProcessing(true);

          // Wait for analysis to complete by polling the database
          await waitForAnalysisCompletion(newRecordingId);
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          throw new Error(
            "Failed to upload file: " + (uploadError as Error).message,
          );
        }
      }
    } catch (error) {
      console.error("Error analyzing call:", error);
      const errorMessage = (error as Error).message;

      // Show appropriate error message based on error type
      if (errorMessage.includes("File too large")) {
        alert(
          "File too large. Please use a file smaller than 100MB and try again.",
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
      setIsUploading(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const waitForAnalysisCompletion = async (recordingId: string | null) => {
    if (!recordingId) return;

    let attempts = 0;
    const maxAttempts = 40; // 40 attempts * 6 seconds = up to 4 minutes of waiting
    let analysisResults = null;
    let transcriptResult = null;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(
        `Polling for results (attempt ${attempts}/${maxAttempts})...`,
      );

      // Check if the analysis results are available
      const { data: recordingData, error: recordingError } = await supabase
        .from("call_recordings")
        .select("*")
        .eq("id", recordingId)
        .single();

      if (recordingError) {
        console.error("Error fetching recording data:", recordingError);
      } else if (recordingData && recordingData.analysis_results) {
        console.log("Found analysis results:", recordingData.analysis_results);
        analysisResults = recordingData.analysis_results;
        transcriptResult = recordingData.transcript || "";
        break;
      } else if (recordingData && recordingData.status === "failed") {
        console.error("Processing failed according to database status");
        throw new Error("Analysis processing failed");
      }

      // Wait 6 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }

    if (analysisResults) {
      console.log(
        "Successfully retrieved analysis results from database",
        analysisResults,
      );
      setIsProcessing(false);

      // Handle case where analysisResults might be a string instead of an object
      let parsedResults = analysisResults;
      if (typeof analysisResults === "string") {
        console.log(
          "Analysis results is a string, checking if it's JSON or plain text",
        );
        // Don't try to parse as JSON - N8N sends comma-separated text
        // Treat it as plain text analysis
        console.log("Treating string as plain text analysis from N8N");
        parsedResults = { analysis: analysisResults };
        console.log("Parsed results from string:", parsedResults);
      }

      // Map the analysis results to our expected format
      // For N8N data, extract score from the analysis text
      const scoreValue = (() => {
        if (parsedResults.final_score) {
          const scoreStr = parsedResults.final_score.toString();
          if (scoreStr.includes("/")) {
            return parseFloat(scoreStr.split("/")[0]) || 0;
          }
          return parseFloat(scoreStr) || 0;
        }

        // Try to extract score from analysis text for N8N data
        if (
          parsedResults.analysis &&
          typeof parsedResults.analysis === "string"
        ) {
          // Look for patterns like "7.8/10" or "Score: 7.8" in the text
          const scoreMatch = parsedResults.analysis.match(
            /(?:score[:\s]*|rating[:\s]*)([0-9]+\.?[0-9]*)(?:\/10)?/i,
          );
          if (scoreMatch) {
            return parseFloat(scoreMatch[1]) || 0;
          }
        }

        return 0;
      })();

      // Get identity info based on score
      const identityInfo = getIdentityInfo(scoreValue);

      // For N8N data, parse the comma-separated analysis text into structured data
      const parseN8NAnalysis = (analysisText: string) => {
        if (!analysisText || typeof analysisText !== "string") {
          return {
            strengths: [],
            improvements: [],
            recommendations: [],
            analysis: analysisText || "",
          };
        }

        // Split by comma and clean up each item
        const items = analysisText
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 5); // Filter out very short items

        console.log("Parsed N8N items:", items);

        // Since the data you provided appears to be all recommendations/suggestions,
        // we'll categorize them more intelligently
        const strengths: string[] = [];
        const improvements: string[] = [];
        const recommendations: string[] = [];

        items.forEach((item) => {
          // Clean up the item text
          let cleanItem = item.trim();

          // Remove any leading/trailing quotes
          cleanItem = cleanItem.replace(/^["']+|["']+$/g, "");

          // Skip empty items
          if (!cleanItem) return;

          // Categorize based on content patterns
          if (
            /asking|exploring|probing|using|inviting|try asking|consider asking/i.test(
              cleanItem,
            )
          ) {
            // These are recommendations for questions to ask or techniques to use
            recommendations.push(cleanItem);
          } else if (
            /good|excellent|well done|strength|positive|effective|successfully/i.test(
              cleanItem,
            )
          ) {
            // These indicate strengths
            strengths.push(cleanItem);
          } else if (
            /improve|better|should|could|need|lack|weak|miss|avoid|don't/i.test(
              cleanItem,
            )
          ) {
            // These indicate areas for improvement
            improvements.push(cleanItem);
          } else {
            // Default to recommendations if unclear
            recommendations.push(cleanItem);
          }
        });

        console.log("Categorized results:", {
          strengths,
          improvements,
          recommendations,
        });

        return {
          strengths,
          improvements,
          recommendations,
          analysis: analysisText,
        };
      };

      // Parse N8N data if it's a string
      const n8nData =
        typeof parsedResults.analysis === "string"
          ? parseN8NAnalysis(parsedResults.analysis)
          : {
              strengths: [],
              improvements: [],
              recommendations: [],
              analysis: "",
            };

      const mappedAnalysis: CallAnalysis = {
        strengths: Array.isArray(parsedResults.agents_strengths)
          ? parsedResults.agents_strengths
          : parsedResults.agents_strengths
            ? [parsedResults.agents_strengths]
            : n8nData.strengths,
        improvements: Array.isArray(parsedResults.areas_for_improvement)
          ? parsedResults.areas_for_improvement
          : parsedResults.areas_for_improvement
            ? [parsedResults.areas_for_improvement]
            : n8nData.improvements,
        recommendations: Array.isArray(parsedResults.actionable_recommendations)
          ? parsedResults.actionable_recommendations
          : parsedResults.actionable_recommendations
            ? [parsedResults.actionable_recommendations]
            : n8nData.recommendations,
        summary: parsedResults.summary || "",
        sentiment: parsedResults.sentiment || {
          overall: "",
          tonality: "",
          score: scoreValue,
        },
        // Include all the additional fields from the analysis results, ensuring they're properly formatted
        agents_strengths: Array.isArray(parsedResults.agents_strengths)
          ? parsedResults.agents_strengths
          : parsedResults.agents_strengths
            ? [parsedResults.agents_strengths]
            : n8nData.strengths,
        areas_for_improvement: Array.isArray(
          parsedResults.areas_for_improvement,
        )
          ? parsedResults.areas_for_improvement
          : parsedResults.areas_for_improvement
            ? [parsedResults.areas_for_improvement]
            : n8nData.improvements,
        actionable_recommendations: Array.isArray(
          parsedResults.actionable_recommendations,
        )
          ? parsedResults.actionable_recommendations
          : parsedResults.actionable_recommendations
            ? [parsedResults.actionable_recommendations]
            : n8nData.recommendations,
        missed_opportunities: Array.isArray(parsedResults.missed_opportunities)
          ? parsedResults.missed_opportunities
          : parsedResults.missed_opportunities
            ? [parsedResults.missed_opportunities]
            : [],
        suggested_training_focus:
          typeof parsedResults.suggested_training_focus === "string"
            ? parsedResults.suggested_training_focus
            : "",
        final_score: scoreValue > 0 ? `${scoreValue}/10` : "0/10",
        topics: Array.isArray(parsedResults.topics)
          ? parsedResults.topics
          : parsedResults.topics
            ? [parsedResults.topics]
            : [],
        keywords: Array.isArray(parsedResults.keywords)
          ? parsedResults.keywords
          : parsedResults.keywords
            ? [parsedResults.keywords]
            : [],
        total_call_duration:
          typeof parsedResults.total_call_duration === "string"
            ? parsedResults.total_call_duration
            : "",
        analysis: n8nData.analysis || parsedResults.analysis || "",
        identity_name: `${identityInfo.emoji} ${identityInfo.name}`,
        identity_description: identityInfo.description,
      };

      console.log("Mapped analysis object created:", mappedAnalysis);

      setTranscript(transcriptResult);
      setAnalysis(mappedAnalysis);
      setActiveTab("results");
    } else {
      throw new Error("Analysis timed out. Please try again.");
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
      <CardContent className="max-h-96 overflow-y-auto">
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="min-w-4 mt-1.5">
                <div
                  className={`h-2 w-2 rounded-full ${color.replace("text-", "bg-")}`}
                />
              </div>
              <span className="text-sm leading-relaxed">{item}</span>
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
                    <span className="text-green-600 font-medium">
                      Now supports files up to 100MB!
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
                disabled={
                  isAnalyzing || !uploadedFile || isProcessing || isUploading
                }
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading file...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing (may take up to 3 minutes)...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
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
                  {analysis.summary && analysis.summary.trim() !== "" && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-2">Call Summary</h3>
                      <div className="bg-muted p-4 rounded-md text-sm">
                        {analysis.summary}
                      </div>
                    </div>
                  )}

                  {renderFeedbackSection({
                    title: "Agent Strengths",
                    items:
                      Array.isArray(analysis.agents_strengths) &&
                      analysis.agents_strengths.length > 0
                        ? analysis.agents_strengths
                        : [],
                    icon: <CheckCircle className="h-5 w-5" />,
                    color: "text-green-600",
                  })}

                  {renderFeedbackSection({
                    title: "Areas for Improvement",
                    items:
                      Array.isArray(analysis.areas_for_improvement) &&
                      analysis.areas_for_improvement.length > 0
                        ? analysis.areas_for_improvement
                        : [],
                    icon: <AlertCircle className="h-5 w-5" />,
                    color: "text-amber-600",
                  })}

                  {renderFeedbackSection({
                    title: "Missed Opportunities",
                    items:
                      Array.isArray(analysis.missed_opportunities) &&
                      analysis.missed_opportunities.length > 0
                        ? analysis.missed_opportunities
                        : [],
                    icon: <AlertCircle className="h-5 w-5" />,
                    color: "text-orange-600",
                  })}

                  {renderFeedbackSection({
                    title: "Key Recommendations",
                    items:
                      Array.isArray(analysis.actionable_recommendations) &&
                      analysis.actionable_recommendations.length > 0
                        ? analysis.actionable_recommendations
                        : [],
                    icon: <Lightbulb className="h-5 w-5" />,
                    color: "text-blue-600",
                  })}

                  <Card className="mb-4">
                    <CardHeader className="flex flex-row items-center gap-2 text-purple-600">
                      <Lightbulb className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        Suggested Training Focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-96 overflow-y-auto">
                      <div className="bg-muted p-4 rounded-md text-sm leading-relaxed">
                        {(() => {
                          if (
                            !analysis.suggested_training_focus ||
                            analysis.suggested_training_focus.trim() === ""
                          ) {
                            return "No training focus suggestions available";
                          }

                          // Use the suggested_training_focus field directly
                          const trainingFocusText =
                            analysis.suggested_training_focus;

                          // Split by common patterns that indicate separate recommendations
                          let items: string[] = [];

                          // Try different splitting patterns
                          if (trainingFocusText.includes("',")) {
                            // Split by quote-comma pattern
                            items = trainingFocusText
                              .split("',")
                              .map((item) =>
                                item.trim().replace(/^['"]|['"]$/g, ""),
                              )
                              .filter((item) => item.length > 0);
                          } else if (
                            trainingFocusText.includes(", ") &&
                            trainingFocusText.length > 100
                          ) {
                            // Split by comma-space for longer text
                            items = trainingFocusText
                              .split(", ")
                              .map((item) => item.trim())
                              .filter((item) => item.length > 20); // Only split if items are substantial
                          }

                          // If we found multiple items, format as a list
                          if (items.length > 1) {
                            return (
                              <ul className="space-y-3">
                                {items.map((item, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2"
                                  >
                                    <span className="text-purple-600 mt-1 font-bold">
                                      •
                                    </span>
                                    <span className="leading-relaxed">
                                      {item}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            );
                          }

                          // Otherwise, return as plain text with proper formatting
                          return (
                            <div className="leading-relaxed whitespace-pre-wrap">
                              {trainingFocusText}
                            </div>
                          );
                        })()}
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
                          analysis.topics.length > 0 &&
                          analysis.topics.some(
                            (topic) => topic && topic.trim() !== "",
                          ) && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-500 mb-1">
                                CALL TOPICS
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {analysis.topics
                                  .filter(
                                    (topic) => topic && topic.trim() !== "",
                                  )
                                  .map((topic, index) => (
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
                          analysis.keywords.length > 0 &&
                          analysis.keywords.some(
                            (keyword) => keyword && keyword.trim() !== "",
                          ) && (
                            <div>
                              <h4 className="font-medium text-sm text-gray-500 mb-1">
                                KEY TERMS
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {analysis.keywords
                                  .filter(
                                    (keyword) =>
                                      keyword && keyword.trim() !== "",
                                  )
                                  .map((keyword, index) => (
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
                                  // Handle both "7.8" and "7.8/10" formats
                                  if (
                                    typeof analysis.final_score === "string" &&
                                    analysis.final_score.includes("/")
                                  ) {
                                    const parts =
                                      analysis.final_score.split("/");
                                    score = parseFloat(parts[0]) || 0;
                                    maxScore = parseFloat(parts[1]) || 10;
                                  } else {
                                    score =
                                      parseFloat(
                                        analysis.final_score.toString(),
                                      ) || 0;
                                    maxScore = 10;
                                  }
                                } else if (analysis.sentiment?.score) {
                                  score = analysis.sentiment.score;
                                  maxScore = 10;
                                } else {
                                  score = 0;
                                  maxScore = 10;
                                }

                                // Calculate percentage width
                                const percentage = (score / maxScore) * 100;

                                // Determine color based on score
                                let color = "bg-red-500";
                                if (score >= 8) color = "bg-green-500";
                                else if (score >= 6) color = "bg-yellow-500";
                                else if (score >= 4) color = "bg-orange-500";

                                return (
                                  <div
                                    className={`absolute top-0 left-0 h-full ${color}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                );
                              })()}
                            </div>
                            <span className="text-xl font-bold">
                              {(() => {
                                if (analysis.final_score) {
                                  const scoreStr =
                                    analysis.final_score.toString();
                                  return scoreStr.includes("/")
                                    ? scoreStr
                                    : `${scoreStr}/10`;
                                } else if (analysis.sentiment?.score) {
                                  return `${analysis.sentiment.score.toFixed(1)}/10`;
                                } else {
                                  return "N/A";
                                }
                              })()}
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
