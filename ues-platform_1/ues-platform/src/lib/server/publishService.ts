import { getUserConnectionSecrets } from "@/lib/server/connections";

export async function getMetaCompatibleUrl(mediaUrl: string, mediaType: "image" | "video"): Promise<string> {
  if (!mediaUrl || !mediaUrl.includes("tmpfiles.org")) {
    return mediaUrl;
  }

  console.log(`[Meta URL Helper] Processing tmpfiles.org URL for Meta: ${mediaUrl}`);
  try {
    let actualDownloadUrl = mediaUrl;
    if (!actualDownloadUrl.includes("tmpfiles.org/dl/")) {
      actualDownloadUrl = actualDownloadUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
    }

    // 1. Fetch the viewer HTML to extract the real direct download link
    const viewerUrl = actualDownloadUrl.replace('/dl/', '/');
    const viewerRes = await fetch(viewerUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });

    if (viewerRes.ok) {
      const html = await viewerRes.text();
      const match = html.match(/href="(https:\/\/tmpfiles\.org\/dl\/[^"]+)"/);
      if (match && match[1]) {
        actualDownloadUrl = match[1];
        console.log("[Meta URL Helper] Extracted true download URL:", actualDownloadUrl);
      }
    }

    // 2. Fetch the file buffer
    const fileRes = await fetch(actualDownloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (!fileRes.ok) {
      throw new Error(`Failed to download file from tmpfiles: ${fileRes.statusText}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fileRes.headers.get("content-type") || (mediaType === "video" ? "video/mp4" : "image/jpeg");
    const extension = mediaType === "video" ? "mp4" : "jpg";
    const filename = `rehosted_${Date.now()}.${extension}`;

    // 3. Try Firebase Storage if configured
    const { adminStorage, isFirebaseAdminConfigured } = require("@/lib/server/firebaseAdmin");
    if (isFirebaseAdminConfigured) {
      try {
        console.log("[Meta URL Helper] Re-hosting tmpfiles.org media to Firebase Storage...");
        const bucket = adminStorage.bucket();
        const firebaseFilename = `posts/${filename}`;
        const fileRef = bucket.file(firebaseFilename);

        await fileRef.save(buffer, {
          metadata: { contentType },
        });

        let publicUrl = `https://storage.googleapis.com/${bucket.name}/${firebaseFilename}`;
        try {
          await fileRef.makePublic();
        } catch {
          const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          publicUrl = signedUrl;
        }
        console.log("[Meta URL Helper] Successfully re-hosted to Firebase:", publicUrl);
        return publicUrl;
      } catch (fbErr) {
        console.warn("[Meta URL Helper] Firebase re-hosting failed, falling back to Litterbox:", fbErr);
      }
    }

    // 4. Fallback: Upload to Litterbox server-side (no CORS issue)
    console.log("[Meta URL Helper] Re-hosting tmpfiles.org media to Litterbox...");
    const uploadForm = new FormData();
    uploadForm.append("reqtype", "fileupload");
    uploadForm.append("time", "1h");
    uploadForm.append("fileToUpload", new Blob([buffer], { type: contentType }), filename);

    const response = await fetch("https://litterbox.catbox.moe/resources/api.php", {
      method: "POST",
      body: uploadForm,
    });

    if (!response.ok) {
      throw new Error(`Litterbox upload failed with status ${response.status}`);
    }

    const fileUrl = (await response.text()).trim();
    if (!fileUrl.startsWith("https://")) {
      throw new Error(`Litterbox returned invalid response: ${fileUrl}`);
    }

    console.log("[Meta URL Helper] Successfully re-hosted to Litterbox:", fileUrl);
    return fileUrl;
  } catch (err: any) {
    console.error("[Meta URL Helper] Error re-hosting media:", err);
    return mediaUrl;
  }
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
  rateLimited?: boolean;
  tokenRefreshed?: boolean;
}

export async function refreshTwitterToken(refreshToken: string): Promise<{access_token: string, refresh_token: string} | null> {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID || '';
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.warn('Failed to refresh Twitter token', await response.text());
      return null;
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  } catch (error) {
    console.warn('Error refreshing Twitter token:', error);
    return null;
  }
}

