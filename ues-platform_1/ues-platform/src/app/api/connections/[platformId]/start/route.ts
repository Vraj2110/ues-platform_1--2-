import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { createOAuthState, getGoogleOAuthUrl, getInstagramOAuthUrl, getFacebookOAuthUrl, getThreadsOAuthUrl, getTwitterOAuthUrl, generatePKCE, isGoogleOAuthConfigured } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

function buildRedirectUri(request: Request, platformId: string) {
  const requestUrl = new URL(request.url);
  const configuredRedirectUri = platformId === "youtube" || platformId === "google"
    ? process.env.GOOGLE_REDIRECT_URI
    : undefined;

  if (configuredRedirectUri) {
    return configuredRedirectUri;
  }

  return new URL(`/api/connections/oauth-callback`, requestUrl.origin).toString();
}

export async function POST(request: Request, { params }: { params: { platformId: string } }) {
  try {
    const decoded = await verifyIdToken(request);
    if (!decoded?.uid) {
      console.error("OAuth start failed: missing or invalid auth token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const uid = (decoded as any).uid as string;
    const { platformId } = params;
    
    // For Twitter/X, we need PKCE
    let state: string;
    let codeChallengeStr: string | null = null;
    if (platformId === "x") {
      const { codeVerifier, codeChallenge } = generatePKCE();
      state = await createOAuthState(uid, platformId, codeVerifier);
      codeChallengeStr = codeChallenge;
    } else {
      state = await createOAuthState(uid, platformId);
    }

    const redirectUri = buildRedirectUri(request, platformId);

    let url: string | null = null;
    if (platformId === "youtube") {
      if (!isGoogleOAuthConfigured()) {
        const mockUrl = new URL(`/api/connections/mock-connect`, new URL(request.url).origin);
        mockUrl.searchParams.set("platform", platformId);
        mockUrl.searchParams.set("uid", uid);
        return NextResponse.json({ url: mockUrl.toString() });
      }
      url = getGoogleOAuthUrl(state, redirectUri);
    } else if (platformId === "instagram") {
      url = getInstagramOAuthUrl(state, redirectUri);
    } else if (platformId === "facebook") {
      url = getFacebookOAuthUrl(state, redirectUri);
    } else if (platformId === "threads") {
      url = getThreadsOAuthUrl(state, redirectUri);
    } else if (platformId === "x") {
      url = getTwitterOAuthUrl(state, codeChallengeStr!, redirectUri);
    } else if (platformId === "google") {
      url = getGoogleOAuthUrl(state, redirectUri);
    }

    if (!url) return NextResponse.json({ error: "unsupported platform" }, { status: 400 });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Failed to start OAuth flow", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error while starting OAuth connection" }, { status: 500 });
  }
}
