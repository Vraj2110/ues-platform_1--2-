"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { PLATFORMS } from "@/lib/data";
import ConnectClient from "./ConnectClient";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/");
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
    <div className="page-enter">
      <PageHeader
        title="Connect Platform"
        subtitle="Authorize UES Platform to collect your engagement data"
      />
      <div className="px-9 pb-9">
        <ConnectClient platforms={PLATFORMS} />

        {/* Info card */}
        <div className="mt-6 p-5 bg-cyan-light/[0.04] border border-cyan-border/20 rounded-2xl flex items-start gap-4">
          <span className="text-2xl flex-shrink-0 mt-0.5">ℹ️</span>
          <div>
            <p className="text-sm font-medium mb-1">How data collection works</p>
            <p className="text-sm text-mint-700 leading-relaxed">
              Raw engagement data is fetched via scheduled background jobs and stored unchanged for full traceability. Normalization and UES computation happen in a separate deterministic engine — ensuring scores are always reproducible and auditable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
