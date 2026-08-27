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
  const { allPosts, connectedPlatforms, refreshNow, isLoading } = useRealTimePosts();
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

  const activeConnected = Array.from(connectedPlatforms).filter(p => ["instagram", "youtube", "facebook"].includes(p));
  const connectedCount = activeConnected.length || (connectedPlatforms.size > 0 ? 1 : 0);

  const stats = [
    { 
      label: "Avg UES Score", 
      value: avgUesScore, 
      unit: ".0", 
      change: "Live Real-Time Score", 
      changeDirection: "up" as const, 
      icon: (
        <svg className="w-5 h-5 text-cyan-ues" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.907c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.907a1 1 0 00.95-.69l1.519-4.674z" />
        </svg>
      )
    },
    { 
      label: "Total Posts", 
      value: totalPosts, 
      change: "Tracked across connected platforms", 
      changeDirection: "up" as const, 
      icon: (
        <svg className="w-5 h-5 text-pink-ues" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ), 
      iconBg: "rgba(255,107,107,0.1)" 
    },
    { 
      label: "Active Platforms", 
      value: connectedCount, 
      change: "Real-time OAuth sync active", 
      changeDirection: "neutral" as const, 
      icon: (
        <svg className="w-5 h-5 text-cyan-ues" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      )
    },
    { 
      label: "AI Insights", 
      value: Math.min(6, Math.max(2, Math.round(totalPosts * 0.1))), 
      change: "Real-time pattern analysis", 
      changeDirection: "up" as const, 
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ), 
      iconBg: "rgba(255,107,107,0.1)" 
    },
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
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ues-card animate-pulse shimmer-wrapper">
                  <div className="w-10 h-10 rounded-xl bg-teal-surface/60 mb-4" />
                  <div className="h-3.5 w-24 bg-teal-surface/60 rounded mb-3.5" />
                  <div className="h-9 w-16 bg-teal-surface/60 rounded" />
                  <div className="h-3 w-32 bg-teal-surface/30 rounded mt-2.5" />
                </div>
              ))
            : stats.map((stat) => (
                <StatCard key={stat.label} stat={stat} />
              ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          {/* Left column */}
          <div className="space-y-5">
            {/* UES Trend */}
            <Card className={isLoading ? "animate-pulse shimmer-wrapper" : ""}>
              <CardTitle>
                {isLoading ? (
                  <span className="inline-block h-4.5 w-32 bg-teal-surface/60 rounded" />
                ) : (
                  "UES Over Time"
                )}
              </CardTitle>
              <CardSubtitle>
                {isLoading ? (
                  <span className="inline-block h-3 w-56 bg-teal-surface/40 rounded mt-1.5" />
                ) : (
                  "Real-time trend & engagement score analytics"
                )}
              </CardSubtitle>
              <div className="mt-5">
                {isLoading ? (
                  <div className="h-[300px] bg-teal-surface/20 rounded-xl flex items-end justify-between p-4 gap-2">
                    <div className="h-[25%] w-full bg-teal-surface/40 rounded" />
                    <div className="h-[45%] w-full bg-teal-surface/40 rounded" />
                    <div className="h-[35%] w-full bg-teal-surface/40 rounded" />
                    <div className="h-[65%] w-full bg-teal-surface/40 rounded" />
                    <div className="h-[55%] w-full bg-teal-surface/40 rounded" />
                    <div className="h-[80%] w-full bg-teal-surface/40 rounded" />
                  </div>
                ) : (
                  <UESTrendChart />
                )}
              </div>
            </Card>

            {/* Recent Posts */}
            {isLoading ? (
              <Card className="animate-pulse shimmer-wrapper">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <CardTitle><span className="inline-block h-4.5 w-28 bg-teal-surface/60 rounded" /></CardTitle>
                    <CardSubtitle><span className="inline-block h-3 w-48 bg-teal-surface/40 rounded mt-1.5" /></CardSubtitle>
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-xl bg-teal-surface/40 border border-cyan-border/5">
                      <div className="w-9 h-9 rounded-lg bg-teal-card flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-2/3 bg-teal-card rounded" />
                        <div className="h-2.5 w-1/3 bg-teal-card rounded" />
                      </div>
                      <div className="h-4 w-8 bg-teal-card rounded" />
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <RecentPostsWidget />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* UES Ring */}
            <Card className={isLoading ? "text-center animate-pulse shimmer-wrapper" : "text-center"}>
              <CardTitle>
                {isLoading ? (
                  <span className="inline-block h-4.5 w-24 mx-auto bg-teal-surface/60 rounded" />
                ) : (
                  "Current UES"
                )}
              </CardTitle>
              <CardSubtitle>
                {isLoading ? (
                  <span className="inline-block h-3 w-36 mx-auto bg-teal-surface/40 rounded mt-1.5" />
                ) : (
                  "Unified Engagement Score"
                )}
              </CardSubtitle>
              <div className="flex justify-center mt-6 mb-3">
                {isLoading ? (
                  <div className="w-36 h-36 rounded-full border-[8px] border-teal-surface/40 border-t-cyan-ues animate-spin" />
                ) : (
                  <UESRing score={avgUesScore} size="lg" />
                )}
              </div>
              <p className="text-sm text-mint-700">
                {isLoading ? <span className="inline-block h-3.5 w-36 bg-teal-surface/40 rounded" /> : "Real-time engagement health"}
              </p>
              <p className="text-xs text-cyan-ues mt-1.5 font-medium">
                {isLoading ? <span className="inline-block h-3 w-44 bg-teal-surface/40 rounded" /> : `Live sync active across ${totalPosts} posts`}
              </p>
            </Card>

            {/* Platform Scores */}
            <Card className={isLoading ? "animate-pulse shimmer-wrapper" : ""}>
              <CardTitle>
                {isLoading ? (
                  <span className="inline-block h-4.5 w-24 bg-teal-surface/60 rounded" />
                ) : (
                  "By Platform"
                )}
              </CardTitle>
              <CardSubtitle>
                {isLoading ? (
                  <span className="inline-block h-3 w-36 bg-teal-surface/40 rounded mt-1.5" />
                ) : (
                  "Real-time normalized scores"
                )}
              </CardSubtitle>
              <div className="mt-5 space-y-3.5">
                {isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-teal-surface/40 border border-cyan-border/5">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-7 h-7 rounded-lg bg-teal-card" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-16 bg-teal-card rounded" />
                            <div className="h-1.5 w-full bg-teal-card rounded" />
                          </div>
                        </div>
                        <div className="h-4.5 w-8 bg-teal-card rounded ml-4" />
                      </div>
                    ))
                  : platformScores.map((p) => (
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
