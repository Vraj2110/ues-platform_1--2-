"use client";

import { formatNumber } from "@/lib/data";

interface OverviewData {
  totalFollowers: number;
  totalReach: number | string;
  totalImpressions: number | string;
  totalEngagement: number;
  engagementRate: string;
  totalPosts: number;
  averageScore: number;
  bestPlatform: string;
}

interface GlobalOverviewWidgetProps {
  overview: OverviewData;
}

export function GlobalOverviewWidget({ overview }: GlobalOverviewWidgetProps) {
  const stats = [
    { 
      label: "Total Followers", 
      value: typeof overview.totalFollowers === "number" ? formatNumber(overview.totalFollowers) : overview.totalFollowers, 
      color: "text-[var(--color-mint)]" 
    },
    { 
      label: "Total Reach", 
      value: typeof overview.totalReach === "number" ? formatNumber(overview.totalReach) : overview.totalReach, 
      color: "text-[var(--color-mint)]" 
    },
    { 
      label: "Total Impressions", 
      value: typeof overview.totalImpressions === "number" ? formatNumber(overview.totalImpressions) : overview.totalImpressions, 
      color: "text-[var(--color-mint)]" 
    },
    { 
      label: "Total Engagement", 
      value: typeof overview.totalEngagement === "number" ? formatNumber(overview.totalEngagement) : overview.totalEngagement, 
      color: "text-[var(--color-mint)]" 
    },
    { 
      label: "Overall Engagement Rate", 
      value: overview.engagementRate, 
      color: "text-cyan-ues" 
    },
    { 
      label: "Total Posts", 
      value: overview.totalPosts, 
      color: "text-[var(--color-mint)]" 
    },
    { 
      label: "Avg Performance Score", 
      value: overview.averageScore, 
      color: "text-cyan-ues" 
    },
    { 
      label: "Best Platform", 
      value: overview.bestPlatform, 
      color: "text-[var(--color-mint)]" 
    },
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
