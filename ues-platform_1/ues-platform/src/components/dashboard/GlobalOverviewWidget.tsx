"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/data";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";

export function GlobalOverviewWidget() {
  const { allPosts } = useRealTimePosts();

  const data = useMemo(() => {
    let totalFollowers = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let sumUES = 0;

    const platformFollowers: Record<string, number> = {};
    const platformScores: Record<string, { total: number; count: number }> = {};

    allPosts.forEach((post) => {
      const pViews = Number(post.metrics.views) || 0;
      const pLikes = Number(post.metrics.likes) || 0;
      const pComments = Number(post.metrics.comments) || 0;
      const pShares = Number(post.metrics.shares) || 0;
      const pScore = Number(post.uesScore) || 0;
      const pFollowers = Number(post.metrics.followerCount) || 0;

      totalViews += pViews;
      totalLikes += pLikes;
      totalComments += pComments;
      totalShares += pShares;
      sumUES += pScore;

      if (!platformScores[post.platform]) {
        platformScores[post.platform] = { total: 0, count: 0 };
      }
      platformScores[post.platform].total += pScore;
      platformScores[post.platform].count += 1;

      if (pFollowers > 0) {
        if (!platformFollowers[post.platform] || pFollowers > platformFollowers[post.platform]) {
          platformFollowers[post.platform] = pFollowers;
        }
      }
    });

    totalFollowers = Object.values(platformFollowers).reduce((acc, count) => acc + Number(count), 0);

    const totalPosts = allPosts.length;
    const totalEngagement = totalLikes + totalComments + totalShares;
    const totalReach = totalViews;
    const totalImpressions = Math.round(totalViews * 1.5); // Derived heuristic

    const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) : "0.0";
    const averageScore = totalPosts > 0 ? Math.round(sumUES / totalPosts) : 0;

    let bestPlatform = "None";
    let maxScore = 0;
    Object.keys(platformScores).forEach((plat) => {
      const avg = platformScores[plat].total / platformScores[plat].count;
      if (avg > maxScore) {
        maxScore = avg;
        bestPlatform = plat.charAt(0).toUpperCase() + plat.slice(1);
      }
    });

    return {
      totalFollowers,
      totalReach,
      totalImpressions,
      totalEngagement,
      engagementRate,
      totalPosts,
      averageScore,
      bestPlatform,
    };
  }, [allPosts]);

  const stats = [
    { label: "Total Followers", value: formatNumber(data.totalFollowers), color: "text-[var(--color-mint)]" },
    { label: "Total Reach", value: formatNumber(data.totalReach), color: "text-[var(--color-mint)]" },
    { label: "Total Impressions", value: formatNumber(data.totalImpressions), color: "text-[var(--color-mint)]" },
    { label: "Total Engagement", value: formatNumber(data.totalEngagement), color: "text-[var(--color-mint)]" },
    { label: "Overall Engagement Rate", value: `${data.engagementRate}%`, color: "text-cyan-ues" },
    { label: "Total Posts", value: data.totalPosts, color: "text-[var(--color-mint)]" },
    { label: "Avg Performance Score", value: data.averageScore, color: "text-cyan-ues" },
    { label: "Best Platform", value: data.bestPlatform, color: "text-[var(--color-mint)]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((s, idx) => (
        <div key={idx} className="bg-teal-card border border-cyan-border/12 rounded-2xl px-5 py-4 flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-widest text-mint-700 font-semibold mb-2">{s.label}</p>
          <p className={`font-display font-extrabold text-2xl leading-none ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
