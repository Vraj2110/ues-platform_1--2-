"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";

export default function RootPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        router.replace("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading || user) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-[#0b1319] text-[#e0f2fe]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-ues border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-cyan-ues animate-pulse">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-[#0b1319] text-[#e0f2fe] p-6 text-center">
      <div className="max-w-xl rounded-3xl border border-cyan-border/20 bg-teal-surface p-10 shadow-2xl">
        <div className="text-5xl mb-4">📺</div>
        <h1 className="text-4xl font-display font-bold text-cyan-ues mb-3">UES Platform</h1>
        <p className="text-mint-700 text-base mb-8 leading-relaxed">
          Unified Engagement Scoring across Instagram, YouTube, X, and LinkedIn. Compare metrics seamlessly.
        </p>

        {loading ? (
          <p className="text-sm text-mint-700">Loading platform...</p>
        ) : user ? (
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">Go to Dashboard →</Button>
            </Link>
            <Link href="/posts">
              <Button variant="outline" size="lg">View Posts & Content</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/login">
              <Button variant="primary" size="lg">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" size="lg">Create Account</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="lg">Explore Dashboard</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
