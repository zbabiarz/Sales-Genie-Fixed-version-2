"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, FileText } from "lucide-react";

type SavedCall = {
  id: string;
  created_at: string;
  file_name: string;
  status: string;
  analysis_results: any;
  transcript?: string;
};

// Helper function to format transcript with speaker separation
const formatTranscript = (
  transcriptText: string | undefined,
): React.ReactNode => {
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
  const hasExistingSpeakers = /([A-Za-z\s]+:|\[[^\]]+\]:)/.test(transcriptText);

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

export function SavedCallResults() {
  const [savedCalls, setSavedCalls] = useState<SavedCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<SavedCall | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSavedCalls();
  }, []);

  const fetchSavedCalls = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data, error } = await supabase
          .from("call_recordings")
          .select("*")
          .eq("user_id", userData.user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching saved calls:", error);
        } else {
          setSavedCalls(data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching saved calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const handleSelectCall = (call: SavedCall) => {
    setSelectedCall(call);
  };

  const handleDeleteCall = async (callId: string) => {
    if (confirm("Are you sure you want to delete this call analysis?")) {
      setIsDeleting(callId);
      try {
        const { error } = await supabase
          .from("call_recordings")
          .delete()
          .eq("id", callId);

        if (error) {
          console.error("Error deleting call:", error);
          alert("Failed to delete call analysis. Please try again.");
        } else {
          // Remove the call from the local state
          setSavedCalls(savedCalls.filter((call) => call.id !== callId));

          // If the deleted call was selected, clear the selection
          if (selectedCall?.id === callId) {
            setSelectedCall(null);
          }
        }
      } catch (error) {
        console.error("Error deleting call:", error);
        alert("An unexpected error occurred while deleting the call analysis.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2">Loading saved calls...</span>
      </div>
    );
  }

  if (savedCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium mb-2">No saved call analyses yet</h3>
        <p className="text-muted-foreground mb-4">
          When you save an analysis, it will appear here for future reference.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-4">
        <h3 className="text-lg font-medium">Saved Analyses</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {savedCalls.map((call) => (
            <Card
              key={call.id}
              className={`cursor-pointer transition-colors ${selectedCall?.id === call.id ? "border-teal-600 bg-teal-50" : ""}`}
              onClick={() => handleSelectCall(call)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium truncate">{call.file_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(call.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCall(call.id);
                    }}
                    disabled={isDeleting === call.id}
                  >
                    {isDeleting === call.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        {selectedCall ? (
          <Card>
            <CardHeader>
              <CardTitle>Call Analysis Details</CardTitle>
              <CardDescription>
                Analysis for {selectedCall.file_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {selectedCall.analysis_results ? (
                  <div className="space-y-4">
                    {/* Display analysis results in a structured way */}
                    {selectedCall.analysis_results.agents_strengths && (
                      <div>
                        <h4 className="font-medium mb-2">Strengths</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedCall.analysis_results.agents_strengths.map(
                            (strength: string, i: number) => (
                              <li key={i} className="text-sm">
                                {strength}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {selectedCall.analysis_results.areas_for_improvement && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Areas for Improvement
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedCall.analysis_results.areas_for_improvement.map(
                            (area: string, i: number) => (
                              <li key={i} className="text-sm">
                                {area}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {selectedCall.analysis_results.missed_opportunities && (
                      <div>
                        <h4 className="font-medium mb-2">
                          Missed Opportunities
                        </h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedCall.analysis_results.missed_opportunities.map(
                            (opportunity: string, i: number) => (
                              <li key={i} className="text-sm">
                                {opportunity}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {selectedCall.analysis_results
                      .actionable_recommendations && (
                      <div>
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <ul className="list-disc pl-5 space-y-1">
                          {selectedCall.analysis_results.actionable_recommendations.map(
                            (rec: string, i: number) => (
                              <li key={i} className="text-sm">
                                {rec}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {selectedCall.analysis_results.final_score && (
                      <div>
                        <h4 className="font-medium mb-2">Score</h4>
                        <p className="text-lg font-bold">
                          {selectedCall.analysis_results.final_score}
                        </p>
                      </div>
                    )}

                    {selectedCall.transcript && (
                      <div>
                        <h4 className="font-medium mb-2">Transcript</h4>
                        <div className="bg-muted p-4 rounded-md text-sm overflow-y-auto whitespace-pre-wrap resize-y min-h-[100px] h-[20vh] cursor-ns-resize">
                          {formatTranscript(selectedCall.transcript)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No analysis data available for this call.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Select a saved call analysis from the list to view details.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
