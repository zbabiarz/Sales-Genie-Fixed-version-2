"use server";

import { createClient } from "../../supabase/server";
import { encodedRedirect } from "@/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();
  const origin = headers().get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        email: email,
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (user) {
    try {
      // Create user record in public.users table
      const { error: updateError } = await supabase.from("users").insert({
        id: user.id,
        user_id: user.id,
        name: fullName,
        email: email,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      });

      if (updateError) {
        console.log("Error creating user record:", updateError.message);
      } else {
        console.log("Successfully created user record for ID:", user.id);
      }

      // Sign in the user immediately after sign up
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.log("Error signing in user after signup:", signInError.message);
      } else {
        console.log("Successfully signed in user after signup:", user.id);
      }
    } catch (err: any) {
      console.log("Exception during user creation:", err.message);
    }
  }

  // Redirect to dashboard instead of showing success message
  return redirect("/dashboard");
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/dashboard/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export const checkUserSubscription = async (userId: string) => {
  const supabase = await createClient();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .or(
      `user_id.eq.${userId},metadata->>'user_id'.eq.${userId},metadata->>'userId'.eq.${userId},metadata->>'client_reference_id'.eq.${userId}`,
    )
    .or(`status.eq.active,status.eq.trialing`)
    .single();

  console.log("Checking subscription for user:", userId);
  if (error) {
    console.log("Subscription check error:", error.message);
  } else {
    console.log("Subscription found:", subscription ? subscription.id : "none");
  }

  if (error) {
    console.log("Subscription check error:", error);
    return false;
  }

  return !!subscription;
};
