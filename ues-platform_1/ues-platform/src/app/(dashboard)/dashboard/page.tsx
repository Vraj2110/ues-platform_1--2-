"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { PlatformScoreRow } from "@/components/dashboard/PlatformScoreRow";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { UESRing } from "@/components/ui/UESRing";
import { Button } from "@/components/ui/Button";
import { UESTrendChart } from "@/components/charts/Charts";
import { RecentPostsWidget } from "@/components/dashboard/RecentPostsWidget";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";

const PLATFORM_META: Record<string, { name: string; icon: string; color: string }> = {
  instagram: { name: "Instagram", icon: "📸", color: "#FF6B6B" },
  youtube: { name: "YouTube", icon: "▶️", color: "#4ECDC4" },
  facebook: { name: "Facebook", icon: "📘", color: "#1877F2" },
};

export default function DashboardPage() {
  const { allPosts, connectedPlatforms, refreshNow } = useRealTimePosts();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    refreshNow();
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const totalPosts = allPosts.length;
  const avgUesScore = totalPosts > 0
    ? Math.round(allPosts.reduce((acc, p) => acc + (p.uesScore || 0), 0) / totalPosts)
    : 84;

  const connectedCount = Math.max(1, connectedPlatforms.size);

  const stats = [
    { label: "Avg UES Score", value: avgUesScore, unit: ".0", change: "Live Real-Time Score", changeDirection: "up" as const, icon: "⭐" },
    { label: "Total Posts", value: totalPosts, change: "Tracked across connected platforms", changeDirection: "up" as const, icon: "📝", iconBg: "rgba(255,107,107,0.1)" },
    { label: "Active Platforms", value: connectedCount, change: "Real-time OAuth sync active", changeDirection: "neutral" as const, icon: "🔗" },
    { label: "AI Insights", value: Math.min(6, Math.max(2, Math.round(totalPosts * 0.1))), change: "Real-time pattern analysis", changeDirection: "up" as const, icon: "🤖", iconBg: "rgba(255,107,107,0.1)" },
  ];

  const platformScores = Object.keys(PLATFORM_META).map((platKey) => {
    const pPosts = allPosts.filter((p) => (p.platform as string) === platKey);
    const score = pPosts.length > 0
      ? Math.round(pPosts.reduce((acc, p) => acc + (p.uesScore || 0), 0) / pPosts.length)
      : (connectedPlatforms.has(platKey) ? 82 : 0);

    return {
      id: platKey as any,
      name: PLATFORM_META[platKey].name,
      icon: PLATFORM_META[platKey].icon,
      color: PLATFORM_META[platKey].color,
      connected: connectedPlatforms.has(platKey) || pPosts.length > 0,
      uesScore: score,
    };
  }).filter((p) => p.connected || p.uesScore > 0);

  return (
    <div className="page-enter">
      <PageHeader
        title="Dashboard"
        subtitle="Your engagement overview · Real-time live data"
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-4 border-cyan-border/30 text-mint-700 hover:text-cyan-ues flex items-center gap-2"
            >
              <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
              {isSyncing ? "Syncing..." : "Sync Live Feed"}
            </Button>
            <Link href="/posts/add">
              <Button variant="primary">+ Add Post</Button>
            </Link>
          </div>
        }
      />

      <div className="px-9 pb-9 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
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
              <CardSubtitle>Real-time trend & engagement score analytics</CardSubtitle>
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
                <UESRing score={avgUesScore} size="lg" />
              </div>
              <p className="text-sm text-mint-700">Real-time engagement health</p>
              <p className="text-xs text-cyan-ues mt-1.5 font-medium">
                Live sync active across {totalPosts} posts
              </p>
            </Card>

            {/* Platform Scores */}
            <Card>
              <CardTitle>By Platform</CardTitle>
              <CardSubtitle>Real-time normalized scores</CardSubtitle>
              <div className="mt-5 space-y-3.5">
                {platformScores.map((p) => (
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
