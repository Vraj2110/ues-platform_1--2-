"use client";

import { formatNumber, getUESGradeColor } from "@/lib/data";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPlatformIcon } from "@/components/ui/PlatformIcons";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  youtube: "▶️",
  facebook: "📘",
};

interface PlatformMetricsSummary {
  platformId: string;
  platformName: string;
  ues: number | string;
  followers: number | string;
  engagementRate: string;
  reach: number | string;
  totalPosts: number;
  impressions: number | string;
  engagement: number;
  change: string;
}

interface PlatformPerformanceCardsProps {
  breakdown: Record<string, PlatformMetricsSummary>;
}

export function PlatformPerformanceCards({ breakdown }: PlatformPerformanceCardsProps) {
  const cardsData = Object.values(breakdown || {});

  if (cardsData.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      {cardsData.map((platform) => {
        const uesScore = typeof platform.ues === "number" ? platform.ues : 0;
        const uesDisplay = platform.ues;
        const followersDisplay = typeof platform.followers === "number" ? formatNumber(platform.followers) : platform.followers;
        const reachDisplay = typeof platform.reach === "number" ? formatNumber(platform.reach) : platform.reach;
        const impressionsDisplay = typeof platform.impressions === "number" ? formatNumber(platform.impressions) : platform.impressions;
        const engagementDisplay = formatNumber(platform.engagement);
        const hasGrowth = platform.change !== "N/A" && !platform.change.startsWith("-");
        const changeDisplay = platform.change;

        return (
          <Card key={platform.platformId} className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center min-h-[24px]">
                  {getPlatformIcon(platform.platformId, "sm") || PLATFORM_ICONS[platform.platformId] || "📱"}
                </span>
                <CardTitle className="mb-0">{platform.platformName}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {changeDisplay !== "N/A" && (
                  <Badge variant={hasGrowth ? "cyan" : "pink"}>
                    {hasGrowth ? "↑" : "↓"} {changeDisplay.replace(/[+-]/, "")}
                  </Badge>
                )}
                {uesScore > 0 ? (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm"
                    style={{ 
                      backgroundColor: "rgba(0,0,0,0.2)", 
                      color: getUESGradeColor(uesScore),
                      border: `1px solid ${getUESGradeColor(uesScore)}` 
                    }}
                    title="Platform UES Score"
                  >
                    {uesDisplay}
                  </div>
                ) : (
                  <Badge variant="pink">N/A</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 mb-4">
              <div>
                <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">
                  {platform.platformId === "youtube" ? "Subscribers" : "Followers"}
                </p>
                <p className="text-xl font-display font-extrabold text-[var(--color-mint)] mt-1">
                  {followersDisplay}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Engagement Rate</p>
                <p className="text-xl font-display font-extrabold text-cyan-ues mt-1">
                  {platform.engagementRate}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">
                  {platform.platformId === "youtube" ? "Total Views" : "Total Reach"}
                </p>
                <p className="text-xl font-display font-extrabold text-[var(--color-mint)] mt-1">
                  {reachDisplay}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-mint-700 tracking-wider font-semibold">Total Posts</p>
                <p className="text-xl font-display font-extrabold text-[var(--color-mint)] mt-1">
                  {platform.totalPosts}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-cyan-border/8 flex justify-between text-xs text-mint-700">
              <span>Impressions: <strong className="text-[var(--color-mint)]">{impressionsDisplay}</strong></span>
              <span>Engagement: <strong className="text-cyan-ues">{engagementDisplay}</strong></span>
            </div>
            
            <div className="mt-2 text-[10px] text-mint-700 opacity-60 flex items-center justify-between">
              <span>Source: {platform.platformId === "youtube" ? "YouTube Analytics" : "Meta Graph API"}</span>
              <span>Status: Synchronized</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
