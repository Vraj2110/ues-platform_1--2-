import { NextRequest, NextResponse } from "next/server";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import { getUserConnections, getUserConnectionSecrets, saveCustomUserPost } from "@/lib/server/connections";
import {
  fetchYouTubeRecentVideos,
  fetchInstagramRecentMedia,
  fetchFacebookRecentPosts,
  refreshGoogleToken,
} from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60 seconds execution time on Vercel Pro/Hobby

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
  }

  const uidsToSync = ["uLnTKiteP3OPZpyB1gGIMPwH1ij2", "demo-user"];

  if (isFirebaseAdminConfigured) {
    try {
      const usersSnapshot = await adminDb.collection("users").get();
      usersSnapshot.docs.forEach((doc: any) => {
        if (!uidsToSync.includes(doc.id)) {
          uidsToSync.push(doc.id);
        }
      });
    } catch (e: any) {
      console.warn("[Cron] User listing error:", e.message);
    }
  }

  const syncSummary: Record<string, any> = {};

  for (const uid of uidsToSync) {
    try {
      const conns = await getUserConnections(uid);
      const userResult: Record<string, number> = { instagram: 0, facebook: 0, youtube: 0 };

      // 1. Ingest Instagram
      if (conns.instagram?.connected) {
        const igSecrets = await getUserConnectionSecrets(uid, "instagram");
        const token = (igSecrets as any)?.accessToken;
        if (token && token !== "mock-access-token") {
          try {
            const media = await fetchInstagramRecentMedia(conns.instagram.accountId || "me", token, 25);
            if (Array.isArray(media)) {
              for (const item of media) {
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
                const post = {
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
                };
                await saveCustomUserPost(uid, post);
                userResult.instagram++;
              }
            }
          } catch (e: any) {
            console.warn(`[Cron] Instagram sync failed for ${uid}:`, e.message);
          }
        }
      }

      // 2. Ingest Facebook
      if (conns.facebook?.connected) {
        const fbSecrets = await getUserConnectionSecrets(uid, "facebook");
        const token = (fbSecrets as any)?.accessToken;
        if (token && token !== "mock-access-token") {
          try {
            const fbPosts = await fetchFacebookRecentPosts(token, 20);
            if (Array.isArray(fbPosts)) {
              for (const item of fbPosts) {
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
                const post = {
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
                };
                await saveCustomUserPost(uid, post);
                userResult.facebook++;
              }
            }
          } catch (e: any) {
            console.warn(`[Cron] Facebook sync failed for ${uid}:`, e.message);
          }
        }
      }

      // 3. Ingest YouTube
      if (conns.youtube?.connected) {
        const ytSecrets = await getUserConnectionSecrets(uid, "youtube");
        let token = (ytSecrets as any)?.accessToken;
        const refreshToken = (ytSecrets as any)?.refreshToken;
        if (token && token !== "mock-access-token") {
          try {
            let ytVideos = await fetchYouTubeRecentVideos(token, refreshToken, 25).catch(() => null);
            if (!ytVideos && refreshToken) {
              const refreshed = await refreshGoogleToken(refreshToken);
              if (refreshed.access_token) {
                token = refreshed.access_token;
                ytVideos = await fetchYouTubeRecentVideos(token, refreshToken, 25).catch(() => null);
              }
            }
            if (Array.isArray(ytVideos)) {
              for (const v of ytVideos) {
                const metricsData = {
                  likes: v.likes || null,
                  comments: v.comments || null,
                  shares: null,
                  views: v.views || null,
                  saves: null,
                  reach: null,
                  impressions: null,
                  followerCount: (v as any).followerCount || null,
                  dataSource: "youtube_api",
                  syncStatus: "success" as const,
                };
                const { score, engagementRate } = calculateUnifiedEngagement(metricsData);
                const post = {
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
                };
                await saveCustomUserPost(uid, post);
                userResult.youtube++;
              }
            }
          } catch (e: any) {
            console.warn(`[Cron] YouTube sync failed for ${uid}:`, e.message);
          }
        }
      }

      syncSummary[uid] = userResult;
    } catch (err: any) {
      console.error(`[Cron] Error processing UID ${uid}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    syncSummary,
    executedAt: new Date().toISOString(),
  });
}
