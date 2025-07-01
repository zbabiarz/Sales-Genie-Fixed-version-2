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
    console.error("Auth signup error:", error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  if (!user || !user.id) {
    console.error("No user returned from auth.signUp");
    return encodedRedirect(
      "error",
      "/sign-up",
      "Failed to create user account",
    );
  }

  console.log("User created in auth system with ID:", user.id);

  // Create user record in public.users table - with multiple retries
  let userCreated = false;
  let retryCount = 0;
  const maxRetries = 3;

  while (!userCreated && retryCount < maxRetries) {
    try {
      const userData = {
        id: user.id,
        user_id: user.id,
        name: fullName,
        email: email,
        token_identifier: user.id,
        created_at: new Date().toISOString(),
      };

      console.log(`Attempt ${retryCount + 1} to create user record:`, userData);

      const { error: updateError, data: insertedUser } = await supabase
        .from("users")
        .upsert(userData)
        .select()
        .single();

      if (updateError) {
        console.error(
          `Error creating user record (attempt ${retryCount + 1}):`,
          updateError,
        );
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, retryCount)),
          );
        }
      } else {
        console.log("Successfully created user record:", insertedUser);
        userCreated = true;

        // Verify the user was actually created
        const { data: verifyUser, error: verifyError } = await supabase
          .from("users")
          .select()
          .eq("id", user.id)
          .single();

        if (verifyError || !verifyUser) {
          console.error(
            "User verification failed after insert:",
            verifyError || "No user found",
          );
          userCreated = false;
          retryCount++;
        } else {
          console.log("User verified in database:", verifyUser);
        }
      }
    } catch (err: any) {
      console.error(
        `Exception during user creation (attempt ${retryCount + 1}):`,
        err,
      );
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retryCount)),
        );
      }
    }
  }

  if (!userCreated) {
    console.error("Failed to create user record after multiple attempts");
    // Consider whether to return an error or continue - we'll continue since auth was successful
  }

  // Sign in the user only after ensuring the user record exists
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Error signing in user after signup:", signInError);
      return encodedRedirect(
        "error",
        "/sign-up",
        "Account created but sign-in failed. Please try signing in manually.",
      );
    }

    console.log("Successfully signed in user after signup:", user.id);
  } catch (signInErr: any) {
    console.error("Exception during sign in:", signInErr);
    return encodedRedirect(
      "error",
      "/sign-up",
      "Account created but sign-in failed. Please try signing in manually.",
    );
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

  // First try to find by user_id directly
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

  if (subscription) {
    return true;
  }

  // If no subscription found by user ID, try by email
  const { data: user } = await supabase.auth.getUser();
  if (user?.user?.email) {
    console.log("Trying to find subscription by email:", user.user.email);

    const { data: subscriptionByEmail, error: emailError } = await supabase
      .from("subscriptions")
      .select("*")
      .or(
        `metadata->>'email'.eq.${user.user.email},metadata->>'customer_email'.eq.${user.user.email}`,
      )
      .or(`status.eq.active,status.eq.trialing`)
      .single();

    console.log("Email-based subscription check result:", {
      subscriptionByEmail,
      emailError,
    });

    if (subscriptionByEmail) {
      console.log("Found subscription by email:", subscriptionByEmail.id);

      // Update the subscription with the correct user_id
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ user_id: userId })
        .eq("id", subscriptionByEmail.id);

      if (updateError) {
        console.error("Error updating subscription with user ID:", updateError);
      } else {
        console.log("Updated subscription with correct user ID");
      }

      return true;
    }
  }

  return false;
};
