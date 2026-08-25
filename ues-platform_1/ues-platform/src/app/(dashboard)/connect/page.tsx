import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import ConnectClient from "./ConnectClient";
import type { Platform } from "@/types";

// This data is often in a shared file like /lib/data.ts, but is defined here for clarity.
const PLATFORMS: Platform[] = [
  { id: 'youtube', name: 'YouTube', icon: '📺', color: 'bg-red-500', connected: false },
  { id: 'instagram', name: 'Instagram', icon: '📸', color: 'bg-pink-500', connected: false },
  { id: 'facebook', name: 'Facebook', icon: '👍', color: 'bg-indigo-600', connected: false },
];

export default function ConnectPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Connect Platforms"
        subtitle="Connect your social media and other platforms to start tracking your engagement."
      />
      <div className="px-9 pb-9">
        <Suspense fallback={<div className="text-sm text-mint-700">Loading connect options…</div>}>
          <ConnectClient platforms={PLATFORMS} />
        </Suspense>
      </div>
    </div>
  );
}