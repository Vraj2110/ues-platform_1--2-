import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getCustomUserPosts, getUserConnectionSecrets } from "@/lib/server/connections";
import { AnalyticsService } from "@/lib/server/analyticsService";
import { fetchInstagramRecentMedia, fetchFacebookRecentPosts, fetchYouTubeRecentVideos, getMockYouTubeVideos, fetchYouTubeChannel } from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let uid = "demo-user";
    try {
      const decoded = await verifyIdToken(request);
      if (decoded?.uid) {
        uid = decoded.uid as string;
      }
    } catch {
      // Fallback to demo-user if auth headers are absent/invalid
    }

    const { searchParams } = new URL(request.url);
    const daysFilter = Number(searchParams.get("days") || "30");

    const connections = await getUserConnections(uid);
    let allPosts = await getCustomUserPosts(uid);

    // If custom database posts are empty, fetch live platform posts directly
    if (!allPosts || allPosts.length === 0) {
      const livePosts: any[] = [];
      const igSecrets = await getUserConnectionSecrets(uid, "instagram");
      if (igSecrets?.accessToken && igSecrets.accessToken !== "mock-access-token") {
        try {
          const media = await fetchInstagramRecentMedia("me", igSecrets.accessToken as string, 25);
          if (Array.isArray(media)) {
            media.forEach((item: any) => {
              const metricsData = {
                likes: item.likes || null,
                comments: item.comments || null,
                shares: item.shares || null,
                views: item.views || null,
                saves: item.saved || null,
                reach: item.reach || null,
                impressions: item.impressions || null,
                followerCount: item.followerCount || null,
                dataSource: "instagram_graph_api",
                syncStatus: "success" as const,
              };
              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
              livePosts.push({
                id: `ig-live-${item.id}`,
                platform: "instagram",
                title: item.caption?.slice(0, 120) || "Instagram Content",
                description: item.caption || "",
                thumbnailUrl: item.thumbnailUrl || null,
                url: item.permalink || null,
                type: item.mediaType === "VIDEO" ? "video" : item.mediaType === "CAROUSEL_ALBUM" ? "reel" : "photo",
                status: "active",
                privacyStatus: "public",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      const fbSecrets = await getUserConnectionSecrets(uid, "facebook");
      if (fbSecrets?.accessToken && fbSecrets.accessToken !== "mock-access-token") {
        try {
          const fbPagePosts = await fetchFacebookRecentPosts(fbSecrets.accessToken as string, 20);
          if (Array.isArray(fbPagePosts)) {
            fbPagePosts.forEach((item: any) => {
              const metricsData = {
                likes: item.likes || null,
                comments: item.comments || null,
                shares: item.shares || null,
                views: item.views || null,
                saves: null,
                reach: item.reach || null,
                impressions: item.impressions || null,
                followerCount: item.followerCount || null,
                dataSource: "facebook_graph_api",
                syncStatus: "success" as const,
              };
              const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
              livePosts.push({
                id: item.id ? (item.id.startsWith("fb-live-") ? item.id : `fb-live-${item.id}`) : `fb-live-unknown-${item.publishedAt}`,
                platform: "facebook",
                title: item.message ? item.message.substring(0, 50) + "..." : "Facebook Post",
                description: item.message || "",
                url: (item as any).permalink || (item as any).permalink_url || `https://facebook.com/${item.id}`,
                type: "post",
                status: "active",
                privacyStatus: "public",
                category: "Social",
                thumbnailUrl: item.thumbnailUrl || "",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      // Ingest YouTube Videos
      const ytSecrets = await getUserConnectionSecrets(uid, "youtube");
      if (ytSecrets?.accessToken) {
        try {
          let ytVideos = await fetchYouTubeRecentVideos(ytSecrets.accessToken as string, ytSecrets.refreshToken as string, 25).catch(() => null);
          if (Array.isArray(ytVideos)) {
            ytVideos.forEach((v: any) => {
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
                id: `yt-live-${v.id}`,
                platform: "youtube",
                title: v.title || "YouTube Channel Video",
                thumbnailUrl: v.thumbnailUrl || undefined,
                url: v.id ? `https://www.youtube.com/watch?v=${v.id}` : undefined,
                type: "video",
                status: "active",
                privacyStatus: "public",
                metrics: { ...metricsData, engagementRate },
                uesScore: score,
                publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
              });
            });
          }
        } catch {}
      }

      if (livePosts.length > 0) {
        allPosts = livePosts;
      }
    }

    const now = new Date();
    const currentCutoff = new Date(now.getTime() - daysFilter * 24 * 60 * 60 * 1000);
    const previousCutoff = new Date(now.getTime() - 2 * daysFilter * 24 * 60 * 60 * 1000);

    let currentPosts = allPosts.filter((p) => {
      const pDate = new Date(p.publishedAt);
      return pDate >= currentCutoff;
    });

    // If no posts fall in the strictly filtered window, use allPosts as baseline
    if (currentPosts.length === 0 && allPosts.length > 0) {
      currentPosts = allPosts;
    }

    const previousPosts = allPosts.filter((p) => {
      const pDate = new Date(p.publishedAt);
      return pDate >= previousCutoff && pDate < currentCutoff;
    });

    const payload = AnalyticsService.getAnalytics(currentPosts, previousPosts, connections, daysFilter, allPosts);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("[Analytics API] Error calculating analytics:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate analytics" }, { status: 500 });
  }
}
