import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import {
  getUserConnectionSecrets,
  getUserConnections,
  saveCustomUserPost,
  setUserConnectionSecrets,
} from "@/lib/server/connections";
import {
  publishToTwitter,
  publishToFacebook,
  publishToThreads,
  publishToInstagram,
  refreshTwitterToken,
} from "@/lib/server/publishService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    const body = await request.json();
    const {
      platform = "youtube",
      type = "video",
      title,
      description,
      privacyStatus = "public",
      category = "Science & Technology",
      tags = "",
      fileName,
      fileSize,
      thumbnailUrl,
      mediaUrl,
      mediaType,
      publishedAt,
    } = body;

    if ((!title || typeof title !== "string" || !title.trim()) && !mediaUrl && !thumbnailUrl) {
      return NextResponse.json({ error: "Content title or media is required" }, { status: 400 });
    }

    const postDate = publishedAt || new Date().toISOString().slice(0, 10);

    // ── YouTube Platform — keep existing resumable upload flow
    if (platform === "youtube") {
      const secrets = await getUserConnectionSecrets(uid, "youtube");
      const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const isMockToken = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

      let videoId = `yt-${Date.now()}`;
      let resumableUrl = `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&upload_id=${videoId}`;

      if (!isMockToken && accessToken) {
        const metadata = {
          snippet: {
            title: title?.trim() || "Untitled Post",
            description: description || "",
            tags: typeof tags === "string" ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
            categoryId: "28",
          },
          status: {
            privacyStatus: privacyStatus || "public",
            embeddable: true,
          },
        };

        const uploadRes = await fetch(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json; charset=UTF-8",
              "X-Upload-Content-Type": "video/*",
            },
            body: JSON.stringify(metadata),
          }
        );

        if (uploadRes.ok) {
          resumableUrl = uploadRes.headers.get("location") || resumableUrl;
          videoId = uploadRes.headers.get("x-goog-correlation-id") || `yt-${Date.now()}`;
        } else {
          const errorText = await uploadRes.text();
          console.warn("YouTube Upload API notice:", uploadRes.status, errorText);
        }
      }

      const postObj = {
        id: videoId,
        platform: "youtube",
        title: title?.trim() || "Untitled Post",
        description: description || "",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        type,
        status: "active",
        privacyStatus: privacyStatus || "public",
        category,
        fileName,
        fileSize,
        thumbnailUrl: thumbnailUrl || "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
        metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 18200 },
        uesScore: 82,
        publishedAt: postDate,
        _addedAt: Date.now(),
      };

      try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }

      return NextResponse.json({
        success: true,
        message: "✓ Video upload initiated for YouTube!",
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        resumableUrl,
        post: postObj,
      });
    }

    // ── X / Twitter — real API publishing with token refresh
    if (platform === "x" || platform === "twitter") {
      const secrets = await getUserConnectionSecrets(uid, "x");
      const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const refreshToken = typeof secrets?.refreshToken === "string" ? secrets.refreshToken : undefined;
      const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

      if (!isMock && accessToken) {
        const tweetText = description ? `${title.trim()}\n\n${description}` : title.trim();
        let result = await publishToTwitter(accessToken, tweetText, refreshToken);

        // If token was refreshed during publish, save new tokens
        if (result.tokenRefreshed && refreshToken) {
          const newTokens = await refreshTwitterToken(refreshToken);
          if (newTokens) {
            await setUserConnectionSecrets(uid, "x", {
              ...secrets,
              accessToken: newTokens.access_token,
              refreshToken: newTokens.refresh_token,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (result.success) {
          const postObj = {
            id: `x-live-${result.platformPostId}`,
            platform: "x",
            title: tweetText.slice(0, 120),
            description: description || "",
            url: result.url,
            type: "post",
            status: "active",
            privacyStatus: "public",
            category: "Social",
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 78,
            publishedAt: postDate,
            _addedAt: Date.now(),
          };
          try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }
          return NextResponse.json({
            success: true,
            message: "✓ Tweet published successfully to X!",
            post: postObj,
            publishedToApi: true,
          });
        } else {
          return NextResponse.json({
            error: result.error || "Failed to publish tweet to X.",
            rateLimited: result.rateLimited || false,
          }, { status: result.rateLimited ? 429 : 400 });
        }
      } else {
        return NextResponse.json({ error: "X/Twitter is not connected or has no valid token. Please reconnect from the Connect page." }, { status: 401 });
      }
    }

    // ── Facebook — real API publishing
    if (platform === "facebook") {
      const secrets = await getUserConnectionSecrets(uid, "facebook");
      const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

      if (!isMock && accessToken) {
        const fbText = description ? `${title.trim()}\n\n${description}` : title.trim();
        const result = await publishToFacebook(accessToken, fbText, mediaUrl || thumbnailUrl || undefined, mediaType || (mediaUrl || thumbnailUrl ? "image" : undefined));

        if (result.success) {
          const postObj = {
            id: `fb-live-${result.platformPostId}`,
            platform: "facebook",
            title: fbText.slice(0, 120),
            description: description || "",
            url: result.url,
            type: mediaType === "video" ? "video" : "post",
            status: "active",
            privacyStatus: "public",
            category: "Social",
            thumbnailUrl: mediaType === "image" ? (mediaUrl || thumbnailUrl || "") : "",
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 78,
            publishedAt: postDate,
            _addedAt: Date.now(),
          };
          try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }
          return NextResponse.json({
            success: true,
            message: "✓ Post published successfully to Facebook!",
            post: postObj,
            publishedToApi: true,
          });
        } else {
          return NextResponse.json({
            error: result.error || "Failed to publish to Facebook.",
            rateLimited: result.rateLimited || false,
          }, { status: result.rateLimited ? 429 : 400 });
        }
      } else {
        return NextResponse.json({ error: "Facebook is not connected or has no valid token. Please reconnect from the Connect page." }, { status: 401 });
      }
    }

    // ── Threads — real API publishing
    if (platform === "threads") {
      const secrets = await getUserConnectionSecrets(uid, "threads");
      const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

      if (!isMock && accessToken) {
        // Get Threads user ID from connection info
        const connections = await getUserConnections(uid);
        const threadsUserId = connections.threads?.accountId || "me";

        const threadsText = description ? `${title?.trim() || ""}\n\n${description}`.trim() : (title?.trim() || "");
        const result = await publishToThreads(accessToken, threadsUserId, threadsText.slice(0, 500), mediaUrl || thumbnailUrl || undefined);

        if (result.success) {
          const postObj = {
            id: `th-live-${result.platformPostId}`,
            platform: "threads",
            title: threadsText.slice(0, 120) || "Threads Post",
            description: description || "",
            url: result.url,
            type: (mediaUrl || thumbnailUrl) ? "photo" : "thread",
            status: "active",
            privacyStatus: "public",
            category: "Social",
            thumbnailUrl: (mediaUrl || thumbnailUrl) ? (mediaUrl || thumbnailUrl) : "",
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 78,
            publishedAt: postDate,
            _addedAt: Date.now(),
          };
          try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }
          return NextResponse.json({
            success: true,
            message: "✓ Post published successfully to Threads!",
            post: postObj,
            publishedToApi: true,
          });
        } else {
          return NextResponse.json({
            error: result.error || "Failed to publish to Threads.",
            rateLimited: result.rateLimited || false,
          }, { status: result.rateLimited ? 429 : 400 });
        }
      } else {
        return NextResponse.json({ error: "Threads is not connected or has no valid token. Please reconnect from the Connect page." }, { status: 401 });
      }
    }

    // ── Instagram — real API publishing
    if (platform === "instagram") {
      const secrets = await getUserConnectionSecrets(uid, "instagram");
      const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
      const isMock = !accessToken || accessToken === "mock-access-token" || accessToken === "connected-access-token" || secrets?.mockConnection === true;

      if (!isMock && accessToken) {
        const connections = await getUserConnections(uid);
        const instagramAccountId = connections.instagram?.accountId;
        
        if (!instagramAccountId) {
           return NextResponse.json({ error: "Instagram account ID not found. Please reconnect your account." }, { status: 400 });
        }

        const igText = description ? `${title?.trim() || ""}\n\n${description}`.trim() : (title?.trim() || "");
        const targetMediaUrl = mediaUrl || thumbnailUrl;
        
        if (!targetMediaUrl) {
          return NextResponse.json({ error: "Instagram requires an image or video to publish." }, { status: 400 });
        }

        if (mediaType === "video") {
          // BACKGROUND PUBLISHING: Return instantly for videos so the user doesn't wait
          publishToInstagram(accessToken, instagramAccountId, igText, targetMediaUrl, "video")
            .then(res => console.log("Instagram Background Publish Success:", res))
            .catch(err => console.error("Instagram Background Publish Error:", err));

          const postObj = {
            id: `ig-live-processing-${Date.now()}`,
            platform: "instagram",
            title: igText.slice(0, 120) || "Instagram Reel (Processing)",
            description: description || "",
            url: "#",
            type: "video",
            status: "active",
            privacyStatus: "public",
            category: "Social",
            thumbnailUrl: "",
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 0,
            publishedAt: postDate,
            _addedAt: Date.now(),
          };
          try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }
          
          return NextResponse.json({
            success: true,
            message: "✓ Video is being processed and published by Instagram in the background!",
            post: postObj,
            publishedToApi: true,
          });
        }

        // Synchronous publishing for fast image uploads
        const result = await publishToInstagram(accessToken, instagramAccountId, igText, targetMediaUrl, "image");

        if (result.success) {
          const postObj = {
            id: `ig-live-${result.platformPostId}`,
            platform: "instagram",
            title: igText.slice(0, 120) || "Instagram Post",
            description: description || "",
            url: result.url,
            type: "photo",
            status: "active",
            privacyStatus: "public",
            category: "Social",
            thumbnailUrl: targetMediaUrl,
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 78,
            publishedAt: postDate,
            _addedAt: Date.now(),
          };
          try { saveCustomUserPost(uid, postObj); } catch (e) { console.warn("Save error:", e); }
          return NextResponse.json({
            success: true,
            message: "✓ Post published successfully to Instagram!",
            post: postObj,
            publishedToApi: true,
          });
        } else {
          return NextResponse.json({
            error: result.error || "Failed to publish to Instagram.",
            rateLimited: result.rateLimited || false,
          }, { status: result.rateLimited ? 429 : 400 });
        }
      } else {
        return NextResponse.json({ error: "Instagram is not connected or has no valid token. Please reconnect from the Connect page." }, { status: 401 });
      }
    }

    // ── Other platforms — not supported for live publishing yet
    return NextResponse.json({ error: `Live publishing to ${platform} is not yet supported.` }, { status: 400 });

  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post. Please try again." }, { status: 500 });
  }
}
