"use client";

import React, { useState, useEffect } from "react";
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
import { GlobalOverviewWidget } from "@/components/dashboard/GlobalOverviewWidget";
import { PlatformPerformanceCards } from "@/components/dashboard/PlatformPerformanceCards";
import { PerformanceScoreWidget } from "@/components/dashboard/PerformanceScoreWidget";
import { CrossPlatformComparison } from "@/components/dashboard/CrossPlatformComparison";
import { AIPostAnalysisWidget } from "@/components/dashboard/AIPostAnalysisWidget";
import { AIInsightsSection } from "@/components/dashboard/AIInsightsSection";
import { auth } from "@/lib/firebase";

const TABS = ["Overview", "AI Analysis", "Trends", "Comparison", "Benchmark"];

// Client-side cache to persist analytics data across page navigation
const globalAnalyticsCacheMap = new Map<number, any>();

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [daysFilter, setDaysFilter] = useState<number>(30);
  const [data, setData] = useState<any>(() => globalAnalyticsCacheMap.get(30) || null);
  const [loading, setLoading] = useState(() => !globalAnalyticsCacheMap.has(30));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      if (!globalAnalyticsCacheMap.has(daysFilter)) {
        setLoading(true);
      }
      try {
        const user = auth.currentUser;
        let token = "";
        if (user) {
          try {
            token = await user.getIdToken();
          } catch {}
        }
        const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/analytics?days=${daysFilter}`, { headers });
        if (!res.ok) {
          throw new Error("Unable to fetch analytics reports");
        }
        const payload = await res.json();
        if (active) {
          globalAnalyticsCacheMap.set(daysFilter, payload);
          setData(payload);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "Failed to load analytics");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      fetchAnalytics();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [daysFilter]);

  if (loading) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Analytics & AI Insights"
          subtitle="Loading your performance metrics..."
        />
        <div className="px-9 pb-9">
          <div className="flex items-center gap-3 text-sm text-mint-700">
            <div className="w-4 h-4 border-2 border-cyan-ues border-t-transparent rounded-full animate-spin" />
            Loading analytics dashboard data...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-enter">
        <PageHeader
          title="Analytics & AI Insights"
          subtitle="Deep-dive into your cross-platform performance"
        />
        <div className="px-9 pb-9">
          <Card className="border border-pink-ues/20 bg-pink-ues/[0.03] p-6 text-center">
            <p className="text-pink-ues font-medium">⚠️ Error loading analytics reports</p>
            <p className="text-sm text-mint-700 mt-2">{error || "Connection failure"}</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Analytics & AI Insights"
        subtitle="Deep-dive into your cross-platform performance with AI analysis"
        action={
          <div className="flex items-center gap-3">
            <select 
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="ues-select text-sm py-2 px-4 rounded-xl border border-cyan-border/20 text-mint-400 bg-[#071113] cursor-pointer outline-none focus:border-cyan-ues"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
            <Button variant="ghost" size="sm">
              ⬇ Export Report
            </Button>
          </div>
        }
      />

      <div className="px-9 pb-9 space-y-8">
        {/* Tab bar */}
        <div className="flex gap-1 bg-teal-surface rounded-xl p-1 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-display font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-cyan-mid text-cyan-ues"
                  : "text-mint-700 hover:text-[var(--color-mint)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        {activeTab === "Overview" && (
          <div className="space-y-8">
            <section>
              <GlobalOverviewWidget overview={data.overview} />
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-1">
                <PerformanceScoreWidget 
                  score={data.globalUes.score}
                  grade={data.globalUes.grade}
                  trend={data.globalUes.trend}
                  percentile={data.globalUes.industryPercentile}
                />
              </div>
              <div className="lg:col-span-2">
                <CrossPlatformComparison data={data.crossPlatformComparison} />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-bold text-[var(--color-mint)]">Platform Breakdown</h3>
              </div>
              <PlatformPerformanceCards breakdown={data.platformBreakdown} />
            </section>
          </div>
        )}

        {activeTab === "AI Analysis" && (
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <AIPostAnalysisWidget posts={data.aiAnalyzedPosts} />
            <AIInsightsSection insights={data.aiInsights} />
          </section>
        )}

        {activeTab === "Trends" && (
          <div className="space-y-8">
            <YouTubeAnalyticsDashboard />

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
                    { label: "Facebook", color: "#1877F2" },
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
                    {Object.values(data.platformBreakdown).map((p: any) => {
                      const percentage = data.overview.totalPosts > 0 ? Math.round((p.totalPosts / data.overview.totalPosts) * 100) : 0;
                      const color = p.platformId === 'instagram' ? '#FF6B6B' : p.platformId === 'youtube' ? '#4ECDC4' : '#1877F2';
                      return (
                        <div key={p.platformId}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-mint-700">{p.platformName}</span>
                            <span className="font-display font-bold" style={{ color }}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="h-2 bg-mint-50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            </section>
          </div>
        )}

        {activeTab === "Comparison" && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardTitle>Score Distribution</CardTitle>
              <CardSubtitle>Posts by UES band · Selected range</CardSubtitle>
              <div className="mt-5">
                <ScoreBandChart data={data.scoreDistribution} />
              </div>
            </Card>

            <TopPostsWidget posts={data.topPerformingPosts} />
          </section>
        )}

        {activeTab === "Benchmark" && (
          <Card className="p-8 text-center bg-teal-surface/30">
            <span className="text-4xl mb-4 block">📊</span>
            <CardTitle>Industry Benchmarks</CardTitle>
            <p className="text-sm text-mint-700 mt-2">
              Industry benchmark unavailable
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
