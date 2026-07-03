"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { auth } from "@/lib/firebase";

export default function RootPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, [router]);

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Welcome to UES Platform</h1>
      <p className="text-lg text-gray-600 mb-8">Get started by signing up or logging in.</p>
      <div className="flex gap-4">
        <Link href="/signup">
          <Button variant="primary" size="lg">Sign Up</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">Log In</Button>
        </Link>
      </div>
    </main>
  );
}
