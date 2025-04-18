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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Activity,
  Pill,
  FileText,
} from "lucide-react";
import { Tables } from "@/types/supabase";

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
}

type Client = Tables<"clients">;
type Dependent = Tables<"dependents">;

interface SelectedPlan {
  id: string;
  client_id: string;
  insurance_plan_id: string;
  created_at: string;
  updated_at: string;
  insurance_plan?: {
    id: string;
    company_name: string;
    product_name: string;
    product_category: string;
    product_price: number;
    product_benefits: string | null;
  };
}

export function ClientDetail({ clientId, onBack }: ClientDetailProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchClientDetails = async () => {
    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch dependents
      const { data: dependentsData, error: dependentsError } = await supabase
        .from("dependents")
        .select("*")
        .eq("client_id", clientId);

      if (dependentsError) throw dependentsError;
      setDependents(dependentsData || []);

      // Fetch selected plans with insurance plan details
      const { data: plansData, error: plansError } = await supabase
        .from("client_selected_plans")
        .select(
          `
          *,
          insurance_plan:insurance_plans(*)
        `,
        )
        .eq("client_id", clientId);

      console.log("Fetching plans for client ID:", clientId);
      console.log("Plans query result:", plansData, plansError);

      if (plansError) throw plansError;
      console.log("Fetched selected plans:", plansData);
      setSelectedPlans(plansData || []);
    } catch (error) {
      console.error("Error fetching client details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();

    // Listen for plan selection events
    const handlePlanSelected = (event: CustomEvent) => {
      console.log("Received plan-selected event:", event.detail);
      if (event.detail.clientId === clientId) {
        console.log("Client ID matches, refreshing data");
        fetchClientDetails(); // Refresh data when a plan is selected
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
  }, [clientId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
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

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">
          Loading client details...
        </p>
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-semibold">Client not found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The client you're looking for doesn't exist or has been removed.
          </p>
          <Button className="mt-4" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Clients
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold">{client.full_name}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Age
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateAge(client.date_of_birth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              <Calendar className="inline h-3 w-3 mr-1" />
              Born {formatDate(client.date_of_birth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{client.state}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <MapPin className="inline h-3 w-3 mr-1" />
              {client.zip_code}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dependents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dependents.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <User className="inline h-3 w-3 mr-1" />
              {dependents.length === 0
                ? "No dependents"
                : dependents.length === 1
                  ? "1 dependent"
                  : `${dependents.length} dependents`}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health">Health Profile</TabsTrigger>
          <TabsTrigger value="dependents">Dependents</TabsTrigger>
          <TabsTrigger value="plans">
            Insurance Plans{" "}
            {selectedPlans.length > 0 && `(${selectedPlans.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Conditions</CardTitle>
              <CardDescription>
                Medical conditions that may affect insurance eligibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.health_conditions &&
              client.health_conditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.health_conditions.map((condition, index) => (
                    <Badge
                      key={index}
                      className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                    >
                      {condition}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No health conditions reported
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
              <CardDescription>
                Current medications that may affect insurance eligibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.medications && client.medications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {client.medications.map((medication, index) => (
                    <Badge
                      key={index}
                      className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      <Pill className="h-3 w-3 mr-1" />
                      {medication}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No medications reported</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependents" className="space-y-4 mt-4">
          {dependents.length > 0 ? (
            dependents.map((dependent) => (
              <Card key={dependent.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{dependent.full_name}</CardTitle>
                      <CardDescription>
                        {dependent.relationship.charAt(0).toUpperCase() +
                          dependent.relationship.slice(1)}{" "}
                        •{calculateAge(dependent.date_of_birth)} years old •
                        {dependent.gender.charAt(0).toUpperCase() +
                          dependent.gender.slice(1)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        Health Conditions
                      </h4>
                      {dependent.health_conditions &&
                      dependent.health_conditions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {dependent.health_conditions.map(
                            (condition, index) => (
                              <Badge
                                key={index}
                                className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                              >
                                {condition}
                              </Badge>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No health conditions reported
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Medications</h4>
                      {dependent.medications &&
                      dependent.medications.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {dependent.medications.map((medication, index) => (
                            <Badge
                              key={index}
                              className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                            >
                              <Pill className="h-3 w-3 mr-1" />
                              {medication}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No medications reported
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No dependents</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This client doesn't have any dependents added to their
                  profile.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4 mt-4">
          {selectedPlans.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Selected Insurance Plans
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-teal-600 border-teal-600 hover:bg-teal-50"
                  onClick={() =>
                    window.open(
                      `/dashboard?tab=intake&clientId=${clientId}`,
                      "_blank",
                    )
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Add More Plans
                </Button>
              </div>

              {selectedPlans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden">
                  <div className="bg-teal-50 px-4 py-2 border-b">
                    <div className="flex justify-between items-center">
                      <div className="font-medium">
                        {plan.insurance_plan?.company_name}
                      </div>
                      <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-200">
                        {plan.insurance_plan?.product_category}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Product
                        </div>
                        <div className="font-medium">
                          {plan.insurance_plan?.product_name}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Monthly Premium
                        </div>
                        <div className="font-medium">
                          ${plan.insurance_plan?.product_price.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Annual Cost
                        </div>
                        <div className="font-medium">
                          $
                          {(plan.insurance_plan?.product_price * 12).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {plan.insurance_plan?.product_benefits && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Benefits</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.insurance_plan.product_benefits}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  No Insurance Plans Selected
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This client doesn't have any insurance plans selected yet.
                </p>
                <Button
                  className="mt-4 bg-teal-600 hover:bg-teal-700"
                  onClick={() =>
                    window.open(
                      `/dashboard?tab=intake&clientId=${clientId}`,
                      "_blank",
                    )
                  }
                >
                  Find Matching Plans
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
