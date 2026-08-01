import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import {
  getUserConnectionSecrets,
  setUserConnectionSecrets,
  updateCustomPostThumbnail,
} from "@/lib/server/connections";
import { refreshGoogleToken } from "@/lib/server/oauth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const body = await request.json();
    const { videoId, thumbnail } = body;

    if (!videoId || !thumbnail) {
      return NextResponse.json({ error: "Missing videoId or thumbnail" }, { status: 400 });
    }

    // Always update thumbnail in server application memory store first
    updateCustomPostThumbnail(uid, videoId, thumbnail);

    if (uid !== "demo-user") {
      // Retrieve user's stored YouTube OAuth secrets
      const secrets = await getUserConnectionSecrets(uid, "youtube");
      let accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const refreshToken = typeof secrets?.refreshToken === "string" ? secrets.refreshToken : undefined;
      const isMockToken =
        !accessToken ||
        accessToken === "mock-access-token" ||
        accessToken === "connected-access-token" ||
        secrets?.mockConnection === true;

      if (!isMockToken && accessToken) {
        // Strip yt- prefix if internal post id
        const cleanVideoId = videoId.replace(/^yt-/, "");

        // Process base64 data URL to Buffer
        let imageBuffer: Buffer | null = null;
        let contentType = "image/jpeg";

        if (typeof thumbnail === "string" && thumbnail.startsWith("data:")) {
          const matches = thumbnail.match(/^data:(image\/\w+);base64,(.+)$/);
          if (matches) {
            contentType = matches[1] === "image/png" ? "image/png" : "image/jpeg";
            imageBuffer = Buffer.from(matches[2], "base64");
          }
        } else if (typeof thumbnail === "string" && thumbnail.startsWith("http")) {
          // If thumbnail is an image URL, fetch binary bytes
          try {
            const imgRes = await fetch(thumbnail);
            if (imgRes.ok) {
              const arrayBuf = await imgRes.arrayBuffer();
              imageBuffer = Buffer.from(arrayBuf);
              contentType = imgRes.headers.get("content-type") || "image/jpeg";
            }
          } catch {}
        }

        if (imageBuffer) {
          const blob = new Blob([new Uint8Array(imageBuffer)], { type: contentType });

          async function uploadThumbnail(token: string, retries = 3): Promise<Response> {
            const res = await fetch(
              `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${cleanVideoId}&uploadType=media`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: blob,
              }
            );

            if (res.status >= 500 && retries > 0) {
              console.warn(`YouTube API 500 error. Retrying... (${retries} left)`);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return uploadThumbnail(token, retries - 1);
            }
            return res;
          }

          let ytRes = await uploadThumbnail(accessToken);

          // If token expired, attempt refresh
          if (ytRes.status === 401 && refreshToken) {
            try {
              const refreshed = await refreshGoogleToken(refreshToken);
              if (refreshed.access_token) {
                accessToken = refreshed.access_token;
                await setUserConnectionSecrets(uid, "youtube", {
                  ...secrets,
                  accessToken,
                });
                ytRes = await uploadThumbnail(accessToken);
              }
            } catch (refErr) {
              console.warn("Token refresh failed during thumbnail upload:", refErr);
            }
          }

          if (!ytRes.ok) {
            const errText = await ytRes.text();
            console.warn("YouTube API Thumbnail Upload Warning:", ytRes.status, errText);
            return NextResponse.json(
              { error: `YouTube API rejected thumbnail: ${errText}` },
              { status: ytRes.status }
            );
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thumbnail uploaded and saved successfully.",
      videoId,
      thumbnailUrl: thumbnail,
    });
  } catch (error) {
    console.error("Error setting YouTube thumbnail:", error);
    return NextResponse.json({ error: "Failed to upload thumbnail" }, { status: 500 });
  }
}
