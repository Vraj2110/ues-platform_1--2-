import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const targetUrl = new URL("/api/connections/oauth-callback", request.url);
  const searchParams = new URL(request.url).searchParams;

  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  return NextResponse.redirect(targetUrl);
}
