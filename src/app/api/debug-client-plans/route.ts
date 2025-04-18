import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, full_name")
      .eq("id", clientId)
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: "Client not found", details: clientError },
        { status: 404 },
      );
    }

    // Check if client_selected_plans table exists
    const { data: tableInfo, error: tableError } = await supabase.rpc(
      "execute_sql",
      {
        sql: `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_selected_plans'
      );`,
      },
    );

    // Get selected plans for this client
    const { data: selectedPlans, error: plansError } = await supabase
      .from("client_selected_plans")
      .select("*, insurance_plans(*)")
      .eq("client_id", clientId);

    return NextResponse.json({
      client,
      tableExists: tableInfo,
      selectedPlans,
      plansError: plansError ? plansError.message : null,
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
