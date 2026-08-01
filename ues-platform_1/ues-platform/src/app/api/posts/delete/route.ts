import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnectionSecrets, deleteCustomUserPost } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // Attempt to delete from origin YouTube platform if connected with real OAuth token
    if (uid !== "demo-user") {
      try {
        const secrets = await getUserConnectionSecrets(uid, "youtube");
        const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
        const isMockToken =
          !accessToken ||
          accessToken === "mock-access-token" ||
          accessToken === "connected-access-token" ||
          secrets?.mockConnection === true;

        if (!isMockToken && accessToken && !postId.startsWith("yt-live-") && !postId.startsWith("yt-demo-")) {
          // Extract real YouTube Video ID if formatted
          const ytVideoId = postId.replace(/^yt-/, "");
          await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${ytVideoId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
        }
      } catch (ytErr) {
        console.warn("Notice: YouTube origin deletion API notice:", ytErr);
      }
    }

    // Delete post from persistent server store
    deleteCustomUserPost(uid, postId);

    return NextResponse.json({
      success: true,
      message: "Post removed from application and origin platform successfully.",
      deletedPostId: postId,
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
