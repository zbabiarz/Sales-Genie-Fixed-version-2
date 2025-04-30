"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "../../../supabase/client";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";
import { DependentForm } from "./dependent-form";
import { InsurancePlansTable } from "./insurance-plans-table";
import { useSearchParams } from "next/navigation";

interface Dependent {
  id: string;
  relationship: string;
  full_name: string;
  gender: string;
  date_of_birth: string;
  height?: string;
  weight?: string;
  health_conditions: string[];
  medications: string[];
  custom_health_conditions: string[];
  custom_medications: string[];
  _calculatedDob?: string;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export function ClientForm() {
  const searchParams = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState("client-info");
  const [healthConditions, setHealthConditions] = useState<
    { id: string; name: string }[]
  >([]);
  const [medications, setMedications] = useState<
    { id: string; name: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [matchingPlans, setMatchingPlans] = useState<any[]>([]);
  const [useAgeInput, setUseAgeInput] = useState(false);

  const [clientData, setClientData] = useState({
    full_name: "",
    gender: "",
    date_of_birth: "",
    _calculatedDob: "",
    state: "",
    height: "",
    height_feet: "",
    height_inches: "",
    weight: "",
    health_conditions: [] as string[],
    medications: [] as string[],
    custom_health_conditions: [] as string[],
    custom_medications: [] as string[],
  });

  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    async function fetchReferenceData() {
      try {
        const { data: conditionsData } = await supabase
          .from("health_conditions")
          .select("id, name");

        const { data: medicationsData } = await supabase
          .from("medications")
          .select("id, name");

        if (conditionsData) setHealthConditions(conditionsData);
        if (medicationsData) setMedications(medicationsData);
      } catch (error) {
        console.error("Error fetching reference data:", error);
      }
    }

    fetchReferenceData();
  }, []);

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientData({ ...clientData, [name]: value });
  };

  const handleStateChange = (value: string) => {
    setClientData({ ...clientData, state: value });
  };

  const handleHealthConditionToggle = (condition: string) => {
    setClientData((prev) => {
      const updatedConditions = prev.health_conditions.includes(condition)
        ? prev.health_conditions.filter((c) => c !== condition)
        : [...prev.health_conditions, condition];

      return { ...prev, health_conditions: updatedConditions };
    });
  };

  const handleMedicationToggle = (medication: string) => {
    setClientData((prev) => {
      const updatedMedications = prev.medications.includes(medication)
        ? prev.medications.filter((m) => m !== medication)
        : [...prev.medications, medication];

      return { ...prev, medications: updatedMedications };
    });
  };

  const handleCustomHealthCondition = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      const condition = e.currentTarget.value.trim();
      if (
        condition &&
        !clientData.custom_health_conditions.includes(condition)
      ) {
        setClientData((prev) => ({
          ...prev,
          custom_health_conditions: [
            ...prev.custom_health_conditions,
            condition,
          ],
        }));
        e.currentTarget.value = "";
      }
    }
  };

  const handleCustomMedication = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      const medication = e.currentTarget.value.trim();
      if (medication && !clientData.custom_medications.includes(medication)) {
        setClientData((prev) => ({
          ...prev,
          custom_medications: [...prev.custom_medications, medication],
        }));
        e.currentTarget.value = "";
      }
    }
  };

  const removeCustomHealthCondition = (condition: string) => {
    setClientData((prev) => ({
      ...prev,
      custom_health_conditions: prev.custom_health_conditions.filter(
        (c) => c !== condition,
      ),
    }));
  };

  const removeCustomMedication = (medication: string) => {
    setClientData((prev) => ({
      ...prev,
      custom_medications: prev.custom_medications.filter(
        (m) => m !== medication,
      ),
    }));
  };

  const handleGenderChange = (value: string) => {
    setClientData({ ...clientData, gender: value });
  };

  const addDependent = () => {
    const newDependent: Dependent = {
      id: Date.now().toString(),
      relationship: "dependent",
      full_name: "",
      gender: "",
      date_of_birth: "",
      height: "",
      weight: "",
      health_conditions: [],
      medications: [],
      custom_health_conditions: [],
      custom_medications: [],
    };

    setDependents([...dependents, newDependent]);
  };

  const hasSpouse = dependents.some((dep) => dep.relationship === "spouse");

  const updateDependent = (id: string, data: Partial<Dependent>) => {
    setDependents((prev) =>
      prev.map((dep) => (dep.id === id ? { ...dep, ...data } : dep)),
    );
  };

  const removeDependent = (id: string) => {
    setDependents((prev) => prev.filter((dep) => dep.id !== id));
  };

  const calculateAge = (birthDateString: string) => {
    if (!birthDateString) return 0;

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

  const isAgeInRange = (clientAge: number, ageRange: string) => {
    if (!ageRange || ageRange === "All Ages") return true;

    if (ageRange.endsWith("+")) {
      const minAge = parseInt(ageRange.replace("+", ""));
      return clientAge >= minAge;
    } else if (ageRange.includes("-")) {
      const [minAge, maxAge] = ageRange.split("-").map(Number);
      return clientAge >= minAge && clientAge <= maxAge;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMatchingPlans([]);

    try {
      const { data: allPlans, error: plansError } = await supabase
        .from("insurance_plans")
        .select("*");

      if (plansError) throw plansError;

      console.log(
        `Fetched ${allPlans?.length || 0} insurance plans from database`,
      );

      if (allPlans && allPlans.length > 0) {
        const filteredPlans = allPlans.filter((plan) => {
          return true;
        });

        const plansWithStatus = filteredPlans.map((plan) => ({
          ...plan,
          eligibility_status: "eligible",
        }));

        setMatchingPlans(plansWithStatus);
      } else {
        console.log("No insurance plans found in database");
      }
    } catch (error) {
      console.error("Error fetching insurance plans:", error);
    }

    setShowResults(true);
    setActiveTab("results");

    let existingClient = false;
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;

      if (userId) {
        const { data: existingClients } = await supabase
          .from("clients")
          .select("id")
          .eq("user_id", userId)
          .eq("full_name", clientData.full_name);

        existingClient = existingClients && existingClients.length > 0;
      }
    } catch (error) {
      console.error("Error checking for existing client:", error);
    }

    try {
      const formattedData = {
        ...clientData,
        date_of_birth:
          clientData.date_of_birth || clientData._calculatedDob || "",
        gender: clientData.gender,
        height: clientData.height ? parseFloat(clientData.height) : undefined,
        height_feet: clientData.height_feet
          ? parseFloat(clientData.height_feet)
          : undefined,
        height_inches: clientData.height_inches
          ? parseFloat(clientData.height_inches)
          : undefined,
        weight: clientData.weight ? parseFloat(clientData.weight) : undefined,
        age: calculateAge(
          clientData.date_of_birth || clientData._calculatedDob || "",
        ),
        health_conditions: [
          ...clientData.health_conditions,
          ...clientData.custom_health_conditions,
        ],
        medications: [
          ...clientData.medications,
          ...clientData.custom_medications,
        ],
        coverage_type: dependents.length > 0 ? "family" : "individual",
        dependents: dependents.map((dep) => ({
          relationship: dep.relationship,
          full_name: dep.full_name,
          gender: dep.gender,
          date_of_birth: dep.date_of_birth || dep._calculatedDob || "",
          height: dep.height ? parseFloat(dep.height) : undefined,
          height_feet: dep.height_feet
            ? parseFloat(dep.height_feet)
            : undefined,
          height_inches: dep.height_inches
            ? parseFloat(dep.height_inches)
            : undefined,
          weight: dep.weight ? parseFloat(dep.weight) : undefined,
          health_conditions: [
            ...dep.health_conditions,
            ...dep.custom_health_conditions,
          ],
          medications: [...dep.medications, ...dep.custom_medications],
        })),
      };

      try {
        const { data, error } = await supabase.functions.invoke(
          "match-insurance-plans",
          {
            body: formattedData,
          },
        );

        if (error) throw error;

        const plansWithStatus = (data.matchingPlans || []).map((plan) => ({
          ...plan,
          eligibility_status: "eligible",
        }));

        setMatchingPlans(plansWithStatus);
      } catch (edgeFunctionError) {
        console.error("Edge function error:", edgeFunctionError);

        const { data: allPlans, error: plansError } = await supabase
          .from("insurance_plans")
          .select("*");

        if (plansError) throw plansError;

        console.log(`Total plans found: ${allPlans.length}`);
        const reservePlans = allPlans.filter((plan) =>
          plan.company_name.includes("Reserve National"),
        );
        console.log(`Reserve National plans found: ${reservePlans.length}`);
        if (reservePlans.length > 0) {
          console.log("Reserve National plan details:", reservePlans[0]);
        }

        const matchingPlans = allPlans.filter((plan) => {
          if (
            plan.available_states &&
            plan.available_states.length > 0 &&
            !plan.available_states.includes(clientData.state)
          ) {
            console.log(
              `State mismatch: Client state ${clientData.state} not in plan states ${JSON.stringify(plan.available_states)}`,
            );
            return false;
          }

          const coverageType = dependents.length > 0 ? "family" : "individual";
          if (
            coverageType === "individual" &&
            plan.coverage_type === "family"
          ) {
            console.log(`Filtering out family plan: ${plan.product_name}`);
            return false;
          } else if (
            coverageType === "family" &&
            plan.coverage_type === "individual"
          ) {
            console.log(
              `Filtering out individual-only plan for family: ${plan.product_name}`,
            );
            return false;
          }

          if (
            clientData.age &&
            plan.age_range &&
            plan.age_range !== "All Ages"
          ) {
            console.log(
              `Checking age eligibility: Client age ${clientData.age}, Plan age range ${plan.age_range}`,
            );
            if (!isAgeInRange(clientData.age, plan.age_range)) {
              console.log(
                `Age range mismatch: ${clientData.age} not in ${plan.age_range}`,
              );
              return false;
            }
          } else {
            console.log(
              `Age check passed or skipped: Client age ${clientData.age}, Plan age range ${plan.age_range}`,
            );
          }

          if (
            plan.disqualifying_health_conditions &&
            plan.disqualifying_health_conditions.length > 0
          ) {
            for (const condition of formattedData.health_conditions) {
              // Check for partial matches in disqualifying conditions
              const partialMatch = plan.disqualifying_health_conditions.some(
                (disqualifyingCondition) => {
                  // Case insensitive check
                  const clientConditionLower = condition.toLowerCase();
                  const disqualifyingConditionLower =
                    disqualifyingCondition.toLowerCase();

                  // Check if client condition is part of a disqualifying condition
                  // or if disqualifying condition contains the client condition
                  const isPartialMatch =
                    disqualifyingConditionLower.includes(
                      clientConditionLower,
                    ) ||
                    clientConditionLower.includes(
                      disqualifyingConditionLower,
                    ) ||
                    // Split by common separators and check each part
                    disqualifyingConditionLower
                      .split(/[\/,\-\s]+/)
                      .some(
                        (part) =>
                          part === clientConditionLower ||
                          (part.length > 3 &&
                            clientConditionLower.includes(part)),
                      );

                  console.log(
                    `Partial match check - Client: "${clientConditionLower}" vs Disqualifying: "${disqualifyingConditionLower}" - Match: ${isPartialMatch}`,
                  );

                  return isPartialMatch;
                },
              );

              if (partialMatch) {
                console.log(
                  `HEALTH CONDITIONS CHECK: FAILED - Client has disqualifying condition (partial match): ${condition}`,
                );
                return false;
              }
            }
          }

          if (
            plan.disqualifying_medications &&
            plan.disqualifying_medications.length > 0
          ) {
            for (const medication of formattedData.medications) {
              if (plan.disqualifying_medications.includes(medication)) {
                return false;
              }
            }
          }

          if (
            plan.build_chart_jsonb &&
            clientData.weight &&
            clientData.gender
          ) {
            console.log(
              `\n***** PLAN BUILD CHART CHECK: ${plan.company_name} - ${plan.product_name} *****`,
            );
            console.log(
              `Client weight: ${clientData.weight}, gender: ${clientData.gender}`,
            );

            let maxWeightInChart = 0;
            let minWeightInChart = Infinity;
            if (
              plan.build_chart_jsonb &&
              Array.isArray(plan.build_chart_jsonb)
            ) {
              plan.build_chart_jsonb.forEach((entry) => {
                if (entry.max_weight > maxWeightInChart) {
                  maxWeightInChart = entry.max_weight;
                }
                if (entry.min_weight < minWeightInChart) {
                  minWeightInChart = entry.min_weight;
                }
              });
            }
            console.log(
              `Build chart weight range: ${minWeightInChart} - ${maxWeightInChart} lbs`,
            );
            console.log(
              `Build chart entries: ${plan.build_chart_jsonb?.length || 0}`,
            );

            // Ensure weight and height values are properly parsed as numbers
            const weightNum = parseFloat(String(clientData.weight)) || 0;
            const heightFeet = parseFloat(String(clientData.height_feet)) || 0;
            const heightInches =
              parseFloat(String(clientData.height_inches)) || 0;
            const legacyHeight = clientData.height
              ? parseFloat(String(clientData.height))
              : undefined;

            console.log(
              `Parsed weight: ${weightNum} lbs (raw: ${clientData.weight}, type: ${typeof weightNum})`,
            );
            console.log(
              `Parsed height: ${heightFeet}ft ${heightInches}in (raw feet: ${clientData.height_feet}, raw inches: ${clientData.height_inches})`,
            );
            console.log(
              `Legacy height: ${legacyHeight !== undefined ? legacyHeight + " inches" : "not provided"}`,
            );

            // Perform a quick check against the maximum weight in the chart
            // If weight exceeds the maximum in the chart, we can immediately determine ineligibility
            if (weightNum > maxWeightInChart) {
              console.log(
                `QUICK CHECK FAILED: Client weight ${weightNum} exceeds maximum chart weight ${maxWeightInChart}`,
              );
              console.log(`***** END PLAN BUILD CHART CHECK *****\n`);
              return false;
            }

            console.log(
              `Quick check - Client weight ${weightNum} vs chart range ${minWeightInChart}-${maxWeightInChart}`,
            );
            console.log(
              `Weight > Max check: ${weightNum} > ${maxWeightInChart} = ${weightNum > maxWeightInChart}`,
            );
            console.log(
              `Weight < Min check: ${weightNum} < ${minWeightInChart} = ${weightNum < minWeightInChart}`,
            );

            const isEligibleBuild = checkBuildEligibility(
              clientData.gender,
              weightNum,
              heightFeet,
              heightInches,
              legacyHeight,
              plan.build_chart_jsonb,
            );

            console.log(
              `Build eligibility result for ${plan.company_name} - ${plan.product_name}: ${isEligibleBuild}`,
            );

            if (!isEligibleBuild) {
              console.log(
                `BUILD CHART CHECK: FAILED - ${plan.company_name} - ${plan.product_name}: Client weight ${weightNum} outside range for height ${heightFeet}ft ${heightInches}in`,
              );
              console.log(`***** END PLAN BUILD CHART CHECK *****\n`);
              return false;
            }
            console.log(
              `BUILD CHART CHECK: PASSED - ${plan.company_name} - ${plan.product_name}`,
            );
            console.log(`***** END PLAN BUILD CHART CHECK *****\n`);
          }

          return true;
        });

        const plansWithStatus = matchingPlans.map((plan) => ({
          ...plan,
          eligibility_status: "eligible",
        }));

        setMatchingPlans(plansWithStatus);
      }

      try {
        const { data: user } = await supabase.auth.getUser();
        const userId = user.user?.id;

        let clientRecord = null;
        if (!existingClient && userId) {
          const { data: newClientRecord, error: clientError } = await supabase
            .from("clients")
            .insert({
              user_id: userId,
              full_name: clientData.full_name,
              gender: clientData.gender,
              date_of_birth:
                clientData.date_of_birth || clientData._calculatedDob || "",
              state: clientData.state,
              zip_code: "00000",
              height: clientData.height ? parseFloat(clientData.height) : null,
              height_feet: clientData.height_feet
                ? parseFloat(clientData.height_feet)
                : null,
              height_inches: clientData.height_inches
                ? parseFloat(clientData.height_inches)
                : null,
              weight: clientData.weight ? parseFloat(clientData.weight) : null,
              health_conditions: [
                ...clientData.health_conditions,
                ...clientData.custom_health_conditions,
              ],
              medications: [
                ...clientData.medications,
                ...clientData.custom_medications,
              ],
            })
            .select()
            .single();

          if (clientError) throw clientError;
          clientRecord = newClientRecord;
        }

        if (userId && clientRecord) {
          await supabase.from("user_activity").insert({
            user_id: userId,
            activity_type: "client_intake",
            details: { client_id: clientRecord?.id },
          });
        }

        if (dependents.length > 0 && clientRecord) {
          const dependentsToInsert = dependents.map((dep) => ({
            client_id: clientRecord.id,
            relationship: dep.relationship,
            full_name: dep.full_name,
            gender: dep.gender,
            date_of_birth: dep.date_of_birth || dep._calculatedDob || "",
            height: dep.height ? parseFloat(dep.height) : null,
            height_feet: dep.height_feet ? parseFloat(dep.height_feet) : null,
            height_inches: dep.height_inches
              ? parseFloat(dep.height_inches)
              : null,
            weight: dep.weight ? parseFloat(dep.weight) : null,
            health_conditions: [
              ...dep.health_conditions,
              ...dep.custom_health_conditions,
            ],
            medications: [...dep.medications, ...dep.custom_medications],
          }));

          const { error: dependentsError } = await supabase
            .from("dependents")
            .insert(dependentsToInsert);

          if (dependentsError) throw dependentsError;
        }

        if (existingClient) {
          console.log("Client already exists, skipped creating duplicate");
        }
      } catch (dbError) {
        console.error("Error saving client data:", dbError);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setClientData({
      full_name: "",
      gender: "",
      date_of_birth: "",
      _calculatedDob: "",
      state: "",
      height: "",
      height_feet: "",
      height_inches: "",
      weight: "",
      health_conditions: [],
      medications: [],
      custom_health_conditions: [],
      custom_medications: [],
    });
    setDependents([]);
    setShowResults(false);
    setActiveTab("client-info");
    setUseAgeInput(false);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client-info">Client Information</TabsTrigger>
          <TabsTrigger value="results" disabled={!showResults}>
            Matching Plans
          </TabsTrigger>
        </TabsList>

        <form onSubmit={handleSubmit}>
          <TabsContent value="client-info" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Primary Applicant</CardTitle>
                <CardDescription>
                  Enter the primary applicant's information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={clientData.full_name}
                      onChange={handleClientChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">
                      Gender <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={clientData.gender}
                      onValueChange={handleGenderChange}
                      required
                    >
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="date_of_birth">
                        Date of Birth / Age{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Label
                          htmlFor="use_age"
                          className="text-xs cursor-pointer"
                        >
                          Use Age
                        </Label>
                        <input
                          type="checkbox"
                          id="use_age"
                          className="h-4 w-4"
                          checked={useAgeInput}
                          onChange={() => setUseAgeInput(!useAgeInput)}
                        />
                      </div>
                    </div>
                    {!useAgeInput ? (
                      <Input
                        id="date_of_birth"
                        name="date_of_birth"
                        type="date"
                        value={clientData.date_of_birth}
                        onChange={handleClientChange}
                        required
                      />
                    ) : (
                      <Input
                        id="age"
                        name="age"
                        type="number"
                        placeholder="Enter age"
                        min="0"
                        max="120"
                        onChange={(e) => {
                          const age = parseInt(e.target.value);
                          if (!isNaN(age)) {
                            const today = new Date();
                            const birthYear = today.getFullYear() - age;
                            const dob = new Date(
                              birthYear,
                              today.getMonth(),
                              today.getDate(),
                            );
                            const dobString = dob.toISOString().split("T")[0];
                            setClientData((prev) => ({
                              ...prev,
                              date_of_birth: "",
                              _calculatedDob: dobString,
                            }));
                          }
                        }}
                        required
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={clientData.state}
                      onValueChange={handleStateChange}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b">
                          <Input
                            placeholder="Search states..."
                            className="mb-1"
                            onChange={(e) => {
                              const searchBox = e.target;
                              const searchTerm = searchBox.value.toLowerCase();
                              const stateItems =
                                searchBox
                                  .closest(".SelectContent")
                                  ?.querySelectorAll(".state-item") || [];

                              stateItems.forEach((item) => {
                                const stateText =
                                  item.textContent?.toLowerCase() || "";
                                if (stateText.includes(searchTerm)) {
                                  item.classList.remove("hidden");
                                } else {
                                  item.classList.add("hidden");
                                }
                              });
                            }}
                          />
                        </div>
                        {US_STATES.map((state) => (
                          <SelectItem
                            key={state.value}
                            value={state.value}
                            className="state-item"
                          >
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height_feet">
                      Height <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center">
                          <Input
                            id="height_feet"
                            name="height_feet"
                            type="number"
                            required
                            placeholder="Feet"
                            min="1"
                            max="8"
                            value={clientData.height_feet}
                            onChange={(e) => {
                              handleClientChange(e);
                              const feet = parseInt(e.target.value) || 0;
                              const inches =
                                parseInt(clientData.height_inches) || 0;
                              const totalInches = feet * 12 + inches;
                              setClientData((prev) => ({
                                ...prev,
                                height: totalInches.toString(),
                              }));
                            }}
                          />
                          <span className="ml-2">ft</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <Input
                            id="height_inches"
                            name="height_inches"
                            type="number"
                            required
                            placeholder="Inches"
                            min="0"
                            max="11"
                            value={clientData.height_inches}
                            onChange={(e) => {
                              handleClientChange(e);
                              const feet =
                                parseInt(clientData.height_feet) || 0;
                              const inches = parseInt(e.target.value) || 0;
                              const totalInches = feet * 12 + inches;
                              setClientData((prev) => ({
                                ...prev,
                                height: totalInches.toString(),
                              }));
                            }}
                          />
                          <span className="ml-2">in</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">
                      Weight (lbs) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      required
                      value={clientData.weight}
                      onChange={handleClientChange}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3 mt-6">
                    Health Conditions
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {healthConditions.map((condition) => (
                      <button
                        key={condition.id}
                        type="button"
                        onClick={() =>
                          handleHealthConditionToggle(condition.name)
                        }
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          clientData.health_conditions.includes(condition.name)
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {condition.name}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <Label
                      htmlFor="custom-condition"
                      className="text-sm font-medium mb-2 block"
                    >
                      Add Custom Health Condition (press Enter to add)
                    </Label>
                    <Input
                      id="custom-condition"
                      placeholder="Type and press Enter"
                      onKeyDown={handleCustomHealthCondition}
                    />
                  </div>

                  {clientData.custom_health_conditions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {clientData.custom_health_conditions.map(
                        (condition, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm"
                          >
                            {condition}
                            <button
                              type="button"
                              onClick={() =>
                                removeCustomHealthCondition(condition)
                              }
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3 mt-4">Medications</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {medications.map((medication) => (
                      <button
                        key={medication.id}
                        type="button"
                        onClick={() => handleMedicationToggle(medication.name)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          clientData.medications.includes(medication.name)
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {medication.name}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <Label
                      htmlFor="custom-medication"
                      className="text-sm font-medium mb-2 block"
                    >
                      Add Custom Medication (press Enter to add)
                    </Label>
                    <Input
                      id="custom-medication"
                      placeholder="Type and press Enter"
                      onKeyDown={handleCustomMedication}
                    />
                  </div>

                  {clientData.custom_medications.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {clientData.custom_medications.map(
                        (medication, index) => (
                          <div
                            key={index}
                            className="flex items-center bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-sm"
                          >
                            {medication}
                            <button
                              type="button"
                              onClick={() => removeCustomMedication(medication)}
                              className="ml-2 text-green-600 hover:text-green-800"
                            >
                              ×
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardHeader>
                <CardTitle>Family Members</CardTitle>
                <CardDescription>
                  Add spouse or dependents if applicable
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {dependents.map((dependent, index) => (
                  <DependentForm
                    key={dependent.id}
                    dependent={dependent}
                    index={index}
                    updateDependent={updateDependent}
                    removeDependent={removeDependent}
                    healthConditions={healthConditions}
                    medications={medications}
                  />
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addDependent()}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Dependent
                  </Button>
                  {!hasSpouse && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newSpouse: Dependent = {
                          id: Date.now().toString(),
                          relationship: "spouse",
                          full_name: "",
                          gender: "",
                          date_of_birth: "",
                          height: "",
                          weight: "",
                          health_conditions: [],
                          medications: [],
                          custom_health_conditions: [],
                          custom_medications: [],
                        };
                        setDependents([...dependents, newSpouse]);
                      }}
                      className="flex items-center gap-2"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Spouse
                    </Button>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Reset
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Find Matching Plans"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Matching Insurance Plans</CardTitle>
                <CardDescription>
                  {matchingPlans.length > 0
                    ? `Found ${matchingPlans.length} matching plans based on your information`
                    : "No matching plans found based on your criteria"}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <InsurancePlansTable
                  plans={matchingPlans}
                  clientId={clientIdFromUrl}
                />
              </CardContent>

              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("client-info")}
                >
                  Back
                </Button>
                <Button type="button" onClick={resetForm}>
                  Start New Search
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </form>
      </Tabs>
    </div>
  );
}
