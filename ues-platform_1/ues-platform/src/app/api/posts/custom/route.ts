import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getCustomUserPosts } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";
    const customPosts = await getCustomUserPosts(uid);
    return NextResponse.json({ posts: customPosts });
  } catch (error) {
    console.error("Error fetching custom posts:", error);
    return NextResponse.json({ posts: [] });
  }
}