export async function refreshThreadsToken(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${accessToken}`, {
      method: 'GET',
    });

    if (!response.ok) {
      console.warn('Failed to refresh Threads token', await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.warn('Error refreshing Threads token:', error);
    return null;
  }
}

export async function publishToTwitter(accessToken: string, text: string, refreshToken?: string): Promise<PublishResult> {
  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ text: text.slice(0, 280) }),
    });

    if (response.status === 401 && refreshToken) {
      const newTokens = await refreshTwitterToken(refreshToken);
      if (newTokens) {
        const retryResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${newTokens.access_token}`
          },
          body: JSON.stringify({ text: text.slice(0, 280) }),
        });
        
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          return {
            success: true,
            platformPostId: retryData.data?.id,
            url: `https://x.com/i/web/status/${retryData.data?.id}`,
            tokenRefreshed: true
          };
        }

        if (retryResponse.status === 403) {
          return {
            success: false,
            error: "X (Twitter) API Error: Forbidden (403). Ensure your X Developer App has 'Read and Write' permissions enabled under User Authentication settings, and reconnect your account.",
            tokenRefreshed: true
          };
        }

        if (retryResponse.status === 429) {
          return { success: false, error: 'X API Rate limited. Please try again later.', rateLimited: true, tokenRefreshed: true };
        }

        const retryError = await retryResponse.json().catch(() => null);
        return { success: false, error: retryError?.detail || retryError?.error_description || 'Failed to publish to X/Twitter after refresh', tokenRefreshed: true };
      }
    }

    if (response.status === 429) {
      return { success: false, error: 'X API Rate limited. Please try again later.', rateLimited: true };
    }

    if (!response.ok) {
      if (response.status === 403) {
        return {
          success: false,
          error: "X (Twitter) API Error: Forbidden (403). Ensure your X Developer App has 'Read and Write' permissions enabled under User Authentication settings, and reconnect your account.",
        };
      }
      const errorData = await response.json().catch(() => null);
      return { success: false, error: errorData?.detail || errorData?.error_description || 'Failed to publish to X/Twitter' };
    }

    const data = await response.json();
    return {
      success: true,
      platformPostId: data.data?.id,
      url: `https://x.com/i/web/status/${data.data?.id}`,
    };
  } catch (error: any) {
    console.warn('Error publishing to Twitter:', error);
    return { success: false, error: error.message || 'Unknown error occurred while publishing to Twitter' };
  }
}

