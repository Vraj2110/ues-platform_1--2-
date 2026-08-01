import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnectionSecrets, getUserYoutubeAnalytics } from "@/lib/server/connections";
import { fetchYouTubeAnalyticsReport, refreshGoogleToken, getMockYouTubeAnalytics } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    if (!decoded?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = decoded.uid as string;
    const secrets = await getUserConnectionSecrets(uid, "youtube");
    const cached = await getUserYoutubeAnalytics(uid);

    if (!secrets?.accessToken) {
      return NextResponse.json({ connected: false, error: "No YouTube connection found" }, { status: 404 });
    }

    const refreshToken = typeof secrets.refreshToken === "string" ? secrets.refreshToken : undefined;
    const accessToken = typeof secrets.accessToken === "string" ? secrets.accessToken : null;
    const isMockConnection = secrets.mockConnection === true || accessToken === "mock-access-token";

    if (isMockConnection) {
      return NextResponse.json(getMockYouTubeAnalytics());
    }

    if (!accessToken) {
      return NextResponse.json({ connected: false, error: "No access token available" }, { status: 404 });
    }

    try {
      const analytics = await fetchYouTubeAnalyticsReport(accessToken, refreshToken);
      return NextResponse.json(analytics);
    } catch (error) {
      if (refreshToken) {
        try {
          const refreshed = await refreshGoogleToken(refreshToken);
          if (refreshed.access_token) {
            const analytics = await fetchYouTubeAnalyticsReport(refreshed.access_token, refreshToken);
            return NextResponse.json(analytics);
          }
        } catch {
          // fall through to cached response
        }
      }

      if (cached) {
        return NextResponse.json(cached);
      }

      return NextResponse.json({ connected: false, error: "Unable to load analytics" }, { status: 502 });
    }
  } catch (error) {
    console.error("youtube analytics route error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
