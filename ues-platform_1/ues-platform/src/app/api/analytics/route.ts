import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnections, getCustomUserPosts } from "@/lib/server/connections";
import { AnalyticsService } from "@/lib/server/analyticsService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    let uid = "demo-user";
    try {
      const decoded = await verifyIdToken(request);
      if (decoded?.uid) {
        uid = decoded.uid as string;
      }
    } catch {
      // Fallback to demo-user if auth headers are absent/invalid
    }

    const { searchParams } = new URL(request.url);
    const daysFilter = Number(searchParams.get("days") || "30");

    const connections = await getUserConnections(uid);
    const allPosts = await getCustomUserPosts(uid);

    const now = new Date();
    const currentCutoff = new Date(now.getTime() - daysFilter * 24 * 60 * 60 * 1000);
    const previousCutoff = new Date(now.getTime() - 2 * daysFilter * 24 * 60 * 60 * 1000);

    const currentPosts = allPosts.filter((p) => {
      const pDate = new Date(p.publishedAt);
      return pDate >= currentCutoff;
    });

    const previousPosts = allPosts.filter((p) => {
      const pDate = new Date(p.publishedAt);
      return pDate >= previousCutoff && pDate < currentCutoff;
    });

    const payload = AnalyticsService.getAnalytics(currentPosts, previousPosts, connections, daysFilter, allPosts);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("[Analytics API] Error calculating analytics:", error);
    return NextResponse.json({ error: error.message || "Failed to calculate analytics" }, { status: 500 });
  }
}