export async function publishToFacebook(
  accessToken: string,
  text: string,
  mediaUrl?: string,
  mediaType?: "image" | "video",
  rawFileBuffer?: Buffer,
  rawFileName?: string,
  rawFileMime?: string,
): Promise<PublishResult> {
  try {
    let pageToken = accessToken;
    let targetId = "me";

    let finalMediaUrl = mediaUrl;
    if (finalMediaUrl) {
      finalMediaUrl = await getMetaCompatibleUrl(finalMediaUrl, mediaType || "image");
    }

    // Try to get a Page token — required for posting to Pages
    let hasPages = false;
    try {
      const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        if (Array.isArray(pagesData.data) && pagesData.data.length > 0) {
          pageToken = pagesData.data[0].access_token || accessToken;
          targetId = pagesData.data[0].id;
          hasPages = true;
        }
      } else {
        const txt = await pagesResponse.text();
        console.warn(`[Facebook API] Failed to fetch accounts list: ${txt}. Using direct fallback token.`);
      }
    } catch (err: any) {
      console.warn("Facebook Connection error, using direct fallback token:", err);
    }

    if (!hasPages) {
      // Fallback: If no pages are found, assume the token is already a Page Access Token and target is /me
      console.log("[Facebook API] No connected pages resolved. Falling back to direct /me token publishing.");
      pageToken = accessToken;
      targetId = "me";
    }

    let endpoint: string;
    let requestOptions: RequestInit;

    // ── Image upload: raw binary takes priority (no CDN needed) ──
    if (rawFileBuffer && rawFileMime && !rawFileMime.startsWith("video/")) {
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/photos`;
      const formData = new FormData();
      formData.append("access_token", pageToken);
      formData.append("caption", text);
      formData.append("source", new Blob([new Uint8Array(rawFileBuffer)], { type: rawFileMime }), rawFileName || "photo.jpg");
      requestOptions = { method: "POST", body: formData };

    // ── Video upload: raw binary ──
    } else if (rawFileBuffer && rawFileMime && rawFileMime.startsWith("video/")) {
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/videos`;
      const formData = new FormData();
      formData.append("access_token", pageToken);
      formData.append("description", text);
      formData.append("source", new Blob([new Uint8Array(rawFileBuffer)], { type: rawFileMime }), rawFileName || "video.mp4");
      requestOptions = { method: "POST", body: formData };

    // ── Image via reliable public URL ──
    } else if (
      finalMediaUrl &&
      mediaType === "image" &&
      !finalMediaUrl.startsWith("data:") &&
      !finalMediaUrl.includes("localhost") &&
      finalMediaUrl.startsWith("http")
    ) {
      const urlParams = new URLSearchParams({
        access_token: pageToken,
        url: finalMediaUrl,
        caption: text,
        published: "true"
      });
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/photos?${urlParams.toString()}`;
      requestOptions = {
        method: "POST"
      };

    // ── Video via reliable public URL ──
    } else if (
      finalMediaUrl &&
      mediaType === "video" &&
      !finalMediaUrl.includes("localhost") &&
      finalMediaUrl.startsWith("http")
    ) {
      const urlParams = new URLSearchParams({
        access_token: pageToken,
        file_url: finalMediaUrl,
        description: text,
        published: "true"
      });
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/videos?${urlParams.toString()}`;
      requestOptions = {
        method: "POST"
      };


    // ── Text-only post (fallback) ──
    } else {
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/feed`;
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: pageToken, message: text }),
      };
    }

    const response = await fetch(endpoint, requestOptions);
    const data = await response.json();

    if (response.status === 401 || (data.error?.type === "OAuthException" && data.error?.code === 190)) {
      return { success: false, error: "Facebook token expired. Please reconnect your Facebook account." };
    }
    if (response.status === 429 || data.error?.code === 17) {
      return { success: false, error: "Facebook rate limit reached.", rateLimited: true };
    }
    if (data.error?.code === 100 || data.error?.code === 200) {
      return { success: false, error: `Facebook API error: ${data.error.message || "Invalid parameter"}. Ensure your Facebook app has "pages_manage_posts" permission and you are a Page admin.` };
    }
    if (!response.ok) {
      // If we failed to publish with media (e.g. due to blocked URL/crawler error),
      // we attempt a resilient fallback to a text-only feed post so the text is at least uploaded!
      if (finalMediaUrl) {
        console.warn("Facebook media publishing failed. Falling back to text-only feed post...");
        const fallbackEndpoint = `https://graph.facebook.com/v19.0/${targetId}/feed`;
        const fallbackText = `${text}\n\n[Media Link: ${finalMediaUrl}]`;
        try {
          const fallbackRes = await fetch(fallbackEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: pageToken, message: fallbackText }),
          });
          const fallbackData = await fallbackRes.json();
          if (fallbackRes.ok) {
            const finalPostId = fallbackData.id && String(fallbackData.id).includes("_") ? String(fallbackData.id) : `${targetId}_${fallbackData.id}`;
            return {
              success: true,
              platformPostId: finalPostId,
              url: `https://facebook.com/${finalPostId}`,
            };
          }
        } catch (fallbackErr) {
          console.error("Facebook fallback posting failed:", fallbackErr);
        }
      }
      return { success: false, error: data.error?.message || "Failed to publish to Facebook" };
    }

    const finalPostId = data.id && String(data.id).includes("_") ? String(data.id) : `${targetId}_${data.id}`;
    return {
      success: true,
      platformPostId: finalPostId,
      url: `https://facebook.com/${finalPostId}`,
    };
  } catch (error: any) {
    console.warn("Error publishing to Facebook:", error);
    return { success: false, error: error.message || "Unknown error occurred while publishing to Facebook" };
  }
}


