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
import { calculateUnifiedEngagement } from "@/lib/server/uesService";
import type { PlatformId } from "@/types";

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
        accountId: conn.accountId || "mock-facebook-page",
        accountName: conn.accountName || "Mock Facebook Page",
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
      const today = new Date().toISOString().slice(0, 10);
      return [
        {
          platformPostId: "mock-fb-post-1",
          accountId: auth.accountId || "mock-fb-page",
          title: "🚀 First Mock Facebook Post - Welcome to UES Platform!",
          description: "This is a mock Facebook post synced for demo purposes.",
          thumbnailUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=800&q=80",
          url: "https://facebook.com/mock-post-1",
          type: "post",
          privacyStatus: "public",
          metrics: {
            likes: 125,
            comments: 18,
            shares: 12,
            views: 450,
            saves: 0,
            reach: 420,
            impressions: 480,
            followerCount: 1500,
            dataSource: "mock_provider",
            syncStatus: "success",
            engagementRate: 25.5,
          },
          uesScore: 84,
          publishedAt: today,
        }
      ];
    }

    const fbPosts = await fetchFacebookRecentPosts(auth.accessToken, 20);
    return fbPosts.map((item: any) => {
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
        saves: null, // Facebook posts do not expose saves via public APIs
        reach,
        impressions,
        followerCount: item.followerCount || null,
        dataSource: "facebook_graph_api",
        syncStatus: "success" as const,
      };

      const { score, engagementRate } = calculateUnifiedEngagement(metricsData);

      console.log(`[Facebook] Authentication: SUCCESS`);
      console.log(`[Facebook] Post: ${item.id}`);
      console.log(`[Facebook] Likes/Reactions: ${likes}`);
      console.log(`[Facebook] Comments: ${comments}`);
      console.log(`[Facebook] Shares: ${shares}`);
      console.log(`[Facebook] Reach: ${reach}`);
      console.log(`[Facebook] Score: ${score}/100`);

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
      return { success: false, error: "Facebook authentication required" };
    }

    try {
      return await publishToFacebook(
        auth.accessToken,
        payload.caption,
        payload.mediaUrl,
        payload.mediaType
      );
    } catch (e: any) {
      return { success: false, error: e.message || "Facebook publishing failed" };
    }
  }

  async deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }> {
    if (!auth.accessToken || auth.accessToken === "mock-access-token") {
      return { success: true };
    }

    try {
      const cleanId = platformPostId.replace(/^(fb-live-|fb-custom-|fb-)/, "");
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
