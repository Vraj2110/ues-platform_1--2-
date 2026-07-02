import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { PlatformScoreRow } from "@/components/dashboard/PlatformScoreRow";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { UESRing } from "@/components/ui/UESRing";
import { Button } from "@/components/ui/Button";
import { UESTrendChart } from "@/components/charts/Charts";
import { DASHBOARD_STATS, CONNECTED_PLATFORMS, POSTS, UES_SCORE } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_POSTS = POSTS.slice(0, 4);
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
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardSubtitle>Latest content across all platforms</CardSubtitle>
                </div>
                <Link href="/posts">
                  <Button variant="ghost" size="sm">View all →</Button>
                </Link>
              </div>
              <div className="space-y-2">
                {RECENT_POSTS.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3.5 p-3.5 rounded-xl bg-teal-surface border border-cyan-border/8 hover:border-cyan-border/25 transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-card flex items-center justify-center text-xl flex-shrink-0">
                      {platformIcons[post.platform]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-mint-700 mt-0.5">
                        {platformNames[post.platform]} · {post.publishedAt}
                      </p>
                    </div>
                    <span className="font-display font-bold text-sm" style={{ color: scoreColor(post.uesScore) }}>
                      {post.uesScore}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
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
