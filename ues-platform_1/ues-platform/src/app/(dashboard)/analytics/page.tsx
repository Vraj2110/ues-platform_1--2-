import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PlatformTrendChart,
  ScoreBandChart,
  PlatformPieChart,
} from "@/components/charts/Charts";
import YouTubeAnalyticsDashboard from "@/components/dashboard/YouTubeAnalyticsDashboard";
import { TopPostsWidget } from "@/components/dashboard/TopPostsWidget";
import { PLATFORM_DISTRIBUTION } from "@/lib/data";

import { GlobalOverviewWidget } from "@/components/dashboard/GlobalOverviewWidget";
import { PlatformPerformanceCards } from "@/components/dashboard/PlatformPerformanceCards";
import { PerformanceScoreWidget } from "@/components/dashboard/PerformanceScoreWidget";
import { CrossPlatformComparison } from "@/components/dashboard/CrossPlatformComparison";
import { AIPostAnalysisWidget } from "@/components/dashboard/AIPostAnalysisWidget";
import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";

export const metadata: Metadata = { title: "Analytics" };

const TABS = ["Overview", "AI Analysis", "Trends", "Comparison", "Benchmark"];

export default function AnalyticsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Analytics & AI Insights"
        subtitle="Deep-dive into your cross-platform performance with AI analysis"
        action={
          <Button variant="ghost" size="sm">
            ⬇ Export Report
          </Button>
        }
      />

      <div className="px-9 pb-9 space-y-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-teal-surface rounded-xl p-1 w-fit">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                i === 0
                  ? "bg-cyan-mid text-cyan-ues"
                  : "text-mint-700 hover:text-[var(--color-mint)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 1. Global Analytics Overview */}
        <section>
          <GlobalOverviewWidget />
        </section>

        {/* Score & Cross-Platform Comparison */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <PerformanceScoreWidget />
          </div>
          <div className="lg:col-span-2">
            <CrossPlatformComparison />
          </div>
        </section>

        {/* 2. Platform Performance Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-display font-bold text-[var(--color-mint)]">Platform Breakdown</h3>
          </div>
          <PlatformPerformanceCards />
        </section>

        {/* 3. AI Analysis & Insights */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <AIPostAnalysisWidget />
          <AIInsightsSection />
        </section>

        <hr className="border-cyan-border/20" />

        {/* Legacy YouTube Dashboard Section (If applicable) */}
        <YouTubeAnalyticsDashboard />

        {/* Legacy Charts Row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardTitle>Platform Engagement Trends</CardTitle>
            <CardSubtitle>Daily UES per platform · Last 14 days</CardSubtitle>
            <div className="mt-5">
              <PlatformTrendChart />
            </div>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {[
                { label: "Instagram", color: "#FF6B6B" },
                { label: "YouTube", color: "#4ECDC4" },
                { label: "X / Twitter", color: "rgba(247,255,247,0.5)" },
                { label: "LinkedIn", color: "rgba(78,205,196,0.5)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="text-xs text-mint-700">{l.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Platform Content Split</CardTitle>
            <CardSubtitle>Post volume by platform</CardSubtitle>
            <div className="flex items-center gap-6 mt-2">
              <div className="flex-shrink-0">
                <PlatformPieChart />
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {PLATFORM_DISTRIBUTION.map((p) => (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-mint-700">{p.platform}</span>
                      <span className="font-display font-bold" style={{ color: p.color }}>
                        {p.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-mint-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.percentage}%`, background: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        {/* Legacy Charts Row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardTitle>Score Distribution</CardTitle>
            <CardSubtitle>Posts by UES band · All time</CardSubtitle>
            <div className="mt-5">
              <ScoreBandChart />
            </div>
          </Card>

          <TopPostsWidget />
        </section>
      </div>
    </div>
  );
}
