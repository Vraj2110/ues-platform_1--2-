"use client";

import { formatNumber } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";

interface ComparisonRow {
  platform: string;
  posts: number;
  avgReach: number | string;
  aiScore: number;
  engagement: string;
}

interface CrossPlatformComparisonProps {
  data: ComparisonRow[];
}

export function CrossPlatformComparison({ data = [] }: CrossPlatformComparisonProps) {
  if (data.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Cross-Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-mint-700 py-4">Connect platforms to view comparison data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Cross-Platform Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cyan-border/20 text-mint-700">
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px]">Platform</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">Posts</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">Avg Reach / Views</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">AI Score</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-border/10">
              {data.map((platform) => {
                return (
                  <tr key={platform.platform} className="text-[var(--color-mint)]">
                    <td className="py-3 font-medium">{platform.platform}</td>
                    <td className="py-3 text-right">{platform.posts}</td>
                    <td className="py-3 text-right">
                      {typeof platform.avgReach === "number" ? formatNumber(platform.avgReach) : platform.avgReach}
                    </td>
                    <td className="py-3 text-right text-cyan-ues font-bold">{platform.aiScore}</td>
                    <td className="py-3 text-right">{platform.engagement}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
