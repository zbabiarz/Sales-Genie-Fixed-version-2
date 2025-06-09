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

        // Check if user has an active subscription
        const { data: subscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", data.user.id)
          .eq("status", "active")
          .single();

        if (subscription) {
          setIsAuthorized(true);
        } else {
          console.log(
            "No active subscription found, redirecting to",
            redirectTo,
          );
          router.push(redirectTo);
        }
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
