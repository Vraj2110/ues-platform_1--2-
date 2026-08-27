import type { Metadata } from "next";
import { InsightsClient } from "@/components/dashboard/InsightsClient";

export const metadata: Metadata = { title: "AI Insights" };

export default function InsightsPage() {
  return <InsightsClient />;
}
