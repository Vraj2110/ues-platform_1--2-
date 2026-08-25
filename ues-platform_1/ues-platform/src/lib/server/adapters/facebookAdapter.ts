import {
  BasePlatformSyncAdapter,
  AuthCheckResult,
  FetchedPostItem,
  CreatePostPayload,
  PublishResult,
} from "./baseAdapter";
import { getUserConnections, getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchFacebookRecentPosts } from "@/lib/server/oauth";
import { publishToFacebook } from "@/lib/server/publishService";
import type { PlatformId } from "@/types";

function computeUES(views: number, likes: number, comments: number, shares: number = 0): number {
  if (views <= 0 && likes <= 0 && comments <= 0) return 78;
  const base = views > 0 ? Math.min(99, Math.max(60, Math.round(Math.log10(views + 1) * 14))) : 68;
  const interaction = views > 0
    ? Math.round(((likes * 3 + comments * 6 + shares * 4) / (views + 1)) * 40)
    : Math.round((likes * 3 + comments * 6 + shares * 4) / 10);
  return Math.min(99, Math.max(60, base + interaction));
}

export class FacebookSyncAdapter extends BasePlatformSyncAdapter {
  readonly platformId: PlatformId = "facebook";

  async checkAuthentication(uid: string): Promise<AuthCheckResult> {
    const connections = await getUserConnections(uid);
    const conn = connections.facebook;

    if (!conn?.connected) {
      return { valid: false, status: "auth_required", error: "Facebook account not connected" };
    }

    const secrets = await getUserConnectionSecrets(uid, "facebook");
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    const isMock = !accessToken || accessToken === "mock-access-token" || secrets?.mockConnection === true;

    if (isMock) {
      return {
        valid: true,
        status: "success",
        accessToken: "mock-access-token",
        accountId: conn.accountId || "mock-fb-page",
        accountName: conn.accountName || "Facebook Page",
      };
    }

    return {
      valid: true,
      status: "success",
      accessToken,
      accountId: conn.accountId || "me",
      accountName: conn.accountName || "Facebook Account",
    };
  }

  async fetchPosts(uid: string, auth: AuthCheckResult): Promise<FetchedPostItem[]> {
    if (!auth.valid || !auth.accessToken) return [];

    if (auth.accessToken === "mock-access-token") {
      // No real Facebook posts – return empty so count is 0
      return [];
    }

    const fbPosts = await fetchFacebookRecentPosts(auth.accessToken, 20);
    return fbPosts.map((item: any) => {
      const likes = Number(item.likes || 0);
      const comments = Number(item.comments || 0);
      const shares = Number(item.shares || 0);
      const views = item.views ?? null;

      return {
        platformPostId: String(item.id),
        accountId: auth.accountId || "me",
        title: item.message ? item.message.substring(0, 80) + "..." : "Facebook Post",
        description: item.message || "",
        thumbnailUrl: item.thumbnailUrl || undefined,
        url: item.permalink || `https://facebook.com/${item.id}`,
        type: "post",
        privacyStatus: "public",
        metrics: {
          likes,
          comments,
          shares,
          views,
          saves: 0,
          followerCount: item.followerCount || 0,
        },
        uesScore: computeUES(views || 0, likes, comments, shares),
        publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
    });
  }

  async createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult> {
    if (!auth.valid || !auth.accessToken) {
      return { success: false, error: "Facebook authentication required" };
    }

    if (auth.accessToken === "mock-access-token") {
      const mockId = `fb-mock-${Date.now()}`;
      return {
        success: true,
        platformPostId: mockId,
        url: `https://facebook.com/${mockId}`,
      };
    }

    return publishToFacebook(auth.accessToken, payload.caption, payload.mediaUrl, payload.mediaType);
  }

  async deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }> {
    if (!auth.accessToken || auth.accessToken === "mock-access-token") {
      return { success: true };
    }

    try {
      const cleanId = platformPostId.replace(/^fb-live-/, "").replace(/^fb-/, "");
      const res = await fetch(`https://graph.facebook.com/v19.0/${cleanId}?access_token=${auth.accessToken}`, {
        method: "DELETE",
      });
      if (res.ok) return { success: true };
      const data = await res.json().catch(() => null);
      return { success: false, error: data?.error?.message || "Failed to delete post on Facebook" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
