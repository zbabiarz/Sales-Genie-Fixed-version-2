"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../supabase/client";

interface SubscriptionCheckProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function SubscriptionCheck({
  children,
  redirectTo = "/pricing",
}: SubscriptionCheckProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      const supabase = createClient();

      try {
        const { data, error } = await supabase.auth.getUser();

        // Handle authentication errors (expired/invalid refresh token)
        if (error) {
          console.log("Authentication error:", error.message);
          router.push("/sign-in");
          return;
        }

        if (!data.user) {
          router.push("/sign-in");
          return;
        }

        console.log(
          "Checking subscription for user:",
          data.user.id,
          data.user.email,
        );

        // First try to find by user_id directly
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .or(
            `user_id.eq.${data.user.id},metadata->>'user_id'.eq.${data.user.id},metadata->>'userId'.eq.${data.user.id},metadata->>'client_reference_id'.eq.${data.user.id}`,
          )
          .or(`status.eq.active,status.eq.trialing`)
          .single();

        console.log("Direct user ID subscription check result:", {
          subscription,
          subscriptionError,
        });

        if (subscription) {
          console.log("Found subscription by user ID:", subscription.id);
          setIsAuthorized(true);
          return;
        }

        // If no subscription found by user ID, try by email
        if (data.user.email) {
          console.log("Trying to find subscription by email:", data.user.email);

          // Get customer by email from Stripe
          const { data: userByEmail, error: emailError } = await supabase
            .from("subscriptions")
            .select("*")
            .or(
              `metadata->>'email'.eq.${data.user.email},metadata->>'customer_email'.eq.${data.user.email}`,
            )
            .or(`status.eq.active,status.eq.trialing`)
            .single();

          console.log("Email-based subscription check result:", {
            userByEmail,
            emailError,
          });

          if (userByEmail) {
            console.log("Found subscription by email:", userByEmail.id);

            // Update the subscription with the correct user_id
            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({ user_id: data.user.id })
              .eq("id", userByEmail.id);

            if (updateError) {
              console.error(
                "Error updating subscription with user ID:",
                updateError,
              );
            } else {
              console.log("Updated subscription with correct user ID");
            }

            setIsAuthorized(true);
            return;
          }
        }

        // If we get here, no subscription was found
        console.log("No active subscription found, redirecting to", redirectTo);
        router.push(redirectTo);
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Redirect to sign-in page for any authentication-related errors
        router.push("/sign-in");
      }
    };

    checkSubscription();
  }, [router, redirectTo]);

  // Show nothing while checking authorization
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
