import { getUserConnectionSecrets } from "@/lib/server/connections";

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

    // Try to get a Page token — required for posting to Pages
    try {
      const pagesResponse = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json();
        if (Array.isArray(pagesData.data) && pagesData.data.length > 0) {
          pageToken = pagesData.data[0].access_token || accessToken;
          targetId = pagesData.data[0].id;
        }
      }
    } catch {
      // Fall through to user token on "me"
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

    // ── Image via reliable public URL (not tmpfiles/localhost) ──
    } else if (
      mediaUrl &&
      mediaType === "image" &&
      !mediaUrl.startsWith("data:") &&
      !mediaUrl.includes("tmpfiles.org") &&
      !mediaUrl.includes("localhost") &&
      mediaUrl.startsWith("http")
    ) {
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/photos`;
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: pageToken, url: mediaUrl, caption: text }),
      };

    // ── Video via reliable public URL ──
    } else if (
      mediaUrl &&
      mediaType === "video" &&
      !mediaUrl.includes("tmpfiles.org") &&
      !mediaUrl.includes("localhost") &&
      mediaUrl.startsWith("http")
    ) {
      endpoint = `https://graph.facebook.com/v19.0/${targetId}/videos`;
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: pageToken, file_url: mediaUrl, description: text }),
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
    let mediaEndpoint = `https://graph.instagram.com/v20.0/${targetId}/media`;
    const mediaBody: any = {
      access_token: accessToken,
      caption: text,
    };

    if (mediaType === "video") {
      mediaBody.media_type = "REELS";
      mediaBody.video_url = mediaUrl;
    } else {
      mediaBody.image_url = mediaUrl;
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
      
      const statusRes = await fetch(`https://graph.instagram.com/v20.0/${creationId}?fields=status_code&access_token=${accessToken}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusData.status_code === 'ERROR') {
          return { success: false, error: 'Instagram failed to process the media file.' };
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
