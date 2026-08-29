import {
  BasePlatformSyncAdapter,
  AuthCheckResult,
  FetchedPostItem,
  CreatePostPayload,
  PublishResult,
} from "./baseAdapter";
import { getUserConnections, getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchInstagramRecentMedia } from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";
import type { PlatformId } from "@/types";

export class InstagramSyncAdapter extends BasePlatformSyncAdapter {
  readonly platformId: PlatformId = "instagram";

  async checkAuthentication(uid: string): Promise<AuthCheckResult> {
    const connections = await getUserConnections(uid);
    const conn = connections.instagram;

    if (!conn?.connected) {
      return { valid: false, status: "auth_required", error: "Instagram account not connected" };
    }

    const secrets = await getUserConnectionSecrets(uid, "instagram");
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    const isMock = !accessToken || accessToken === "mock-access-token" || secrets?.mockConnection === true;

    if (isMock) {
      return {
        valid: true,
        status: "success",
        accessToken: "mock-access-token",
        accountId: conn.accountId || "mock-instagram-user",
        accountName: conn.accountName || "Mock Instagram",
      };
    }

    return {
      valid: true,
      status: "success",
      accessToken,
      accountId: conn.accountId || "me",
      accountName: conn.accountName || "Instagram Account",
    };
  }

  async fetchPosts(uid: string, auth: AuthCheckResult): Promise<FetchedPostItem[]> {
    if (!auth.valid || !auth.accessToken) return [];

    if (auth.accessToken === "mock-access-token") {
      const today = new Date().toISOString().slice(0, 10);
      return [
        {
          platformPostId: "mock-ig-post-1",
          accountId: auth.accountId || "mock-ig-user",
          title: "📸 First Mock Instagram Post - Hello World!",
          description: "This is a mock Instagram media item synced for demo purposes.",
          thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80",
          url: "https://instagram.com/p/mock-post-1",
          type: "photo",
          privacyStatus: "public",
          metrics: {
            likes: 95,
            comments: 11,
            shares: 6,
            views: 310,
            saves: 8,
            reach: 290,
            impressions: 340,
            followerCount: 850,
            dataSource: "mock_provider",
            syncStatus: "success",
            engagementRate: 18.2,
          },
          uesScore: 81,
          publishedAt: today,
        }
      ];
    }

    const mediaItems = await fetchInstagramRecentMedia(auth.accountId || "me", auth.accessToken, 25);
    return mediaItems.map((item: any) => {
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

      console.log(`[Instagram] Authentication: SUCCESS`);
      console.log(`[Instagram] Post: ${item.id}`);
      console.log(`[Instagram] Likes: ${likes}`);
      console.log(`[Instagram] Comments: ${comments}`);
      console.log(`[Instagram] Shares: ${shares}`);
      console.log(`[Instagram] Saves: ${saved}`);
      console.log(`[Instagram] Reach: ${reach}`);
      console.log(`[Instagram] Score: ${score}/100`);

      return {
        platformPostId: String(item.id),
        accountId: auth.accountId || "me",
        title: item.caption?.slice(0, 120) || "Instagram Content",
        description: item.caption || "",
        thumbnailUrl: item.thumbnailUrl || undefined,
        url: item.permalink || `https://www.instagram.com/p/${item.id}`,
        type,
        privacyStatus: "public",
        metrics: {
          ...metricsData,
          engagementRate,
        },
        uesScore: score,
        publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
    });
  }

  async createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult> {
    if (!auth.valid || !auth.accessToken) {
      return { success: false, error: "Instagram authentication required" };
    }

    try {
      const mediaEndpoint = `https://graph.instagram.com/v20.0/${auth.accountId}/media`;
      const mediaBody: any = {
        access_token: auth.accessToken,
        caption: payload.caption || "",
      };

      if (payload.mediaType === "video") {
        mediaBody.media_type = "REELS";
        mediaBody.video_url = payload.mediaUrl;
      } else {
        mediaBody.image_url = payload.mediaUrl;
      }

      const createRes = await fetch(mediaEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mediaBody),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        throw new Error(createData.error?.message || "Failed to create Instagram media container");
      }

      const creationId = createData.id;
      const publishEndpoint = `https://graph.instagram.com/v20.0/${auth.accountId}/media_publish`;
      const publishRes = await fetch(publishEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: auth.accessToken,
        }),
      });

      const publishData = await publishRes.json();
      if (!publishRes.ok || !publishData.id) {
        throw new Error(publishData.error?.message || "Failed to publish media to Instagram");
      }

      return {
        success: true,
        platformPostId: publishData.id,
        url: `https://instagram.com/p/${publishData.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Instagram publish failed" };
    }
  }

  async deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }> {
    if (!auth.accessToken || auth.accessToken === "mock-access-token") {
      return { success: true };
    }

    try {
      const cleanId = platformPostId.replace(/^(ig-live-|ig-custom-|ig-)/, "");
      const res = await fetch(`https://graph.instagram.com/v20.0/${cleanId}?access_token=${auth.accessToken}`, {
        method: "DELETE",
      });
      if (res.ok) return { success: true };
      const data = await res.json().catch(() => null);
      return { success: false, error: data?.error?.message || "Failed to delete post on Instagram" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
