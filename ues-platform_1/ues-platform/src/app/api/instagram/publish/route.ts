import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { getMetaCompatibleUrl } from "@/lib/server/publishService";
import {
  getUserConnectionSecrets,
  getUserConnections,
  saveCustomUserPost,
} from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid || "demo-user";

    // 2. Parse Request Body
    const body = await request.json();
    let { caption, imageUrl, videoUrl, creationId } = body;

    // 3. Retrieve Tokens and Connection Data
    const secrets = await getUserConnectionSecrets(uid, "instagram");
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    
    const connections = await getUserConnections(uid);
    const instagramConnection = connections.instagram;
    const instagramAccountId = instagramConnection?.accountId;

    if (!accessToken || accessToken === "mock-access-token" || secrets?.mockConnection === true || !instagramAccountId) {
      return NextResponse.json(
        { error: "Instagram account is not connected with a live OAuth token. Please go to Connect -> Connect Instagram to authorize live publishing to your Instagram handle." },
        { status: 400 }
      );
    }

    // ── Check creationId directly (polled from client side to avoid Vercel freezing) ──
    if (creationId) {
      // 1. Try to get status
      const statusRes = await fetch(
        `https://graph.instagram.com/v20.0/${creationId}?fields=status_code,status&access_token=${accessToken}`
      );
      
      if (!statusRes.ok) {
        const errTxt = await statusRes.text();
        return NextResponse.json({ error: `Failed to check Reel status: ${errTxt}` }, { status: 400 });
      }
      
      const statusData = await statusRes.json();
      if (statusData.status_code === "IN_PROGRESS") {
        return NextResponse.json({ success: true, isReady: false, creationId });
      } else if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
        const detailedError = statusData.status || "Instagram failed to process the media file.";
        return NextResponse.json({ error: `Instagram Media Processing Error: ${detailedError}` }, { status: 400 });
      } else if (statusData.status_code === "FINISHED") {
        const publishEndpoint = `https://graph.instagram.com/v20.0/${instagramAccountId}/media_publish`;
        const publishRes = await fetch(publishEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        });

        const publishData = await publishRes.json();

        if (publishRes.ok) {
          const platformPostId = publishData.id;
          const postUrl = `https://instagram.com/p/${platformPostId}`;

          const postObj = {
            id: `ig-live-${platformPostId}`,
            platform: "instagram" as const,
            title: caption || "Instagram Post",
            description: caption || "",
            url: postUrl,
            type: "video" as const,
            status: "active" as const,
            privacyStatus: "public",
            category: "Social",
            thumbnailUrl: imageUrl || "",
            metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
            uesScore: 78,
            publishedAt: new Date().toISOString().slice(0, 10),
            _addedAt: Date.now(),
          };

          return NextResponse.json({
            success: true,
            isReady: true,
            mediaId: platformPostId,
            url: postUrl,
            post: postObj,
          });
        } else {
          const errorMsg = publishData.error?.message || "Failed to publish Reel.";
          return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
      }
    }

    const mediaUrl = imageUrl || videoUrl;
    const mediaType = videoUrl ? "video" : "image";

    if (!mediaUrl) {
      return NextResponse.json(
        { error: "An image or video URL is required to publish to Instagram." },
        { status: 400 }
      );
    }

    if (!mediaUrl.startsWith("https://")) {
      return NextResponse.json(
        { error: "Media URL must be publicly accessible over HTTPS." },
        { status: 400 }
      );
    }

    // 4. Create Media Container (POST /{ig-user-id}/media)
    const mediaEndpoint = `https://graph.instagram.com/v20.0/${instagramAccountId}/media`;
    const mediaBody: any = {
      access_token: accessToken,
      caption: caption || "",
    };

    const finalMediaUrl = await getMetaCompatibleUrl(mediaUrl, mediaType);

    if (mediaType === "video") {
      mediaBody.media_type = "REELS";
      mediaBody.video_url = finalMediaUrl;
    } else {
      mediaBody.image_url = finalMediaUrl;
    }

    const createRes = await fetch(mediaEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mediaBody),
    });

    const createData = await createRes.json();

    if (!createRes.ok) {
      const errorMsg = createData.error?.message || "Failed to create media container.";
      const isAuthError = createRes.status === 401 || createData.error?.code === 190 || createData.error?.type === "OAuthException";
      
      if (isAuthError) {
        return NextResponse.json({
          error: "🔒 Instagram connection expired. Please reconnect your Instagram connection on the Connect page."
        }, { status: 401 });
      }

      return NextResponse.json({
        error: `Instagram API Error: ${errorMsg}`
      }, { status: 400 });
    }

    console.log('createData:', createData);
    creationId = createData.id;
    if (!creationId) throw new Error('creationId is undefined. createData: ' + JSON.stringify(createData));

    // For videos, return immediately. Client-side will poll to complete processing and publish.
    if (mediaType === "video") {
      return NextResponse.json({
        success: true,
        isReady: false,
        creationId,
      });
    }

    // Helper to poll and publish (only used for images since they complete instantly)
    const pollAndPublish = async () => {
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 3;
      const delayMs = 1500;

      while (!isReady && attempts < maxAttempts) {
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        
        // 1. Try to get status
        const statusRes = await fetch(
          `https://graph.instagram.com/v20.0/${creationId}?fields=status_code&access_token=${accessToken}`
        );
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.status_code === "FINISHED") {
            isReady = true;
          } else if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
            throw new Error("Instagram failed to process the media file.");
          }
        } else {
          isReady = true;
        }

        if (isReady) {
          const publishEndpoint = `https://graph.instagram.com/v20.0/${instagramAccountId}/media_publish`;
          const publishRes = await fetch(publishEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: creationId,
              access_token: accessToken,
            }),
          });

          const publishData = await publishRes.json();

          if (publishRes.ok) {
            const platformPostId = publishData.id;
            const postUrl = `https://instagram.com/p/${platformPostId}`;

            const postObj = {
              id: `ig-live-${platformPostId}`,
              platform: "instagram" as const,
              title: caption ? caption.slice(0, 120) : "Instagram Post",
              description: caption || "",
              url: postUrl,
              type: "photo" as const,
              status: "active" as const,
              privacyStatus: "public",
              category: "Social",
              thumbnailUrl: mediaUrl,
              metrics: { likes: 0, comments: 0, shares: 0, views: 0, saves: 0, followerCount: 0 },
              uesScore: 78,
              publishedAt: new Date().toISOString().slice(0, 10),
              _addedAt: Date.now(),
            };

            return { platformPostId, postUrl, postObj };
          } else {
            const errorMsg = publishData.error?.message || "";
            if (errorMsg.includes("Media ID is not available") || errorMsg.includes("not ready")) {
              isReady = false;
            } else {
              throw new Error(errorMsg || "Failed to publish media to Instagram.");
            }
          }
        }
        attempts++;
      }
      throw new Error("Instagram is taking too long to process the media (Timeout).");
    };

    // For images, process synchronously
    const { platformPostId, postUrl, postObj } = await pollAndPublish();

    return NextResponse.json({
      success: true,
      message: "✓ Successfully published to Instagram!",
      mediaId: platformPostId,
      url: postUrl,
      post: postObj,
    });

  } catch (error: any) {
    console.error("Error in /api/instagram/publish:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred while publishing to Instagram." },
      { status: 500 }
    );
  }
}
