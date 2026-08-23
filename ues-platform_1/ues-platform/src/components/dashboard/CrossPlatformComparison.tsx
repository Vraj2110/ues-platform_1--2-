"use client";

import { useMemo } from "react";
import { formatNumber } from "@/lib/data";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/Card";
import { useRealTimePosts } from "@/hooks/useRealTimePosts";

export function CrossPlatformComparison() {
  const { allPosts } = useRealTimePosts();

  const platformData = useMemo(() => {
    const dataMap: Record<string, any> = {};

    allPosts.forEach((post) => {
      const plat = post.platform.toLowerCase();
      if (!dataMap[plat]) {
        dataMap[plat] = {
          platformId: plat,
          platformName: plat.charAt(0).toUpperCase() + plat.slice(1),
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          uesTotal: 0,
          postCount: 0,
        };
      }
      
      dataMap[plat].views += post.metrics.views || 0;
      dataMap[plat].likes += post.metrics.likes || 0;
      dataMap[plat].comments += post.metrics.comments || 0;
      dataMap[plat].shares += post.metrics.shares || 0;
      dataMap[plat].uesTotal += post.uesScore || 0;
      dataMap[plat].postCount += 1;
    });

    return Object.values(dataMap).map((platData) => {
      const engagement = platData.likes + platData.comments + platData.shares;
      const reach = platData.views;
      const engagementRate = reach > 0 ? ((engagement / reach) * 100).toFixed(1) : "0.0";
      const aiScore = platData.postCount > 0 ? Math.round(platData.uesTotal / platData.postCount) : 0;
      
      return {
        platformName: platData.platformName === 'X' ? 'X / Twitter' : platData.platformName,
        posts: platData.postCount,
        reach,
        engagementRate,
        aiScore,
      };
    }).sort((a, b) => b.aiScore - a.aiScore);
  }, [allPosts]);

  if (platformData.length === 0) {
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
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">Avg Reach</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">AI Score</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-[10px] text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-border/10">
              {platformData.map((platform) => {
                const avgReach = Math.round(platform.reach / platform.posts);
                return (
                  <tr key={platform.platformName} className="text-[var(--color-mint)]">
                    <td className="py-3 font-medium">{platform.platformName}</td>
                    <td className="py-3 text-right">{platform.posts}</td>
                    <td className="py-3 text-right">{formatNumber(avgReach)}</td>
                    <td className="py-3 text-right text-cyan-ues font-bold">{platform.aiScore}</td>
                    <td className="py-3 text-right">{platform.engagementRate}%</td>
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
