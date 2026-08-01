"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b1319] text-[#e0f2fe] flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-cyan-500/20 bg-[#121e28] p-8 shadow-2xl">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-[#4ECDC4] mb-2">Something went wrong</h1>
          <p className="text-sm text-[#8AA8A0] mb-6">
            {error?.message || "An unexpected application error occurred."}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#4ECDC4] text-[#0b1319] hover:bg-[#3dbdb4] transition"
            >
              Try Again
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-cyan-500/30 text-[#8AA8A0] hover:text-[#e0f2fe] transition"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
