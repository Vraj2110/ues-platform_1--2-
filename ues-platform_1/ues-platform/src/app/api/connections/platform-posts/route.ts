import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getUserConnectionSecrets, setUserConnectionSecrets, getDeletedPostIds, syncCustomPostsWithLiveOrigin } from "@/lib/server/connections";
import {
  fetchInstagramRecentMedia,
  fetchFacebookRecentPosts,
} from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";

export const dynamic = "force-dynamic";

// Connected fallback posts for platforms when API quota/credits are depleted or mock mode is active
function getConnectedFallbackPosts(platformId: string, accountName: string = "Connected Account") {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (platformId === "x" || platformId === "twitter") {
    return [
      {
        id: `x-connected-1`,
        platform: "x",
        title: `Official post on X: Real-time content tracking & engagement analytics active for ${accountName}! 🚀`,
        thumbnailUrl: null,
        url: `https://x.com/post/x-connected-1`,
        type: "thread",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 482, comments: 64, shares: 128, views: 18400, saves: 32, followerCount: 14500 },
        uesScore: 88,
        publishedAt: today,
      },
      {
        id: `x-connected-2`,
        platform: "x",
        title: `Thread: 5 actionable tips for cross-platform analytics and subscriber growth in 2026.`,
        thumbnailUrl: null,
        url: `https://x.com/post/x-connected-2`,
        type: "thread",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 620, comments: 92, shares: 210, views: 34200, saves: 78, followerCount: 14500 },
        uesScore: 92,
        publishedAt: yesterday,
      },
    ];
  }

  if (platformId === "instagram") {
    return [
      {
        id: `ig-connected-1`,
        platform: "instagram",
        title: `Behind the scenes look at product launch day — ${accountName}`,
        thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        url: `https://instagram.com/p/ig-connected-1`,
        type: "photo",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 1420, comments: 112, shares: 48, views: 19800, saves: 194, followerCount: 28400 },
        uesScore: 86,
        publishedAt: today,
      },
      {
        id: `ig-connected-2`,
        platform: "instagram",
        title: `Reel: 5 essential tips to level up your social media engagement in 2026 ✨`,
        thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80",
        url: `https://instagram.com/p/ig-connected-2`,
        type: "reel",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 3240, comments: 245, shares: 180, views: 42100, saves: 512, followerCount: 28400 },
        uesScore: 92,
        publishedAt: yesterday,
      },
      {
        id: `ig-connected-3`,
        platform: "instagram",
        title: `Carousel: Comprehensive breakdown of cross-platform metrics & analytics 📊`,
        thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80",
        url: `https://instagram.com/p/ig-connected-3`,
        type: "photo",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 2180, comments: 156, shares: 94, views: 28900, saves: 340, followerCount: 28400 },
        uesScore: 88,
        publishedAt: new Date(Date.now() - 172800000).toISOString().slice(0, 10),
      },
    ];
  }

  if (platformId === "facebook") {
    return [
      {
        id: `fb-connected-1`,
        platform: "facebook",
        title: `Official Page Update: Live real-time performance analytics connected for ${accountName}`,
        thumbnailUrl: null,
        url: `https://facebook.com/post/fb-connected-1`,
        type: "post",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 890, comments: 74, shares: 145, views: 16200, saves: 28, followerCount: 32000 },
        uesScore: 82,
        publishedAt: today,
      },
    ];
  }

  if (platformId === "linkedin") {
    return [
      {
        id: `li-connected-1`,
        platform: "linkedin",
        title: `Why Unified Engagement Scoring (UES) is the future of creator metrics — ${accountName}`,
        thumbnailUrl: null,
        url: `https://linkedin.com/posts/li-connected-1`,
        type: "article",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 640, comments: 88, shares: 112, views: 14800, saves: 94, followerCount: 8900 },
        uesScore: 85,
        publishedAt: today,
      },
    ];
  }

  if (platformId === "threads") {
    return [
      {
        id: `th-connected-1`,
        platform: "threads",
        title: `Real-time platform synchronization active on Threads for ${accountName} 🧵`,
        thumbnailUrl: null,
        url: `https://threads.net/post/th-connected-1`,
        type: "thread",
        status: "active",
        privacyStatus: "public",
        metrics: { likes: 310, comments: 42, shares: 18, views: 8900, saves: 14, followerCount: 5400 },
        uesScore: 79,
        publishedAt: today,
      },
    ];
  }

  return [];
}

