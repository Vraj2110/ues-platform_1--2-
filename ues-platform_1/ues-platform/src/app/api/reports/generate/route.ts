import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getUserConnectionSecrets, getCustomUserPosts } from "@/lib/server/connections";
import { AnalyticsService } from "@/lib/server/analyticsService";
import { fetchInstagramRecentMedia, fetchFacebookRecentPosts, fetchYouTubeRecentVideos, getMockYouTubeVideos } from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    let uid = "demo-user";
    try {
      const decoded = await verifyIdToken(request);
      if (decoded?.uid) uid = decoded.uid;
    } catch {}

    const { days = 30 } = await request.json().catch(() => ({ days: 30 }));

    // 1. DATA INGESTION & AGGREGATION
    const connections = await getUserConnections(uid);
    let allPosts = await getCustomUserPosts(uid);

    if (!allPosts || allPosts.length === 0) {
      const livePosts: any[] = [];
      const igSec = await getUserConnectionSecrets(uid, "instagram");
      if (igSec?.accessToken && igSec.accessToken !== "mock-access-token") {
        try {
          const igMedia = await fetchInstagramRecentMedia("me", igSec.accessToken as string, 25);
          if (Array.isArray(igMedia)) {
            igMedia.forEach((item: any) => {
              const metricsData = {
                likes: item.likes || null,
                comments: item.comments || null,
                shares: item.shares || null,
                views: item.views || null,
                saves: item.saved || null,
                reach: item.reach || null,
                impressions: item.impressions || null,
                followerCount: item.followerCount || 3700,
                dataSource: "instagram_graph_api",
                syncStatus: "success" as const,
              };
              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
              livePosts.push({
                id: `ig-${item.id}`,
                platform: "instagram",
                title: item.caption?.slice(0, 100) || "Instagram Content",
                description: item.caption || "",
                type: item.mediaType === "VIDEO" ? "video" : "photo",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      const fbSec = await getUserConnectionSecrets(uid, "facebook");
      if (fbSec?.accessToken && fbSec.accessToken !== "mock-access-token") {
        try {
          const fbMedia = await fetchFacebookRecentPosts(fbSec.accessToken as string, 20);
          if (Array.isArray(fbMedia)) {
            fbMedia.forEach((item: any) => {
              const metricsData = {
                likes: item.likes || null,
                comments: item.comments || null,
                shares: item.shares || null,
                views: item.views || null,
                saves: null,
                reach: item.reach || null,
                impressions: item.impressions || null,
                followerCount: item.followerCount || 1200,
                dataSource: "facebook_graph_api",
                syncStatus: "success" as const,
              };
              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
              livePosts.push({
                id: `fb-${item.id}`,
                platform: "facebook",
                title: item.message?.slice(0, 100) || "Facebook Post",
                description: item.message || "",
                type: "post",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      const ytSec = await getUserConnectionSecrets(uid, "youtube");
      if (ytSec?.accessToken) {
        try {
          const ytMedia = await fetchYouTubeRecentVideos(ytSec.accessToken as string, ytSec.refreshToken as string, 25).catch(() => null);
          if (Array.isArray(ytMedia)) {
            ytMedia.forEach((v: any) => {
              const metricsData = {
                likes: v.likes || null,
                comments: v.comments || null,
                shares: null,
                views: v.views || null,
                saves: null,
                reach: null,
                impressions: null,
                followerCount: (v as any).followerCount || 2300,
                dataSource: "youtube_api",
                syncStatus: "success" as const,
              };
              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
              livePosts.push({
                id: `yt-${v.id}`,
                platform: "youtube",
                title: v.title || "YouTube Video",
                type: "video",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      if (livePosts.length > 0) allPosts = livePosts;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - Number(days) * 24 * 60 * 60 * 1000);
    let currentPosts = allPosts.filter((p) => new Date(p.publishedAt) >= cutoff);
    if (currentPosts.length === 0 && allPosts.length > 0) currentPosts = allPosts;

    const previousCutoff = new Date(now.getTime() - 2 * Number(days) * 24 * 60 * 60 * 1000);
    const previousPosts = allPosts.filter((p) => {
      const d = new Date(p.publishedAt);
      return d >= previousCutoff && d < cutoff;
    });

    const analytics = AnalyticsService.getAnalytics(currentPosts, previousPosts, connections, Number(days), allPosts);

    // 2. AI PROMPT FOR INSIGHTS & ANOMALY DETECTION
    const systemPrompt = `You are a Principal Social Media Growth Strategist and Data Analyst.
Evaluate the last ${days} days of cross-platform metrics across YouTube, Instagram, and Facebook.
Data:
- Total Followers: ${analytics.overview.totalFollowers}
- Total Reach: ${analytics.overview.totalReach}
- Total Engagement: ${analytics.overview.totalEngagement} (Rate: ${analytics.overview.engagementRate})
- Overall UES Score: ${analytics.globalUes.score}/100 (Grade: ${analytics.globalUes.grade})

Answer with deep content performance diagnostics:
1. Identify high-performing patterns (hooks, formats, video lengths, posting times).
2. Identify low-performing anomalies, retention drop-offs, or weak triggers.
3. Provide platform-specific diagnostics for YouTube, Instagram, and Facebook.`;

    return NextResponse.json({
      success: true,
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        timeRangeDays: days,
        totalAnalyzedPosts: allPosts.length,
        globalUes: analytics.globalUes,
        overview: analytics.overview,
        platformBreakdown: analytics.platformBreakdown,
      },
      systemPromptUsed: systemPrompt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
