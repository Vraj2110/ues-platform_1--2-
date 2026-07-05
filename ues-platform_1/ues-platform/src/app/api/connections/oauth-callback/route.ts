import { NextResponse } from "next/server";
import { resolveOAuthState } from "@/lib/server/oauth";
import {
  exchangeGoogleCode,
  exchangeInstagramCode,
  fetchYouTubeChannel,
  fetchYouTubeChannelId,
  fetchYouTubeAnalyticsReport,
  fetchInstagramProfile,
} from "@/lib/server/oauth";
import { setUserConnection, setUserConnectionSecrets, setUserYoutubeAnalytics } from "@/lib/server/connections";
import type { PlatformConnection } from "@/types";

function parseSearchParams(request: Request) {
  const url = new URL(request.url);
  return url.searchParams;
}

function normalizeConnection(platform: string, profile: any): PlatformConnection {
  const now = new Date().toISOString();
  if (platform === "youtube") {
    return {
      platformId: "youtube",
      connected: true,
      provider: "google",
      accountName: profile?.snippet?.title || profile?.items?.[0]?.snippet?.title || "YouTube",
      accountId: profile?.items?.[0]?.id || profile?.id || null,
      lastSync: now,
    };
  }
  if (platform === "instagram") {
    return {
      platformId: "instagram",
      connected: true,
      provider: "instagram",
      accountName: profile?.username || profile?.id || "Instagram",
      accountId: profile?.id || null,
      lastSync: now,
    };
  }
  return {
    platformId: platform as any,
    connected: true,
    provider: platform,
    lastSync: now,
  };
}

export async function GET(request: Request) {
  const params = parseSearchParams(request);
  const state = params.get("state");
  const code = params.get("code");
  const error = params.get("error");

  if (!state || !code) {
    return NextResponse.redirect(new URL("/connect", request.url));
  }
  if (error) {
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent(error)}`, request.url));
  }

  const record = await resolveOAuthState(state);
  if (!record) {
    return NextResponse.redirect(new URL("/connect?error=invalid_state", request.url));
  }

  const { uid, platform } = record;
  try {
    if (platform === "youtube" || platform === "google") {
      const tokenResponse = await exchangeGoogleCode(code);
      const refreshToken = tokenResponse.refresh_token;
      const accessToken = tokenResponse.access_token;
      const [profile, channelId, analytics] = await Promise.all([
        fetchYouTubeChannel(accessToken),
        fetchYouTubeChannelId(accessToken),
        fetchYouTubeAnalyticsReport(accessToken, refreshToken),
      ]);
      const connection = normalizeConnection("youtube", profile);
      await setUserConnection(uid, "youtube", {
        ...connection,
        accountId: channelId || connection.accountId,
        channelId: channelId || undefined,
      });
      await setUserConnectionSecrets(uid, "youtube", {
        accessToken,
        refreshToken,
        expiresIn: tokenResponse.expires_in,
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type,
        createdAt: new Date().toISOString(),
      });
      await setUserYoutubeAnalytics(uid, analytics);
    } else if (platform === "instagram") {
      const tokenResponse = await exchangeInstagramCode(code);
      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token;
      const profile = await fetchInstagramProfile(accessToken);
      const connection = normalizeConnection("instagram", profile);
      await setUserConnection(uid, "instagram", connection);
      await setUserConnectionSecrets(uid, "instagram", {
        accessToken,
        refreshToken,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type,
        createdAt: new Date().toISOString(),
      });
    }
    return NextResponse.redirect(new URL("/connect?success=connected", request.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL(`/connect?error=${encodeURIComponent("oauth_failed")}`, request.url));
  }
}
