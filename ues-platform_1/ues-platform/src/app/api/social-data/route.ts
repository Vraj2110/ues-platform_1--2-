import { NextResponse } from "next/server";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";

// We mark this API route as dynamic since it depends on the incoming request's query parameters.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "Missing 'uid' query parameter" }, { status: 400 });
    }

    let posts: any[] = [];

    if (isFirebaseAdminConfigured) {
      // Retrieve the user's posts from Firestore
      const snapshot = await adminDb
        .collection("users")
        .doc(uid)
        .collection("posts")
        .orderBy("publishedAt", "desc")
        .limit(50)
        .get();

      posts = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } else {
      return NextResponse.json(
        { error: "Firebase Admin is not configured" },
        { status: 500 }
      );
    }

    // Set Edge Caching headers:
    // - s-maxage=3600: Cache response at the Edge (CDN) for up to 1 hour (3600s).
    // - stale-while-revalidate=60: If a request comes in within 60s after expiration, serve stale data immediately,
    //   and asynchronously re-execute this serverless function in the background to update the cache.
    return NextResponse.json(
      { posts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
          "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
          "Vercel-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("[Social Data API] Error fetching posts:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch social media data" },
      { status: 500 }
    );
  }
}
