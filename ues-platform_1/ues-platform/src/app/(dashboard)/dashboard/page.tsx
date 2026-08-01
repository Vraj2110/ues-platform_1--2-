import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { PlatformScoreRow } from "@/components/dashboard/PlatformScoreRow";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { UESRing } from "@/components/ui/UESRing";
import { Button } from "@/components/ui/Button";
import { UESTrendChart } from "@/components/charts/Charts";
import { DASHBOARD_STATS, CONNECTED_PLATFORMS, UES_SCORE } from "@/lib/data";
import { RecentPostsWidget } from "@/components/dashboard/RecentPostsWidget";

export const metadata: Metadata = { title: "Dashboard" };
const platformIcons: Record<string, string> = {
  instagram: "📸", youtube: "▶️", twitter: "🐦", linkedin: "💼",
};
const platformNames: Record<string, string> = {
  instagram: "Instagram", youtube: "YouTube", twitter: "X / Twitter", linkedin: "LinkedIn",
};
const scoreColor = (s: number) => s >= 70 ? "#4ECDC4" : "#FF6B6B";

export default function DashboardPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Dashboard"
        subtitle="Your engagement overview · Last 30 days"
        action={
          <Link href="/posts/add">
            <Button variant="primary">+ Add Post</Button>
          </Link>
        }
      />

      <div className="px-9 pb-9 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {DASHBOARD_STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* UES Trend */}
            <Card>
              <CardTitle>UES Over Time</CardTitle>
              <CardSubtitle>7-day rolling average unified engagement score</CardSubtitle>
              <div className="mt-5">
                <UESTrendChart />
              </div>
            </Card>

            {/* Recent Posts */}
            <RecentPostsWidget />
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* UES Ring */}
            <Card className="text-center">
              <CardTitle>Current UES</CardTitle>
              <CardSubtitle>Unified Engagement Score</CardSubtitle>
              <div className="flex justify-center mt-6 mb-3">
                <UESRing score={UES_SCORE.overall} size="lg" />
              </div>
              <p className="text-sm text-mint-700">Excellent engagement health</p>
              <p className="text-xs text-cyan-ues mt-1.5 font-medium">
                ↑ {UES_SCORE.trend}% from last month
              </p>
            </Card>

            {/* Platform Scores */}
            <Card>
              <CardTitle>By Platform</CardTitle>
              <CardSubtitle>Normalized scores</CardSubtitle>
              <div className="mt-5 space-y-3.5">
                {CONNECTED_PLATFORMS.map((p) => (
                  <PlatformScoreRow key={p.id} platform={p} />
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
