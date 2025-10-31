import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    // ✅ Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // ✅ Initialize OpenAI client
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    console.log("➡️ Starting PDF processing edge function");
    // ✅ Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Please sign in to upload and process PDF files.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Your session has expired. Please sign in again to continue.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    // ✅ Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({
          error:
            "You don't have permission to upload PDF files. Please contact your administrator.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    // ✅ Get PDF from request
    const formData = await req.formData();
    const pdfFile = formData.get("pdf");
    if (!pdfFile) {
      return new Response(
        JSON.stringify({
          error: "Please select a PDF file to upload.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    if (pdfFile.type !== "application/pdf") {
      return new Response(
        JSON.stringify({
          error:
            "Only PDF files are supported. Please select a valid PDF file.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    if (pdfFile.size > 25 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error:
            "File is too large. Please upload a PDF file smaller than 25MB.",
        }),
        {
          status: 413,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    // ✅ Re-wrap PDF as File for OpenAI
    const fileForUpload = new File([pdfFile], pdfFile.name || "document.pdf", {
      type: "application/pdf",
    });
    // ✅ Step 1: Upload PDF to OpenAI
    const uploadedFile = await openai.files.create({
      file: fileForUpload,
      purpose: "assistants",
    });
    console.log("📄 PDF uploaded to OpenAI:", uploadedFile.id);
    // ✅ Step 2: Ask GPT to extract structured data (Python-style call)
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `This PDF contains multiple insurance plans, with premiums for various coverage types across different age groups. Please extract each combination of age group and coverage type as separate plans. Return the plans in the following JSON format:

**Example Plans for Learning Purposes Only**:

1.
{
"company_name": "LIFEX RESEARCH CORP",
"product_name": "VL $1,500/$3,000 Deductible (Employee) - Ages 18-29",
"product_category": "Health Insurance",
"product_price": 349.00,
"product_benefits": "Coverage includes in-network services with a deductible of $1,500 for individuals and $3,000 for families. Covered services include annual lab/x-ray tests, cancer screenings, and telemedicine.",
"disqualifying_health_conditions": ["Organ Failure", "Cancer requiring chemotherapy", "Kidney Failure requiring dialysis"],
"disqualifying_medications": [],
"available_states": ["AL", "CA", "FL"],
"age_range": "18-29",
"coverage_type": "Employee",
"premium": 339.00,
"build_chart_jsonb": [],
"gender": null,
"is_popular": false,
"height_feet_min": null,
"height_feet_max": null,
"height_inches_min": null,
"height_inches_max": null
}

2.
{
"company_name": "LIFEX RESEARCH CORP",
"product_name": "VL $1,500/$3,000 Deductible (Employee + Spouse) - Ages 18-29",
"product_category": "Health Insurance",
"product_price": 349.00,
"product_benefits": "Coverage includes in-network services with a deductible of $1,500 for individuals and $3,000 for families. Covered services include annual lab/x-ray tests, cancer screenings, and telemedicine.",
"disqualifying_health_conditions": ["Organ Failure", "Cancer requiring chemotherapy", "Kidney Failure requiring dialysis"],
"disqualifying_medications": [],
"available_states": ["AL", "CA", "FL"],
"age_range": "18-29",
"coverage_type": "Employee + Spouse",
"premium": 659.00,
"build_chart_jsonb": [{"gender": "male", "max_weight": 209, "min_weight": 105, "height_feet": 5, "height_inches": 0} 
       {"gender": "female", "max_weight": 296, "min_weight": 155, "height_feet": 6, "height_inches": 4}],
"gender": null,
"is_popular": false,
"height_feet_min": null,
"height_feet_max": null,
"height_inches_min": null,
"height_inches_max": null
}

3.
{
"company_name": "ManhattanLife Insurance and Annuity Company",
"product_name": "Affordable Choice Classic Plus (Employee) - Ages 18-29",
"product_category": "Fixed Indemnity Benefit Plan",
"product_price": 96.68,
"product_benefits": "Limited indemnity benefits for hospital confinement, surgery, and prescription benefits.",
"disqualifying_health_conditions": ["Heart Attack", "Stroke", "Cancer"],
"disqualifying_medications": ["Methotrexate", "Insulin"],
"available_states": ["CA", "FL", "TX"],
"age_range": "18-29",
"coverage_type": "Employee",
"premium": 96.68,
"build_chart_jsonb": [{"gender": "male", "max_weight": 235, "min_weight": 0, "height_feet": 5, "height_inches": 0}, {"gender": "female", "max_weight": 295, "min_weight": 0, "height_feet": 6, "height_inches": 5}],
"gender": null,
"is_popular": false,
"height_feet_min": null,
"height_feet_max": null,
"height_inches_min": null,
"height_inches_max": null
}

4.
{
"company_name": "ManhattanLife Insurance and Annuity Company",
"product_name": "Affordable Choice Classic Plus (Employee + Spouse) - Ages 18-29",
"product_category": "Fixed Indemnity Benefit Plan",
"product_price": 96.68,
"product_benefits": "Limited indemnity benefits for hospital confinement, surgery, and prescription benefits.",
"disqualifying_health_conditions": ["Heart Attack", "Stroke", "Cancer"],
"disqualifying_medications": ["Methotrexate", "Insulin"],
"available_states": ["CA", "FL", "TX"],
// "age_range": "18-29", 
"coverage_type": "Employee + Spouse",
"premium": 196.68,
"build_chart_jsonb": [],
"gender": null,
"is_popular": false,
"height_feet_min": null,
"height_feet_max": null,
"height_inches_min": null,
"height_inches_max": null
}

Please note that these examples are for learning purposes only. Do not copy them. Extract the data from the uploaded PDF and return it in the same JSON structure, with the details from the PDF. Ensure that each combination of **age group** (like 18-29, 30-44, etc.) and **coverage type** (like Employee, Employee + Spouse, etc.) is treated as a separate plan so for each age return all coverage type age should always be in num-num like 18-29 format else null and in coverge type this type of term like Employee, Employee + Spouse, etc. and missing data you can search online if available for taht insurance company but i want all their plan based on age and coverage.

if their are mulitpe age then for each age return sepeare row and if multiple coverage type like Employee, Employee + Spouse, etc. then for reach return different row like 4 age ground hai have 4 coverage then total 16 row of data should be their this is just an example not exact number and if any date missing return null.

Please not return any comment or any thing because it causing Json parse error so it should follow json array 

**Expected JSON Array** (formatted as shown):
[ 
{
"company_name": "string",
"product_name": "string",
"product_category": "string",
"product_price": number,
"product_benefits": "string",
"disqualifying_health_conditions": ["string"],
"disqualifying_medications": ["string"],
"available_states": ["string"],
"age_range": "string",
"coverage_type": "string",
"premium": number,
"build_chart_jsonb": [],
"gender": null,
"is_popular": false,
"height_feet_min": null,
"height_feet_max": null,
"height_inches_min": null,
"height_inches_max": null
}
]`,
            },
            {
              type: "file",
              file: {
                file_id: uploadedFile.id,
              },
            },
          ],
        },
      ],
    });
    console.log(response);
    // ✅ Step 3: Parse JSON from GPT response
    const reply = response.choices[0].message?.content ?? "";
    const start = reply.indexOf("[");
    const end = reply.lastIndexOf("]") + 1;
    let cleaned = reply
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
    let insurancePlans = [];
    try {
      insurancePlans = JSON.parse(cleaned.slice(start, end));
    } catch (err) {
      console.error("JSON parse error:", err);
      console.error("Raw text:", cleaned);
      return new Response(
        JSON.stringify({
          error:
            "Unable to extract insurance plan data from this PDF. The file may be corrupted or in an unsupported format. Please try uploading a different PDF file.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }
    // ✅ Step 4: Format data for frontend with all database columns
    const formattedPlans =
      Array.isArray(insurancePlans) && insurancePlans.length > 0
        ? insurancePlans.map((plan) => ({
            company_name: plan.company_name || "Unknown",
            product_name: plan.product_name || "Unknown",
            product_category: plan.product_category || "Health Insurance",
            product_price: Number(plan.product_price) || 0,
            product_benefits: plan.product_benefits || "",
            disqualifying_health_conditions:
              plan.disqualifying_health_conditions ?? [],
            disqualifying_medications: plan.disqualifying_medications ?? [],
            available_states: plan.available_states ?? [],
            age_range: plan.age_range ?? null,
            coverage_type: plan.coverage_type ?? null,
            build_chart_jsonb: plan.build_chart_jsonb ?? [],
            gender: plan.gender ?? null,
            is_popular: Boolean(plan.is_popular) || false,
            height_feet_min: plan.height_feet_min ?? null,
            height_feet_max: plan.height_feet_max ?? null,
            height_inches_min: plan.height_inches_min ?? null,
            height_inches_max: plan.height_inches_max ?? null,
          }))
        : [];
    // ✅ Return extracted data for frontend review
    return new Response(
      JSON.stringify({
        success: true,
        extractedPlans: formattedPlans,
        totalPlans: formattedPlans.length,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    console.error("Server error:", err);

    // Provide user-friendly error messages based on the error type
    let userMessage =
      "Something went wrong while processing your PDF. Please try again.";

    if (err.message?.includes("OpenAI") || err.message?.includes("API")) {
      userMessage =
        "Our AI service is temporarily unavailable. Please try again in a few minutes.";
    } else if (
      err.message?.includes("network") ||
      err.message?.includes("fetch")
    ) {
      userMessage =
        "Network connection issue. Please check your internet connection and try again.";
    } else if (err.message?.includes("timeout")) {
      userMessage =
        "The PDF processing is taking longer than expected. Please try with a smaller file.";
    } else if (
      err.message?.includes("file") ||
      err.message?.includes("upload")
    ) {
      userMessage =
        "There was an issue with your PDF file. Please try uploading a different file.";
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
