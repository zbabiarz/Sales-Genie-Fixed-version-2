"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Eye, FileText, Plus, Trash2, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  state: string;
  zip_code: string;
  health_conditions: string[];
  medications: string[];
  created_at: string;
}

interface InsurancePlan {
  id: string;
  company_name: string;
  product_name: string;
  product_category: string;
  product_price: number | null;
}

interface ClientListProps {
  onSelectClient: (clientId: string) => void;
  onDeleteClient?: (clientId: string) => void;
}

interface PlanSelectionState {
  isSelecting: boolean;
  clientId: string | null;
  availablePlans: InsurancePlan[];
  selectedPlanIds: string[];
  isLoading: boolean;
}

export function ClientList({
  onSelectClient,
  onDeleteClient,
}: ClientListProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openPlanDropdown, setOpenPlanDropdown] = useState<string | null>(null);
  const [clientPlans, setClientPlans] = useState<{
    [clientId: string]: InsurancePlan[];
  }>({});
  const [loadingPlans, setLoadingPlans] = useState<{
    [clientId: string]: boolean;
  }>({});
  const [planSelection, setPlanSelection] = useState<PlanSelectionState>({
    isSelecting: false,
    clientId: null,
    availablePlans: [],
    selectedPlanIds: [],
    isLoading: false,
  });
  const supabase = createClient();

  const fetchClients = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    // Listen for plan selection events
    const handlePlanSelected = (event: CustomEvent) => {
      console.log("Client list received plan-selected event:", event.detail);
      if (event.detail.clientId) {
        // Refresh the client plans for this client
        fetchClientPlans(event.detail.clientId);
      }
    };

    window.addEventListener(
      "plan-selected",
      handlePlanSelected as EventListener,
    );

    return () => {
      window.removeEventListener(
        "plan-selected",
        handlePlanSelected as EventListener,
      );
    };
  }, []);

  const filteredClients = clients.filter((client) =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDeleteClient = async (clientId: string) => {
    if (confirm("Are you sure you want to delete this client?")) {
      setIsDeleting(clientId);
      try {
        // First delete any dependents associated with this client
        const { error: dependentsError } = await supabase
          .from("dependents")
          .delete()
          .eq("client_id", clientId);

        if (dependentsError) {
          console.error("Error deleting dependents:", dependentsError);
        }

        // Then delete the client from the database
        const { error } = await supabase
          .from("clients")
          .delete()
          .eq("id", clientId);

        if (error) throw error;

        // Update the local state
        setClients(clients.filter((client) => client.id !== clientId));

        // Call the parent component's onDeleteClient if provided
        if (onDeleteClient) {
          onDeleteClient(clientId);
        }
      } catch (error) {
        console.error("Error deleting client:", error);
        alert("Failed to delete client. Please try again.");
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const calculateAge = (birthDateString: string) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const fetchClientPlans = async (clientId: string) => {
    console.log("Fetching plans for client:", clientId);
    setLoadingPlans((prev) => ({ ...prev, [clientId]: true }));
    try {
      const { data, error } = await supabase
        .from("client_selected_plans")
        .select(
          `
          insurance_plan_id,
          insurance_plans(id, company_name, product_name, product_category, product_price)
        `,
        )
        .eq("client_id", clientId);

      console.log("Client plans query result:", data, error);

      if (error) throw error;

      // Extract the insurance plans data correctly
      const plans = [];
      if (data && data.length > 0) {
        for (const item of data) {
          if (item.insurance_plans) {
            plans.push(item.insurance_plans);
          }
        }
      }
      console.log("Extracted plans:", plans);
      setClientPlans((prev) => ({ ...prev, [clientId]: plans }));
    } catch (error) {
      console.error("Error fetching client plans:", error);
      setClientPlans((prev) => ({ ...prev, [clientId]: [] }));
    } finally {
      setLoadingPlans((prev) => ({ ...prev, [clientId]: false }));
    }
  };

  const openPlanSelectionModal = async (clientId: string) => {
    setPlanSelection({
      isSelecting: true,
      clientId,
      availablePlans: [],
      selectedPlanIds: [],
      isLoading: true,
    });

    try {
      // Fetch all available insurance plans
      const { data: plansData, error: plansError } = await supabase
        .from("insurance_plans")
        .select("*")
        .order("company_name", { ascending: true });

      if (plansError) throw plansError;

      // Fetch currently selected plans for this client
      const { data: selectedData, error: selectedError } = await supabase
        .from("client_selected_plans")
        .select("insurance_plan_id")
        .eq("client_id", clientId);

      if (selectedError) throw selectedError;

      const selectedIds = selectedData.map((item) => item.insurance_plan_id);

      setPlanSelection((prev) => ({
        ...prev,
        availablePlans: plansData || [],
        selectedPlanIds: selectedIds,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading plans for selection:", error);
      setPlanSelection((prev) => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to load insurance plans. Please try again.",
        variant: "destructive",
      });
    }
  };

  const togglePlanSelection = (planId: string) => {
    setPlanSelection((prev) => {
      const isSelected = prev.selectedPlanIds.includes(planId);
      return {
        ...prev,
        selectedPlanIds: isSelected
          ? prev.selectedPlanIds.filter((id) => id !== planId)
          : [...prev.selectedPlanIds, planId],
      };
    });
  };

  const savePlanSelections = async () => {
    if (!planSelection.clientId) return;

    setPlanSelection((prev) => ({ ...prev, isLoading: true }));

    try {
      // First, delete all existing selections for this client
      const { error: deleteError } = await supabase
        .from("client_selected_plans")
        .delete()
        .eq("client_id", planSelection.clientId);

      if (deleteError) throw deleteError;

      // Then insert the new selections
      if (planSelection.selectedPlanIds.length > 0) {
        const insertData = planSelection.selectedPlanIds.map((planId) => ({
          client_id: planSelection.clientId,
          insurance_plan_id: planId,
        }));

        const { error: insertError } = await supabase
          .from("client_selected_plans")
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Refresh the client plans display
      if (planSelection.clientId) {
        fetchClientPlans(planSelection.clientId);
      }

      // Close the selection modal
      setPlanSelection({
        isSelecting: false,
        clientId: null,
        availablePlans: [],
        selectedPlanIds: [],
        isLoading: false,
      });

      toast({
        title: "Success",
        description: "Insurance plans updated successfully.",
      });
    } catch (error) {
      console.error("Error saving plan selections:", error);
      setPlanSelection((prev) => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to update insurance plans. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Plus className="mr-2 h-4 w-4" /> New Client
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">
            Loading clients...
          </p>
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Health Conditions</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">
                    {client.full_name}
                  </TableCell>
                  <TableCell>{calculateAge(client.date_of_birth)}</TableCell>
                  <TableCell>
                    {client.state}, {client.zip_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {client.health_conditions &&
                      client.health_conditions.length > 0 ? (
                        client.health_conditions
                          .slice(0, 2)
                          .map((condition, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="bg-muted/50"
                            >
                              {condition}
                            </Badge>
                          ))
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          None
                        </span>
                      )}
                      {client.health_conditions &&
                        client.health_conditions.length > 2 && (
                          <Badge variant="outline" className="bg-muted/50">
                            +{client.health_conditions.length - 2} more
                          </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <DropdownMenu
                        open={openPlanDropdown === client.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setOpenPlanDropdown(client.id);
                            fetchClientPlans(client.id);
                          } else {
                            setOpenPlanDropdown(null);
                          }
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Selected Plans</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {loadingPlans[client.id] ? (
                            <div className="flex items-center justify-center py-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                            </div>
                          ) : clientPlans[client.id]?.length ? (
                            clientPlans[client.id].map((plan) => (
                              <DropdownMenuItem
                                key={plan.id}
                                className="cursor-default"
                              >
                                <div className="flex flex-col w-full">
                                  <span className="font-medium">
                                    {plan.company_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {plan.product_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground mt-1">
                                    ${plan.product_price?.toFixed(2) || "0.00"}{" "}
                                    - {plan.product_category}
                                  </span>
                                </div>
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <DropdownMenuItem className="cursor-default text-muted-foreground">
                              No plans selected for this client
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onSelectClient(client.id)}
                            className="cursor-pointer"
                          >
                            View client details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClient(client.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={isDeleting === client.id}
                      >
                        {isDeleting === client.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No clients found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {searchTerm
                ? "No clients match your search criteria. Try a different search term."
                : "You haven't added any clients yet. Add a client to get started."}
            </p>
            {!searchTerm && (
              <Button className="mt-4 bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" /> Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
