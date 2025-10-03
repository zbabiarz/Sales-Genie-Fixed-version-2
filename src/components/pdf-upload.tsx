"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message?: string;
}

interface InsurancePlan {
  company_name: string;
  product_name: string;
  product_category: string;
  product_price: number;
  product_benefits: string;
  disqualifying_health_conditions: string[];
  disqualifying_medications: string[];
  available_states: string[];
  age_range: string | null;
  coverage_type: string | null;
  build_chart_jsonb: any[];
  gender: string | null;
  is_popular: boolean;
  height_feet_min: number | null;
  height_feet_max: number | null;
  height_inches_min: number | null;
  height_inches_max: number | null;
}

export function PDFUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
  });
  const [extractedPlans, setExtractedPlans] = useState<InsurancePlan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    field: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setUploadStatus({ status: "idle" });
      return;
    }

    if (file.type !== "application/pdf") {
      setUploadStatus({
        status: "error",
        message: "Please select a valid PDF file.",
      });
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      setUploadStatus({
        status: "error",
        message: `File too large. Max size is 25MB, your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`,
      });
      return;
    }

    setSelectedFile(file);
    setUploadStatus({ status: "idle" });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        status: "error",
        message: "Please select a PDF file first.",
      });
      return;
    }

    try {
      setUploadStatus({
        status: "uploading",
        message: "Uploading PDF file...",
      });

      const { createClient } = await import("../../supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Authentication required. Please sign in.");
      }

      const formData = new FormData();
      formData.append("pdf", selectedFile);

      setUploadStatus({
        status: "processing",
        message: "Processing PDF with AI...",
      });

      const { data, error } = await supabase.functions.invoke(
        "supabase-functions-process-pdf",
        {
          body: formData,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (error) {
        throw new Error(error.message || "Failed to process PDF");
      }

      if (!data.success || !data.extractedPlans) {
        throw new Error("Invalid response from PDF processor");
      }

      console.log("Extracted plans from backend:", data.extractedPlans.length);
      setExtractedPlans(data.extractedPlans);
      setShowModal(true);
      setUploadStatus({
        status: "success",
        message: `Extracted ${data.extractedPlans.length} insurance plans. Review and save.`,
      });
      setSelectedFile(null);
      const fileInput = document.getElementById(
        "pdf-input",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);

      let userFriendlyMessage = "Failed to process PDF. Please try again.";

      // Handle different types of errors with user-friendly messages
      if (error.message) {
        const errorMsg = error.message.toLowerCase();

        if (errorMsg.includes("edge function returned a non-2xx status code")) {
          userFriendlyMessage =
            "The PDF processing service is currently unavailable. Please try again in a few minutes.";
        } else if (
          errorMsg.includes("unexpected token") ||
          errorMsg.includes("not valid json")
        ) {
          userFriendlyMessage =
            "There was an issue processing your PDF. The file may be corrupted or in an unsupported format.";
        } else if (
          errorMsg.includes("network") ||
          errorMsg.includes("fetch failed")
        ) {
          userFriendlyMessage =
            "Network connection issue. Please check your internet connection and try again.";
        } else if (errorMsg.includes("timeout")) {
          userFriendlyMessage =
            "The PDF processing is taking longer than expected. Please try with a smaller file.";
        } else if (
          errorMsg.includes("file too large") ||
          errorMsg.includes("413")
        ) {
          userFriendlyMessage =
            "Your PDF file is too large. Please upload a file smaller than 25MB.";
        } else if (
          errorMsg.includes("authentication") ||
          errorMsg.includes("401")
        ) {
          userFriendlyMessage =
            "Please sign in to upload and process PDF files.";
        } else if (
          errorMsg.includes("permission") ||
          errorMsg.includes("403")
        ) {
          userFriendlyMessage =
            "You don't have permission to upload PDF files. Please contact your administrator.";
        } else if (
          errorMsg.includes("invalid pdf") ||
          errorMsg.includes("not a pdf")
        ) {
          userFriendlyMessage =
            "Please select a valid PDF file. Only PDF files are supported.";
        } else if (
          errorMsg.includes("openai") ||
          errorMsg.includes("ai service")
        ) {
          userFriendlyMessage =
            "Our AI processing service is temporarily unavailable. Please try again in a few minutes.";
        } else {
          // If it's a user-friendly message from the backend, use it directly
          userFriendlyMessage = "Something went wrong. Try again later";
        }
      }

      setUploadStatus({
        status: "error",
        message: userFriendlyMessage,
      });
    }
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const updatedPlans = [...extractedPlans];
    if (
      field === "disqualifying_health_conditions" ||
      field === "disqualifying_medications" ||
      field === "available_states"
    ) {
      updatedPlans[rowIndex][field] =
        typeof value === "string"
          ? value.split(",").map((s) => s.trim())
          : value;
    } else if (field === "build_chart_jsonb") {
      try {
        updatedPlans[rowIndex][field] =
          typeof value === "string" && value.trim() ? JSON.parse(value) : [];
      } catch {
        updatedPlans[rowIndex][field] = [];
      }
    } else if (
      field === "product_price" ||
      field === "height_feet_min" ||
      field === "height_feet_max" ||
      field === "height_inches_min" ||
      field === "height_inches_max"
    ) {
      updatedPlans[rowIndex][field] =
        value === "" || value === null ? null : Number(value) || 0;
    } else if (field === "is_popular") {
      updatedPlans[rowIndex][field] = value === "true" || value === true;
    } else {
      updatedPlans[rowIndex][field] = value === "" ? null : value;
    }
    setExtractedPlans(updatedPlans);
  };

  const handleSavePlans = async () => {
    setIsSaving(true);
    try {
      const { createClient } = await import("../../supabase/client");
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Authentication required.");

      const response = await fetch("/api/save-insurance-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plans: extractedPlans }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save plans");
      }

      setShowModal(false);
      setExtractedPlans([]);
      setUploadStatus({
        status: "success",
        message:
          result.message || `Successfully saved ${result.plansAdded} plans`,
      });
    } catch (error: any) {
      setUploadStatus({
        status: "error",
        message: error.message || "Failed to save plans",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setExtractedPlans([]);
    setEditingCell(null);
    setUploadStatus({ status: "idle" });
  };

  const getStatusIcon = () => {
    switch (uploadStatus.status) {
      case "uploading":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus.status) {
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      case "uploading":
      case "processing":
        return "border-blue-200 bg-blue-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const renderEditableCell = (
    plan: InsurancePlan,
    field: keyof InsurancePlan,
    rowIndex: number,
  ) => {
    const isEditing =
      editingCell?.rowIndex === rowIndex && editingCell?.field === field;
    const value = plan[field];

    let displayValue = value;
    if (Array.isArray(value)) {
      displayValue = value.join(", ");
    } else if (typeof value === "object" && value !== null) {
      displayValue = JSON.stringify(value);
    } else if (value === null || value === undefined) {
      displayValue = "";
    } else if (typeof value === "boolean") {
      displayValue = value.toString();
    }

    if (isEditing) {
      return (
        <Input
          defaultValue={displayValue?.toString() || ""}
          onBlur={(e) => {
            handleCellEdit(rowIndex, field, e.target.value);
            setEditingCell(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleCellEdit(rowIndex, field, e.currentTarget.value);
              setEditingCell(null);
            }
            if (e.key === "Escape") {
              setEditingCell(null);
            }
          }}
          autoFocus
          className="h-8 text-xs"
        />
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[24px] flex items-center"
        onClick={() => setEditingCell({ rowIndex, field })}
      >
        <span className="text-xs truncate">
          {displayValue?.toString() || "-"}
        </span>
        <Edit className="h-3 w-3 ml-1 opacity-50" />
      </div>
    );
  };

  return (
    <div className="w-full bg-white space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <h3 className="font-semibold text-teal-800 mb-2">
            PDF Insurance Plan Extractor
          </h3>
          <p className="text-teal-700 text-sm">
            Upload a PDF of insurance plan information. It will be processed
            with OpenAI and you can review the data before saving.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Upload PDF File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                id="pdf-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={["uploading", "processing"].includes(
                  uploadStatus.status,
                )}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={["uploading", "processing"].includes(
                  uploadStatus.status,
                )}
                className="min-w-[140px]"
              >
                {uploadStatus.status === "uploading" ||
                uploadStatus.status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {uploadStatus.status === "uploading"
                      ? "Uploading..."
                      : "Processing..."}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Upload & Process
                  </>
                )}
              </Button>
            </div>

            {uploadStatus.message && (
              <Alert className={getStatusColor()}>
                <div className="flex items-center gap-2">
                  {getStatusIcon()}
                  <AlertDescription className="flex-1">
                    {uploadStatus.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Review Extracted Insurance Plans ({extractedPlans.length})
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Company</TableHead>
                  <TableHead className="w-48">Product Name</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-24">Price</TableHead>
                  <TableHead className="w-32">Age Range</TableHead>
                  <TableHead className="w-32">Coverage Type</TableHead>
                  <TableHead className="w-48">Benefits</TableHead>
                  <TableHead className="w-32">States</TableHead>
                  <TableHead className="w-48">Health Conditions</TableHead>
                  <TableHead className="w-32">Medications</TableHead>
                  <TableHead className="w-24">Gender</TableHead>
                  <TableHead className="w-24">Popular</TableHead>
                  <TableHead className="w-32">Height Min (ft)</TableHead>
                  <TableHead className="w-32">Height Max (ft)</TableHead>
                  <TableHead className="w-32">Height Min (in)</TableHead>
                  <TableHead className="w-32">Height Max (in)</TableHead>
                  <TableHead className="w-48">Build Chart</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractedPlans.map((plan, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {renderEditableCell(plan, "company_name", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "product_name", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "product_category", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "product_price", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "age_range", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "coverage_type", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "product_benefits", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "available_states", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        plan,
                        "disqualifying_health_conditions",
                        index,
                      )}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(
                        plan,
                        "disqualifying_medications",
                        index,
                      )}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "gender", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "is_popular", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "height_feet_min", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "height_feet_max", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "height_inches_min", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "height_inches_max", index)}
                    </TableCell>
                    <TableCell>
                      {renderEditableCell(plan, "build_chart_jsonb", index)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSavePlans}
              disabled={isSaving || extractedPlans.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save {extractedPlans.length} Plans
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