export async function publishToInstagram(accessToken: string, targetId: string, text: string, mediaUrl: string, mediaType: "image" | "video"): Promise<PublishResult> {
  try {
    const finalMediaUrl = await getMetaCompatibleUrl(mediaUrl, mediaType);

    let mediaEndpoint = `https://graph.instagram.com/v20.0/${targetId}/media`;
    const mediaBody: any = {
      access_token: accessToken,
      caption: text,
    };

    if (mediaType === "video") {
      mediaBody.media_type = "REELS";
      mediaBody.video_url = finalMediaUrl;
    } else {
      mediaBody.image_url = finalMediaUrl;
    }

    const createResponse = await fetch(mediaEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mediaBody),
    });

    const createData = await createResponse.json();

    if (createResponse.status === 401) {
      return { success: false, error: 'Instagram token expired. Please reconnect your Instagram account.' };
    }

    if (!createResponse.ok) {
      return { success: false, error: createData.error?.message || 'Failed to upload media to Instagram' };
    }

    const creationId = createData.id;

    // Poll the container status (instant for images, waits exactly as needed for videos)
    let isReady = false;
    let attempts = 0;
    const maxAttempts = mediaType === "video" ? 15 : 3;
    const delay = mediaType === "video" ? 3000 : 1000;

    while (!isReady && attempts < maxAttempts) {
      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const statusRes = await fetch(`https://graph.instagram.com/v20.0/${creationId}?fields=status_code,status&access_token=${accessToken}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusData.status_code === 'ERROR') {
          const errMsg = statusData.status || 'Instagram failed to process the media file.';
          return { success: false, error: `Instagram Error: ${errMsg}` };
        }
      }
      attempts++;
    }

    if (!isReady) {
      return { success: false, error: 'Instagram is taking too long to process the media. Please try again later.' };
    }

    const publishEndpoint = `https://graph.instagram.com/v20.0/${targetId}/media_publish`;
    const publishResponse = await fetch(publishEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      return { success: false, error: publishData.error?.message || 'Failed to publish media to Instagram' };
    }

    let livePermalink = `https://www.instagram.com/p/${publishData.id}`;
    try {
      const permalinkRes = await fetch(`https://graph.instagram.com/v20.0/${publishData.id}?fields=permalink&access_token=${accessToken}`);
      if (permalinkRes.ok) {
        const permData = await permalinkRes.json();
        if (permData.permalink) {
          livePermalink = permData.permalink;
        }
      }
    } catch {}

    return {
      success: true,
      platformPostId: publishData.id,
      url: livePermalink,
    };
  } catch (error: any) {
    console.warn('Error publishing to Instagram:', error);
    return { success: false, error: error.message || 'Unknown error occurred while publishing to Instagram' };
  }
}

export async function publishToThreads(accessToken: string, userId: string, text: string, imageUrl?: string): Promise<PublishResult> {
  try {
    const createBody: any = {
      access_token: accessToken,
      text: text,
      media_type: imageUrl ? 'IMAGE' : 'TEXT'
    };
    
    if (imageUrl) {
      createBody.image_url = imageUrl;
    }

    const createResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createBody),
    });

    const createData = await createResponse.json();

    if (createResponse.status === 429) {
      return { success: false, error: 'Threads rate limit (max 50 posts/24h).', rateLimited: true };
    }

    if (!createResponse.ok) {
      return { success: false, error: createData.error?.message || 'Failed to create Threads container' };
    }

    const containerId = createData.id;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const publishResponse = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok) {
      return { success: false, error: publishData.error?.message || 'Failed to publish Threads container' };
    }

    return {
      success: true,
      platformPostId: publishData.id,
      url: `https://www.threads.net/@user/post/${publishData.id}`,
    };

  } catch (error: any) {
    console.warn('Error publishing to Threads:', error);
    return { success: false, error: error.message || 'Unknown error occurred while publishing to Threads' };
  }
}

export async function getValidToken(uid: string, platformId: string): Promise<{accessToken: string, refreshToken?: string, refreshed: boolean}> {
  try {
    const secrets = await getUserConnectionSecrets(uid, platformId);
    const accessToken = typeof secrets?.accessToken === "string" ? secrets.accessToken : "";
    const refreshToken = typeof secrets?.refreshToken === "string" ? secrets.refreshToken : undefined;

    if (!accessToken || accessToken === "" || accessToken === "mock_token") {
      return { accessToken: "", refreshed: false };
    }

    return {
      accessToken,
      refreshToken,
      refreshed: false
    };
  } catch (error: any) {
    console.warn(`Error getting valid token for ${platformId}:`, error);
    return { accessToken: "", refreshed: false };
  }
}
