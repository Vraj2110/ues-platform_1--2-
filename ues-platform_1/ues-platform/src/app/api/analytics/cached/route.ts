import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getCustomUserPosts } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const [connections, customPosts] = await Promise.all([
      getUserConnections(uid),
      getCustomUserPosts(uid),
    ]);

    const activeConns = Object.entries(connections).map(([platformId, conn]) => ({
      ...conn,
      platformId,
    }));

    const response = NextResponse.json({
      connections: activeConns,
      posts: customPosts,
      totalPosts: customPosts.length,
      cachedAt: new Date().toISOString(),
    });

    // Vercel Edge Network Cache-Control Headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=60"
    );
    response.headers.set(
      "CDN-Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=60"
    );
    response.headers.set(
      "Vercel-CDN-Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=60"
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to load cached analytics", details: error.message },
      { status: 500 }
    );
  }
}
