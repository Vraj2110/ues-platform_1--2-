import { NextResponse } from "next/server";
import { setUserConnection, setUserConnectionSecrets } from "@/lib/server/connections";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const platform = url.searchParams.get("platform") || "youtube";
  const uid = url.searchParams.get("uid");

  if (!uid) {
    return NextResponse.redirect(new URL("/connect?error=missing_user", request.url));
  }

  try {
    await setUserConnection(uid, platform, {
      platformId: platform as any,
      connected: true,
      provider: "google",
      accountName: "Local Demo Channel",
      accountId: "local-demo-channel",
      lastSync: new Date().toISOString(),
    });

    await setUserConnectionSecrets(uid, platform, {
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      expiresIn: 3600,
      scope: "youtube.readonly",
      tokenType: "Bearer",
      createdAt: new Date().toISOString(),
      mockConnection: true,
    });
  } catch (error) {
    console.error("Mock connection failed", error);
    return NextResponse.redirect(new URL(`/connect?error=mock_connection_failed&platform=${platform}`, request.url));
  }

  const redirectUrl = new URL(`/connect`, request.url);
  redirectUrl.searchParams.set("success", "connected");
  redirectUrl.searchParams.set("platform", platform);
  return NextResponse.redirect(redirectUrl);
}
