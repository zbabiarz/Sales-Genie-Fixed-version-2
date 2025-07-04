import { NextResponse } from "next/server";
import { createClient } from "../../../../supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current authenticated user
    const { data: authUser, error: authError } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        {
          error: "Authentication error",
          details: authError.message,
        },
        { status: 401 },
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        {
          error: "No authenticated user found",
        },
        { status: 401 },
      );
    }

    console.log("Auth User ID:", authUser.user.id);
    console.log("Auth User Email:", authUser.user.email);

    // Check what's in the users table
    const { data: usersTableData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.user.id);

    console.log("Users table query result:", usersTableData);

    // Also check if there are any users with this email
    const { data: usersByEmail, error: emailError } = await supabase
      .from("users")
      .select("*")
      .eq("email", authUser.user.email);

    console.log("Users by email:", usersByEmail);

    // Check all users in the table (limit to 10 for debugging)
    const { data: allUsers, error: allUsersError } = await supabase
      .from("users")
      .select("*")
      .limit(10);

    console.log("All users (first 10):", allUsers);

    // Check subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(
        `user_id.eq.${authUser.user.id},metadata->>'user_id'.eq.${authUser.user.id},metadata->>'userId'.eq.${authUser.user.id},metadata->>'client_reference_id'.eq.${authUser.user.id}`,
      );

    console.log("Subscriptions found:", subscriptions);

    return NextResponse.json({
      debug_info: {
        auth_user: {
          id: authUser.user.id,
          email: authUser.user.email,
          created_at: authUser.user.created_at,
          user_metadata: authUser.user.user_metadata,
          raw_user_meta_data: authUser.user.raw_user_meta_data,
        },
        users_table_by_id: usersTableData,
        users_table_by_email: usersByEmail,
        all_users_sample: allUsers,
        subscriptions: subscriptions,
        errors: {
          auth_error: authError,
          users_error: usersError,
          email_error: emailError,
          all_users_error: allUsersError,
          subscription_error: subError,
        },
      },
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
