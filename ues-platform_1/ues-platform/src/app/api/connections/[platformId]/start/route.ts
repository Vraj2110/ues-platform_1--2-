import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { createOAuthState, getGoogleOAuthUrl, getInstagramOAuthUrl } from "@/lib/server/oauth";

export async function GET(request: Request, { params }: { params: { platformId: string } }) {
  const decoded = await verifyIdToken(request);
  if (!decoded?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (decoded as any).uid as string;
  const { platformId } = params;
  const state = await createOAuthState(uid, platformId);

  let url: string | null = null;
  if (platformId === "youtube") {
    url = getGoogleOAuthUrl(state);
  } else if (platformId === "instagram") {
    url = getInstagramOAuthUrl(state);
  } else if (platformId === "google") {
    url = getGoogleOAuthUrl(state);
  }

  if (!url) return NextResponse.json({ error: "unsupported platform" }, { status: 400 });
  return NextResponse.redirect(url);
}