export async function GET(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const connections = await getUserConnections(uid);
    const posts: any[] = [];
    const platformErrors: string[] = [];

    // Process each connected platform in parallel
    const platformTasks = Object.entries(connections)
      .filter(([, conn]) => conn?.connected)
      .map(async ([platformId, conn]) => {
        if (platformId === "youtube") return;

        try {
          const secrets = await getUserConnectionSecrets(uid, platformId);
          const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
          const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

          if (isMock) {
            return;
          }

          if (platformId === "instagram") {
            try {
              const accountId = conn?.accountId || "me";
              const media = await fetchInstagramRecentMedia(accountId, accessToken, 25);
              if (Array.isArray(media) && media.length > 0) {
                media.forEach((item: any) => {
                  const type =
                    item.mediaType === "VIDEO" ? "video" :
                    item.mediaType === "CAROUSEL_ALBUM" ? "reel" : "photo";

                  const views = typeof item.views === "number" ? item.views : null;
                  const likes = typeof item.likes === "number" ? item.likes : null;
                  const comments = typeof item.comments === "number" ? item.comments : null;
                  const saved = typeof item.saved === "number" ? item.saved : null;
                  const shares = typeof item.shares === "number" ? item.shares : null;
                  const reach = typeof item.reach === "number" ? item.reach : null;
                  const impressions = typeof item.impressions === "number" ? item.impressions : null;

                  const metricsData = {
                    likes,
                    comments,
                    shares,
                    views,
                    saves: saved,
                    reach,
                    impressions,
                    followerCount: item.followerCount || null,
                    dataSource: "instagram_graph_api",
                    syncStatus: "success" as const,
                  };

                  const { score, engagementRate } = calculateUnifiedEngagement(metricsData);

                  posts.push({
                    id: `ig-live-${item.id}`,
                    platform: "instagram",
                    title: item.caption?.slice(0, 120) || "Instagram Content",
                    description: item.caption || "",
                    thumbnailUrl: item.thumbnailUrl || null,
                    url: item.permalink || null,
                    type,
                    status: "active",
                    privacyStatus: "public",
                    metrics: {
                      ...metricsData,
                      engagementRate,
                    },
                    uesScore: score,
                    publishedAt: item.publishedAt
                      ? new Date(item.publishedAt).toISOString().slice(0, 10)
                      : new Date().toISOString().slice(0, 10),
                  });
                });
              }
            } catch (igErr) {
              const msg = igErr instanceof Error ? igErr.message : String(igErr);
              console.warn(`[platform-posts] Instagram API error:`, msg);
              platformErrors.push(`Instagram API Error: ${msg}`);
            }

          } else if (platformId === "facebook") {
            try {
              const fbPosts = await fetchFacebookRecentPosts(accessToken, 20);
              if (Array.isArray(fbPosts)) {
                fbPosts.forEach((item: any) => {
                  const likes = typeof item.likes === "number" ? item.likes : null;
                  const comments = typeof item.comments === "number" ? item.comments : null;
                  const shares = typeof item.shares === "number" ? item.shares : null;
                  const views = typeof item.views === "number" ? item.views : null;
                  const reach = typeof item.reach === "number" ? item.reach : null;
                  const impressions = typeof item.impressions === "number" ? item.impressions : null;

                  const metricsData = {
                    likes,
                    comments,
                    shares,
                    views,
                    saves: null,
                    reach,
                    impressions,
                    followerCount: item.followerCount || null,
                    dataSource: "facebook_graph_api",
                    syncStatus: "success" as const,
                  };

                  const { score, engagementRate } = calculateUnifiedEngagement(metricsData);

                  posts.push({
                    id: item.id ? (item.id.startsWith("fb-live-") ? item.id : `fb-live-${item.id}`) : `fb-live-unknown-${item.publishedAt}`,
                    platform: "facebook",
                    title: item.message ? item.message.substring(0, 50) + "..." : "Facebook Post",
                    description: item.message || "",
                    url: item.permalink || `https://facebook.com/${item.id}`,
                    type: "post",
                    status: "active",
                    privacyStatus: "public",
                    category: "Social",
                    thumbnailUrl: item.thumbnailUrl || "",
                    metrics: {
                      ...metricsData,
                      engagementRate,
                    },
                    uesScore: score,
                    publishedAt: item.publishedAt
                      ? new Date(item.publishedAt).toISOString().slice(0, 10)
                      : new Date().toISOString().slice(0, 10),
                  });
                });
              }
            } catch (fbErr) {
              const msg = fbErr instanceof Error ? fbErr.message : String(fbErr);
              console.warn(`[platform-posts] Facebook API error:`, msg);
              platformErrors.push(`Facebook API Error: ${msg}`);
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[platform-posts] Platform task failed for ${platformId}:`, msg);
          platformErrors.push(`${platformId}: ${msg}`);
        }
      });

    await Promise.all(platformTasks);

    const deletedSet = await getDeletedPostIds(uid);
    const activePosts = posts.filter((p) => {
      const rawId = p.id.replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, "");
      return !deletedSet.has(p.id) && !deletedSet.has(rawId);
    });

    return NextResponse.json({ posts: activePosts, errors: platformErrors });
  } catch (error) {
    console.error("platform-posts route error:", error);
    return NextResponse.json({ posts: [], errors: ["Internal server error"] });
  }
}
