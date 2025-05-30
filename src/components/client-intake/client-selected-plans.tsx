"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface InsurancePlan {
  id: string;
  company_name: string;
  product_name: string;
  product_category: string;
  product_price: number | null;
  eligibility_status?: string;
}

interface ClientSelectedPlansProps {
  clientId: string | null;
  plans: InsurancePlan[];
  onSavePlans?: (selectedPlanIds: string[]) => void;
}

export function ClientSelectedPlans({
  clientId,
  plans,
  onSavePlans,
}: ClientSelectedPlansProps) {
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Load any previously selected plans for this client
    const loadSelectedPlans = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from("client_selected_plans")
          .select("insurance_plan_id")
          .eq("client_id", clientId);

        if (error) throw error;

        if (data && data.length > 0) {
          const planIds = data.map((item) => item.insurance_plan_id);
          setSelectedPlanIds(planIds);
        }
      } catch (error) {
        console.error("Error loading selected plans:", error);
      }
    };

    loadSelectedPlans();
  }, [clientId]);

  const togglePlanSelection = (planId: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId],
    );
  };

  const handleSavePlans = async () => {
    if (!clientId) return;

    setIsSaving(true);
    try {
      // First delete any existing selections
      const { error: deleteError } = await supabase
        .from("client_selected_plans")
        .delete()
        .eq("client_id", clientId);

      if (deleteError) throw deleteError;

      // Then insert the new selections
      if (selectedPlanIds.length > 0) {
        const insertData = selectedPlanIds.map((planId) => ({
          client_id: clientId,
          insurance_plan_id: planId,
        }));

        const { error: insertError } = await supabase
          .from("client_selected_plans")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Notify parent component if callback provided
      if (onSavePlans) {
        onSavePlans(selectedPlanIds);
      }

      // Dispatch a custom event that other components can listen for
      const event = new CustomEvent("plan-selected", {
        detail: { clientId, selectedPlanIds },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error saving selected plans:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select Plans for Client</h3>
        <Button
          onClick={handleSavePlans}
          disabled={isSaving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {isSaving ? "Saving..." : "Save Selected Plans"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Select</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePlanSelection(plan.id)}
                    className={
                      selectedPlanIds.includes(plan.id) ? "text-green-600" : ""
                    }
                  >
                    {selectedPlanIds.includes(plan.id) ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border border-gray-300" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>{plan.company_name}</TableCell>
                <TableCell>{plan.product_name}</TableCell>
                <TableCell>{plan.product_category}</TableCell>
                <TableCell>
                  {plan.product_price
                    ? `$${plan.product_price.toFixed(2)}`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`${plan.eligibility_status === "eligible" ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}`}
                  >
                    {plan.eligibility_status || "Unknown"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {plans.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No plans available for selection
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
