import {
  BasePlatformSyncAdapter,
  AuthCheckResult,
  FetchedPostItem,
  CreatePostPayload,
  PublishResult,
} from "./baseAdapter";
import { getUserConnections, getUserConnectionSecrets, setUserConnectionSecrets } from "@/lib/server/connections";
import { fetchTwitterRecentTweets } from "@/lib/server/oauth";
import { refreshTwitterToken, publishToTwitter } from "@/lib/server/publishService";
import type { PlatformId } from "@/types";

function computeUES(views: number, likes: number, comments: number, shares: number = 0): number {
  if (views <= 0 && likes <= 0 && comments <= 0) return 74;
  const base = views > 0 ? Math.min(99, Math.max(60, Math.round(Math.log10(views + 1) * 14))) : 68;
  const interaction = views > 0
    ? Math.round(((likes * 3 + comments * 6 + shares * 4) / (views + 1)) * 40)
    : Math.round((likes * 3 + comments * 6 + shares * 4) / 10);
  return Math.min(99, Math.max(60, base + interaction));
}

export class XTwitterSyncAdapter extends BasePlatformSyncAdapter {
  readonly platformId: PlatformId = "x";

  async checkAuthentication(uid: string): Promise<AuthCheckResult> {
    const connections = await getUserConnections(uid);
    const conn = connections.x || connections.twitter;

    if (!conn?.connected) {
      return { valid: false, status: "auth_required", error: "X (Twitter) account not connected" };
    }

    const secrets = await getUserConnectionSecrets(uid, "x");
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    const refreshToken = typeof secrets?.refreshToken === "string" ? secrets.refreshToken : undefined;
    const isMock = !accessToken || accessToken === "mock-access-token" || secrets?.mockConnection === true;

    if (isMock) {
      return {
        valid: true,
        status: "success",
        accessToken: "mock-access-token",
        accountId: conn.accountId || "mock-x-user",
        accountName: conn.accountName || "X Account",
      };
    }

    return {
      valid: true,
      status: "success",
      accessToken,
      refreshToken,
      accountId: conn.accountId || "me",
      accountName: conn.accountName || "X (Twitter) Account",
    };
  }

  async fetchPosts(uid: string, auth: AuthCheckResult): Promise<FetchedPostItem[]> {
    if (!auth.valid || !auth.accessToken) return [];

    if (auth.accessToken === "mock-access-token") {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return [
        {
          platformPostId: "x-connected-1",
          accountId: auth.accountId || "mock-x-user",
          title: `Official post on X: Real-time content tracking active for ${auth.accountName || "Account"}! 🚀`,
          url: "https://x.com/post/x-connected-1",
          type: "thread",
          privacyStatus: "public",
          metrics: { likes: 482, comments: 64, shares: 128, views: 18400, saves: 32, followerCount: 14500 },
          uesScore: 88,
          publishedAt: today,
        },
        {
          platformPostId: "x-connected-2",
          accountId: auth.accountId || "mock-x-user",
          title: "Thread: 5 actionable tips for cross-platform analytics and subscriber growth in 2026.",
          url: "https://x.com/post/x-connected-2",
          type: "thread",
          privacyStatus: "public",
          metrics: { likes: 620, comments: 92, shares: 210, views: 34200, saves: 78, followerCount: 14500 },
          uesScore: 92,
          publishedAt: yesterday,
        },
      ];
    }

    let currentToken = auth.accessToken;
    let tweets: any[] = [];

    try {
      tweets = await fetchTwitterRecentTweets(currentToken, 20);
    } catch (err: any) {
      if (err.message?.includes("401") && auth.refreshToken) {
        const refreshed = await refreshTwitterToken(auth.refreshToken);
        if (refreshed?.access_token) {
          currentToken = refreshed.access_token;
          const secrets = await getUserConnectionSecrets(uid, "x");
          await setUserConnectionSecrets(uid, "x", {
            ...secrets,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            createdAt: new Date().toISOString(),
          });
          tweets = await fetchTwitterRecentTweets(currentToken, 20);
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    return tweets.map((tweet: any) => {
      const likes = Number(tweet.likes || 0);
      const comments = Number(tweet.replies || 0);
      const shares = Number((tweet.retweets || 0) + (tweet.quotes || 0));
      const views = Number(tweet.views || 0);

      return {
        platformPostId: String(tweet.id),
        accountId: auth.accountId || "me",
        title: tweet.text?.slice(0, 120) || "Tweet",
        description: tweet.text || "",
        thumbnailUrl: tweet.thumbnailUrl || undefined,
        url: `https://x.com/i/web/status/${tweet.id}`,
        type: "post",
        privacyStatus: "public",
        metrics: {
          likes,
          comments,
          shares,
          views,
          saves: 0,
          followerCount: tweet.followerCount || 0,
        },
        uesScore: computeUES(views, likes, comments, shares),
        publishedAt: tweet.publishedAt ? new Date(tweet.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      };
    });
  }

  async createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult> {
    if (!auth.valid || !auth.accessToken) {
      return { success: false, error: "X (Twitter) authentication required" };
    }

    if (auth.accessToken === "mock-access-token") {
      const mockId = `x-mock-${Date.now()}`;
      return {
        success: true,
        platformPostId: mockId,
        url: `https://x.com/i/web/status/${mockId}`,
      };
    }

    return publishToTwitter(auth.accessToken, payload.caption, auth.refreshToken);
  }

  async deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }> {
    if (!auth.accessToken || auth.accessToken === "mock-access-token") {
      return { success: true };
    }

    try {
      const cleanId = platformPostId.replace(/^x-live-/, "").replace(/^x-/, "");
      const res = await fetch(`https://api.twitter.com/2/tweets/${cleanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) return { success: true };
      const data = await res.json().catch(() => null);
      return { success: false, error: data?.detail || "Failed to delete tweet on X" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
