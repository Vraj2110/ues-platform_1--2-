import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  PlatformTrendChart,
  ScoreBandChart,
  PlatformPieChart,
} from "@/components/charts/Charts";
import { POSTS, PLATFORM_DISTRIBUTION } from "@/lib/data";

export const metadata: Metadata = { title: "Analytics" };

const TOP_POSTS = [...POSTS].sort((a, b) => b.uesScore - a.uesScore).slice(0, 3);

const platformIcons: Record<string, string> = {
  instagram: "📸", youtube: "▶️", twitter: "🐦", linkedin: "💼",
};
const platformNames: Record<string, string> = {
  instagram: "Instagram", youtube: "YouTube", twitter: "X / Twitter", linkedin: "LinkedIn",
};
const scoreColor = (s: number) => s >= 70 ? "#4ECDC4" : "#FF6B6B";

const TABS = ["Overview", "Trends", "Comparison", "Benchmark"];

export default function AnalyticsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Analytics"
        subtitle="Deep-dive into your cross-platform performance"
        action={
          <Button variant="ghost" size="sm">
            ⬇ Export Report
          </Button>
        }
      />

      <div className="px-9 pb-9 space-y-5">
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

        {/* Top stats strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Posts this month", value: "14", change: "↑ 3", color: "text-cyan-ues" },
            { label: "Avg UES this month", value: "84.2", change: "↑ 6.4%", color: "text-cyan-ues" },
            { label: "Best platform", value: "YouTube", change: "Score: 91", color: "text-cyan-ues" },
            { label: "Most posts", value: "Instagram", change: "38% of total", color: "text-pink-ues" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-teal-card border border-cyan-border/12 rounded-2xl px-5 py-4"
            >
              <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-2">
                {s.label}
              </p>
              <p className="font-display font-extrabold text-2xl leading-none">{s.value}</p>
              <p className={`text-xs mt-1.5 font-medium ${s.color}`}>{s.change}</p>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardTitle>Score Distribution</CardTitle>
            <CardSubtitle>Posts by UES band · All time</CardSubtitle>
            <div className="mt-5">
              <ScoreBandChart />
            </div>
          </Card>

          <Card>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardSubtitle>Highest UES scores this month</CardSubtitle>
            <div className="mt-5 space-y-3">
              {TOP_POSTS.map((post, i) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-teal-surface border border-cyan-border/8"
                >
                  <span className="font-display font-extrabold text-lg text-mint-300 w-6">
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-teal-card flex items-center justify-center text-xl flex-shrink-0">
                    {platformIcons[post.platform]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <p className="text-xs text-mint-700">{platformNames[post.platform]}</p>
                  </div>
                  <span
                    className="font-display font-bold text-base"
                    style={{ color: scoreColor(post.uesScore) }}
                  >
                    {post.uesScore}
                  </span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-1">
                View all posts →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
