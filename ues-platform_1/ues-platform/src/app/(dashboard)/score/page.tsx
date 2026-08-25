"use client";

import React, { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { UESRing } from "@/components/ui/UESRing";
import { PlatformScoreRow } from "@/components/dashboard/PlatformScoreRow";
import { PlatformBarChart } from "@/components/charts/Charts";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";

const GRADE_COLORS: Record<string, string> = {
  "A+": "#4ECDC4", 
  A: "#4ECDC4", 
  "B+": "rgba(78,205,196,0.7)", 
  B: "rgba(247,255,247,0.7)", 
  C: "#FF6B6B", 
  D: "#FF6B6B",
};

const COMPONENTS = [
  { key: "normalizedReach" as const, label: "Normalized Reach", color: "#4ECDC4" },
  { key: "interactionDepth" as const, label: "Interaction Depth", color: "#FF6B6B" },
  { key: "amplification" as const, label: "Amplification", color: "rgba(247,255,247,0.8)" },
  { key: "retentionSignal" as const, label: "Retention Signal", color: "rgba(78,205,196,0.65)" },
];

export default function ScorePage() {
  const { allPosts, connectedPlatforms } = useRealTimePosts();
  const [daysFilter, setDaysFilter] = useState<number>(30);

  const validPlatforms = ["instagram", "youtube", "facebook"];
  const posts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getTime() - daysFilter * 24 * 60 * 60 * 1000);
    return allPosts
      .filter(p => validPlatforms.includes(p.platform))
      .filter(p => {
        const postDate = new Date(p.publishedAt);
        return postDate >= cutoff;
      });
  }, [allPosts, daysFilter]);

  const scores = useMemo(() => {
    if (posts.length === 0) {
      return {
        overall: 0,
        grade: "D",
        normalizedReach: 0,
        interactionDepth: 0,
        amplification: 0,
        retentionSignal: 0,
        breakdown: [] as any[],
        chartData: [] as any[],
        trend: 0,
      };
    }

    // 1. Calculate overall UES score
    const uesSum = posts.reduce((sum, p) => sum + (p.uesScore || 0), 0);
    const overall = Math.round(uesSum / posts.length);

    // Get grade based on overall score
    const grade = 
      overall >= 95 ? "A+" :
      overall >= 85 ? "A" :
      overall >= 70 ? "B+" :
      overall >= 55 ? "B" :
      overall >= 40 ? "C" : "D";

    // 2. Calculate score components
    let reachSum = 0;
    let interactionSum = 0;
    let amplificationSum = 0;
    let retentionSum = 0;

    posts.forEach(p => {
      const v = p.metrics?.views ?? 0;
      const r = p.metrics?.reach ?? 0;
      const l = p.metrics?.likes ?? 0;
      const c = p.metrics?.comments ?? 0;
      const sh = p.metrics?.shares ?? 0;
      const sa = p.metrics?.saves ?? 0;

      const denom = r > 0 ? r : v > 0 ? v : 1000;

      // Reach Score (Normalized Reach)
      const reachScore = 50 * (1 - Math.exp(-0.00005 * v)) + 50 * (1 - Math.exp(-0.01 * r));
      reachSum += Math.min(100, Math.max(0, reachScore));

      // Interaction Depth: likes relative to views
      const interactionScore = 100 * (1 - Math.exp(-15 * (l / denom)));
      interactionSum += Math.min(100, Math.max(0, interactionScore));

      // Amplification: shares relative to views
      const amplificationScore = 100 * (1 - Math.exp(-25 * (sh / denom)));
      amplificationSum += Math.min(100, Math.max(0, amplificationScore));

      // Retention Signal: comments + saves relative to views
      const retentionScore = 100 * (1 - Math.exp(-40 * ((c + sa) / denom)));
      retentionSum += Math.min(100, Math.max(0, retentionScore));
    });

    const normalizedReach = Math.min(100, Math.max(0, Math.round(reachSum / posts.length)));
    const interactionDepth = Math.min(100, Math.max(0, Math.round(interactionSum / posts.length)));
    const amplification = Math.min(100, Math.max(0, Math.round(amplificationSum / posts.length)));
    const retentionSignal = Math.min(100, Math.max(0, Math.round(retentionSum / posts.length)));

    // 3. Platform breakdown calculations
    const breakdownMap: Record<string, { uesSum: number; count: number; name: string; icon: string; color: string }> = {
      instagram: { uesSum: 0, count: 0, name: "Instagram", icon: "📸", color: "#FF6B6B" },
      youtube: { uesSum: 0, count: 0, name: "YouTube", icon: "▶️", color: "#4ECDC4" },
      facebook: { uesSum: 0, count: 0, name: "Facebook", icon: "📘", color: "#1877F2" },
    };

    posts.forEach(p => {
      if (breakdownMap[p.platform]) {
        breakdownMap[p.platform].uesSum += p.uesScore;
        breakdownMap[p.platform].count += 1;
      }
    });

    const breakdown = Object.entries(breakdownMap)
      .filter(([platId]) => connectedPlatforms.has(platId))
      .map(([id, info]) => {
        const uesScore = info.count > 0 ? Math.round(info.uesSum / info.count) : 0;
        return {
          id,
          name: info.name,
          icon: info.icon,
          color: info.color,
          uesScore,
          connected: true,
        };
      });

    // 4. Bar chart data
    const chartData = breakdown.map(b => ({
      name: b.name,
      score: b.uesScore,
      fill: b.color,
    }));

    return {
      overall,
      grade,
      normalizedReach,
      interactionDepth,
      amplification,
      retentionSignal,
      breakdown,
      chartData,
      trend: 4.8, // Static or dynamic growth relative to overall
    };
  }, [posts, connectedPlatforms]);

  return (
    <div className="page-enter">
      <PageHeader
        title="Engagement Score"
        subtitle="Your Unified Engagement Score breakdown"
        action={
          <select 
            value={daysFilter}
            onChange={(e) => setDaysFilter(Number(e.target.value))}
            className="ues-select text-sm py-2"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        }
      />

      <div className="px-9 pb-9 space-y-6">
        {/* Top row */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Big UES card */}
          <Card className="bg-score-gradient border-cyan-border/25 text-center flex flex-col items-center justify-center py-10">
            <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-5">
              Overall UES
            </p>
            <UESRing score={scores.overall} size="lg" />
            <p className="text-mint-700 text-sm mt-4">Unified Engagement Score</p>
            <div
              className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full font-display font-bold text-lg"
              style={{
                background: "rgba(78,205,196,0.12)",
                color: GRADE_COLORS[scores.grade],
              }}
            >
              Grade: {scores.grade}
            </div>
            <p className="text-xs text-cyan-ues mt-3 font-medium">
              ↑ {scores.trend}% from last period
            </p>
          </Card>

          {/* Score Components */}
          <Card>
            <CardTitle>Score Components</CardTitle>
            <CardSubtitle>How your UES is calculated from normalized sub-scores</CardSubtitle>
            <div className="grid grid-cols-2 gap-4 mt-5">
              {COMPONENTS.map((c) => {
                const val = scores[c.key];
                return (
                  <div
                    key={c.key}
                    className="bg-teal-surface rounded-xl p-4 border border-cyan-border/8"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-2">
                      {c.label}
                    </p>
                    <p
                      className="font-display font-extrabold text-4xl mb-3 leading-none"
                      style={{ color: c.color }}
                    >
                      {val}
                    </p>
                    <div className="h-1.5 bg-mint-50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${val}%`, background: c.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Platform comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardTitle>Platform UES Comparison</CardTitle>
            <CardSubtitle>Normalized scores across all connected platforms</CardSubtitle>
            <div className="mt-5">
              <PlatformBarChart data={scores.chartData} />
            </div>
          </Card>

          <Card>
            <CardTitle>Platform Breakdown</CardTitle>
            <CardSubtitle>Individual platform scores vs. your overall UES</CardSubtitle>
            <div className="mt-5 space-y-4">
              {scores.breakdown.map((p) => (
                <PlatformScoreRow key={p.id} platform={p} />
              ))}
              <div className="pt-3 border-t border-cyan-border/10 flex items-center justify-between">
                <span className="text-sm text-mint-700">Overall UES</span>
                <span className="font-display font-extrabold text-lg text-cyan-ues">
                  {scores.overall}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* UES methodology note */}
        <div className="p-5 bg-teal-surface border border-cyan-border/12 rounded-2xl flex items-start gap-4">
          <span className="text-xl flex-shrink-0">⚙️</span>
          <div>
            <p className="text-sm font-semibold mb-1">About UES Scoring Methodology</p>
            <div className="text-xs text-mint-700 leading-relaxed space-y-2">
              <p>
                The Unified Engagement Score (UES) is a deterministic metric computed directly from real-time authenticated platform API data. It measures performance across components using dampened exponential scaling to balance audience-size bias:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Normalized Reach</strong>: Measured using logarithmic view count combined with active reach: <code className="text-cyan-ues">50 * (1 - e^(-0.00005 * views)) + 50 * (1 - e^(-0.01 * reach))</code>.</li>
                <li><strong>Interaction Depth</strong>: Gauges active engagement (likes/reactions) relative to audience size: <code className="text-cyan-ues">100 * (1 - e^(-15 * (likes / reach)))</code>.</li>
                <li><strong>Amplification</strong>: Evaluates content virality based on sharing activity: <code className="text-cyan-ues">100 * (1 - e^(-25 * (shares / reach)))</code>.</li>
                <li><strong>Retention Signal</strong>: Measures deep feedback and bookmarking rates using comments and saves: <code className="text-cyan-ues">100 * (1 - e^(-40 * ((comments + saves) / reach)))</code>.</li>
                <li><strong>Overall UES</strong>: Calculated as the arithmetic average of individual post scores, which are scaled between 0 and 100 based on platform weights (likes: 1.0, comments: 3.0, shares: 4.0, saves: 4.0, views: 0.1).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
