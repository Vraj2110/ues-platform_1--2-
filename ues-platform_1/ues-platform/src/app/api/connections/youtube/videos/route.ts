import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnectionSecrets } from "@/lib/server/connections";
import { fetchYouTubeRecentVideos, refreshGoogleToken } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = decoded.uid as string;
    const secrets = await getUserConnectionSecrets(uid, "youtube");
    if (!secrets?.accessToken) {
      return NextResponse.json({ error: "No YouTube connection" }, { status: 404 });
    }

    const accessToken = String(secrets.accessToken);
    const refreshToken = typeof secrets.refreshToken === "string" ? secrets.refreshToken : undefined;

    try {
      const videos = await fetchYouTubeRecentVideos(accessToken, refreshToken, 8);
      return NextResponse.json({ videos });
    } catch (error) {
      if (refreshToken) {
        try {
          const refreshed = await refreshGoogleToken(refreshToken);
          if (refreshed.access_token) {
            const videos = await fetchYouTubeRecentVideos(refreshed.access_token, refreshToken, 8);
            return NextResponse.json({ videos });
          }
        } catch {
          // continue to error fallback
        }
      }
      return NextResponse.json({ error: "Unable to fetch YouTube videos" }, { status: 502 });
    }
  } catch (error) {
    console.error("YouTube videos route error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
