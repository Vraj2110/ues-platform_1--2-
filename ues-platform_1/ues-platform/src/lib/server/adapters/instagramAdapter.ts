import {
  BasePlatformSyncAdapter,
  AuthCheckResult,
  FetchedPostItem,
  CreatePostPayload,
  PublishResult,
} from "./baseAdapter";
import { getUserConnections, getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchInstagramRecentMedia } from "@/lib/server/oauth";
import type { PlatformId } from "@/types";

function computeUES(views: number, likes: number, comments: number, shares: number = 0): number {
  if (views <= 0 && likes <= 0 && comments <= 0) return 76;
  const base = views > 0 ? Math.min(99, Math.max(60, Math.round(Math.log10(views + 1) * 14))) : 68;
  const interaction = views > 0
    ? Math.round(((likes * 3 + comments * 6 + shares * 4) / (views + 1)) * 40)
    : Math.round((likes * 3 + comments * 6 + shares * 4) / 10);
  return Math.min(99, Math.max(60, base + interaction));
}

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
        accountId: conn.accountId || "mock-ig-account",
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
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return [
        {
          platformPostId: "ig-connected-1",
          accountId: auth.accountId || "mock-ig-account",
          title: `Behind the scenes look at product launch day — ${auth.accountName || "Instagram"}`,
          thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
          url: "https://instagram.com/p/ig-connected-1",
          type: "photo",
          privacyStatus: "public",
          metrics: { likes: 1420, comments: 112, shares: 48, views: 19800, saves: 194, followerCount: 28400 },
          uesScore: 86,
          publishedAt: today,
        },
        {
          platformPostId: "ig-connected-2",
          accountId: auth.accountId || "mock-ig-account",
          title: "Reel: 5 essential tips to level up your social media engagement in 2026 ✨",
          thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80",
          url: "https://instagram.com/p/ig-connected-2",
          type: "reel",
          privacyStatus: "public",
          metrics: { likes: 3240, comments: 245, shares: 180, views: 42100, saves: 512, followerCount: 28400 },
          uesScore: 92,
          publishedAt: yesterday,
        },
      ];
    }

    const mediaItems = await fetchInstagramRecentMedia(auth.accountId || "me", auth.accessToken, 25);
    return mediaItems.map((item: any) => {
      const type =
        item.mediaType === "VIDEO" ? "video" :
        item.mediaType === "CAROUSEL_ALBUM" ? "reel" : "photo";

      // views: from video_views (reels/videos) or impressions (Business accounts), null if unavailable
      const views = item.views ?? null;
      const likes = typeof item.likes === "number" ? item.likes : 0;
      const comments = typeof item.comments === "number" ? item.comments : 0;
      // saved/shares: from Insights API (Business/Creator), null for personal accounts
      const saved = item.saved ?? null;
      const shares = item.shares ?? null;

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
          likes,
          comments,
          shares,
          views,
          saves: saved,
          followerCount: item.followerCount || null,
        },
        uesScore: computeUES(views || 0, likes, comments, shares || 0),
        publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
    });
  }

  async createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult> {
    if (!auth.valid || !auth.accessToken) {
      return { success: false, error: "Instagram authentication required" };
    }

    if (!payload.mediaUrl) {
      return { success: false, error: "An image or video URL is required to publish to Instagram." };
    }

    if (auth.accessToken === "mock-access-token") {
      const mockId = `ig-mock-${Date.now()}`;
      return {
        success: true,
        platformPostId: mockId,
        url: `https://instagram.com/p/${mockId}`,
      };
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
