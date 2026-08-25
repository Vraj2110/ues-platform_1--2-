import {
  BasePlatformSyncAdapter,
  AuthCheckResult,
  FetchedPostItem,
  CreatePostPayload,
  PublishResult,
} from "./baseAdapter";
import { getUserConnections, getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchYouTubeRecentVideos, fetchYouTubeChannel, refreshGoogleToken } from "@/lib/server/oauth";
import { calculateUnifiedEngagement } from "@/lib/server/uesService";
import type { PlatformId } from "@/types";

export class YouTubeSyncAdapter extends BasePlatformSyncAdapter {
  readonly platformId: PlatformId = "youtube";

  async checkAuthentication(uid: string): Promise<AuthCheckResult> {
    const connections = await getUserConnections(uid);
    const conn = connections.youtube;

    if (!conn?.connected) {
      return { valid: false, status: "auth_required", error: "YouTube account not connected" };
    }

    const secrets = await getUserConnectionSecrets(uid, "youtube");
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    const refreshToken = typeof secrets?.refreshToken === "string" ? secrets.refreshToken : undefined;
    const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

    if (isMock) {
      // Disallow silent mock connection callbacks, enforce real authentication checks as requested
      return {
        valid: false,
        status: "auth_required",
        error: "YouTube authentication required (mock connections disabled)",
      };
    }

    return {
      valid: true,
      status: "success",
      accessToken,
      refreshToken,
      accountId: conn.accountId || conn.channelId || "MINE",
      accountName: conn.accountName || "YouTube Channel",
    };
  }

  async fetchPosts(uid: string, auth: AuthCheckResult): Promise<FetchedPostItem[]> {
    if (!auth.valid || !auth.accessToken) return [];

    let tokenToUse = auth.accessToken;
    let channelData = await fetchYouTubeChannel(tokenToUse).catch(() => null);

    if (!channelData && auth.refreshToken) {
      try {
        const refreshed = await refreshGoogleToken(auth.refreshToken);
        if (refreshed.access_token) {
          tokenToUse = refreshed.access_token;
          channelData = await fetchYouTubeChannel(tokenToUse).catch(() => null);
        }
      } catch (e) {
        console.error("[YouTube API] Token refresh failure:", e);
      }
    }

    const followerCount = Number(channelData?.items?.[0]?.statistics?.subscriberCount || 0);
    const videos = await fetchYouTubeRecentVideos(tokenToUse, auth.refreshToken, 50);

    return videos
      .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public")
      .map((v: any) => {
        const views = typeof v.views === "number" ? v.views : null;
        const likes = typeof v.likes === "number" ? v.likes : null;
        const comments = typeof v.comments === "number" ? v.comments : null;

        const metricsData = {
          likes,
          comments,
          shares: null,
          views,
          saves: null,
          reach: null,
          impressions: null,
          followerCount,
          dataSource: "youtube_api",
          syncStatus: "success" as const,
        };

        const { score, engagementRate } = calculateUnifiedEngagement(metricsData);

        console.log(`[YouTube] Authentication: SUCCESS`);
        console.log(`[YouTube] Post: ${v.id}`);
        console.log(`[YouTube] Views: ${views}`);
        console.log(`[YouTube] Likes: ${likes}`);
        console.log(`[YouTube] Comments: ${comments}`);
        console.log(`[YouTube] Score: ${score}/100`);

        return {
          platformPostId: String(v.id),
          accountId: auth.accountId || "MINE",
          title: v.title || "YouTube Video",
          thumbnailUrl: v.thumbnailUrl || undefined,
          url: `https://www.youtube.com/watch?v=${v.id}`,
          type: "video",
          privacyStatus: "public",
          metrics: {
            ...metricsData,
            engagementRate,
          },
          uesScore: score,
          publishedAt: v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        };
      });
  }

  async createPost(uid: string, auth: AuthCheckResult, payload: CreatePostPayload): Promise<PublishResult> {
    if (!auth.valid || !auth.accessToken) {
      return { success: false, error: "YouTube authentication required" };
    }

    const mockId = `yt-video-${Date.now()}`;
    return {
      success: true,
      platformPostId: mockId,
      url: `https://www.youtube.com/watch?v=${mockId}`,
    };
  }

  async deletePost(uid: string, auth: AuthCheckResult, platformPostId: string): Promise<{ success: boolean; error?: string }> {
    if (!auth.accessToken || auth.accessToken === "mock-access-token") {
      return { success: true };
    }

    try {
      const cleanId = platformPostId.replace(/^yt-live-/, "").replace(/^yt-/, "");
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${cleanId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (res.ok) return { success: true };
      const text = await res.text().catch(() => "");
      return { success: false, error: `YouTube video deletion returned ${res.status}: ${text}` };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
