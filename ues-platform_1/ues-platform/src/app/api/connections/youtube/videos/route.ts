import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchYouTubeRecentVideos, refreshGoogleToken, getMockYouTubeVideos, fetchYouTubeChannel } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    if (!decoded?.uid) {
      return NextResponse.json({ videos: [], connected: false, error: "Unauthorized" }, { status: 200 });
    }

    const uid = decoded.uid as string;
    const secrets = await getUserConnectionSecrets(uid, "youtube");

    if (!secrets?.accessToken) {
      return NextResponse.json({ videos: [], connected: false }, { status: 200 });
    }

    const accessToken = typeof secrets.accessToken === "string" ? secrets.accessToken : "";
    const refreshToken = typeof secrets.refreshToken === "string" ? secrets.refreshToken : undefined;
    const isMockConnection = secrets.mockConnection === true || accessToken === "mock-access-token" || accessToken === "connected-access-token";

    if (isMockConnection) {
      return NextResponse.json({ ...getMockYouTubeVideos(), connected: true });
    }

    try {
      const channelData = await fetchYouTubeChannel(accessToken).catch(() => null);
      const followerCount = Number(channelData?.items?.[0]?.statistics?.subscriberCount || 0);

      const videos = await fetchYouTubeRecentVideos(accessToken, refreshToken, 50);
      if (Array.isArray(videos)) {
        // ONLY public videos (privacyStatus === 'public' or undefined)
        const publicVideos = videos
          .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public")
          .map((v: any) => ({ ...v, followerCount }));
          
        const liveVideoIds = publicVideos.map((v: any) => v.id).filter(Boolean);
        try {
          const { syncCustomPostsWithLiveOrigin } = await import("@/lib/server/connections");
          syncCustomPostsWithLiveOrigin(uid, liveVideoIds);
        } catch {}
        return NextResponse.json({ videos: publicVideos, connected: true });
      }
      return NextResponse.json({ videos: [], connected: true });
    } catch (error) {
      if (refreshToken) {
        try {
          const refreshed = await refreshGoogleToken(refreshToken);
          if (refreshed.access_token) {
            const channelData = await fetchYouTubeChannel(refreshed.access_token).catch(() => null);
            const followerCount = Number(channelData?.items?.[0]?.statistics?.subscriberCount || 0);

            const videos = await fetchYouTubeRecentVideos(refreshed.access_token, refreshToken, 50);
            if (Array.isArray(videos)) {
              const publicVideos = videos
                .filter((v: any) => !v.privacyStatus || v.privacyStatus === "public")
                .map((v: any) => ({ ...v, followerCount }));
                
              const liveVideoIds = publicVideos.map((v: any) => v.id).filter(Boolean);
              try {
                const { syncCustomPostsWithLiveOrigin } = await import("@/lib/server/connections");
                syncCustomPostsWithLiveOrigin(uid, liveVideoIds);
              } catch {}
              return NextResponse.json({ videos: publicVideos, connected: true });
            }
          }
        } catch {
          // continue fallback
        }
      }
      return NextResponse.json({ videos: [], connected: true });
    }
  } catch (error) {
    console.error("YouTube videos route error", error);
    return NextResponse.json({ ...getMockYouTubeVideos(), connected: true });
  }
}
