"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-cyan-border/20 bg-teal-surface p-8 shadow-xl">
        <div className="mb-3 text-3xl">📺</div>
        <h2 className="text-lg font-bold text-cyan-ues mb-2">Section Error</h2>
        <p className="text-sm text-mint-700 mb-5">
          {error?.message || "There was a problem loading this section."}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" size="sm" onClick={() => reset()}>
            Try Again
          </Button>
          <a href="/dashboard">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
