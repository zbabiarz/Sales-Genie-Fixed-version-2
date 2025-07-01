"use client";

// Import the dev tools and initialize them
import { useEffect } from "react";

export function TempoInit() {
  useEffect(() => {
    const init = async () => {
      try {
        if (process.env.NEXT_PUBLIC_TEMPO) {
          const { TempoDevtools } = await import("tempo-devtools");
          TempoDevtools.init();
        }
      } catch (error) {
        console.warn("Failed to initialize Tempo devtools:", error);
      }
    };

    init();
  }, []);

  return null;
}
