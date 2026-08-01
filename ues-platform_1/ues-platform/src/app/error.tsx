"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root application error caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-[#0b1319]">
      <div className="max-w-md rounded-2xl border border-cyan-border/20 bg-teal-surface p-8 shadow-2xl">
        <div className="mb-4 text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-cyan-ues mb-2">Application Error</h2>
        <p className="text-sm text-mint-700 mb-6">
          {error?.message || "An error occurred while loading this page."}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" onClick={() => reset()}>
            Reload Page
          </Button>
          <a href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </a>
        </div>
      </div>
    </div>
  );
}
