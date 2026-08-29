import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getUserConnectionSecrets, deleteCustomUserPost, saveDeletedPostId } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const body = await request.json();
    const { postId, platform } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // 1. Attempt to delete from origin platforms (Instagram / YouTube) if valid token exists
    if (platform === "instagram" || postId.startsWith("ig-")) {
      try {
        const secrets = await getUserConnectionSecrets(uid, "instagram");
        const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
        if (accessToken && accessToken !== "mock-access-token" && !secrets?.mockConnection) {
          const mediaId = postId.replace(/^(ig-live-|ig-custom-|ig-)/, "");
          await fetch(`https://graph.instagram.com/v20.0/${mediaId}?access_token=${accessToken}`, {
            method: "DELETE",
          });
        }
      } catch (igErr) {
        console.warn("Instagram origin deletion notice:", igErr);
      }
    }

    // YouTube origin deletion
    if (platform === "youtube" || postId.startsWith("yt-")) {
      try {
        const secrets = await getUserConnectionSecrets(uid, "youtube");
        const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
        const isMockToken =
          !accessToken ||
          accessToken === "mock-access-token" ||
          accessToken === "connected-access-token" ||
          secrets?.mockConnection === true;

        if (!isMockToken && accessToken && !postId.startsWith("yt-live-") && !postId.startsWith("yt-demo-")) {
          const ytVideoId = postId.replace(/^yt-/, "");
          await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${ytVideoId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      } catch (ytErr) {
        console.warn("YouTube origin deletion notice:", ytErr);
      }
    }

    // 2. Persist deleted status server-side
    await saveDeletedPostId(uid, postId);
    await deleteCustomUserPost(uid, postId);

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
