import { adminDb } from "@/lib/server/firebaseAdmin";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROFILE_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_PROFILE_URL = "https://graph.instagram.com/me";
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const FACEBOOK_PROFILE_URL = "https://graph.facebook.com/v19.0/me";
const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_PROFILE_URL = "https://graph.threads.net/v1.0/me";
const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_PROFILE_URL = "https://api.twitter.com/2/users/me";

import crypto from "crypto";

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function getGoogleClientConfig() {
  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  if (clientId.includes("YOUR_GOOGLE") || clientSecret.includes("YOUR_GOOGLE")) {
    throw new Error("Google OAuth is not configured. Set real GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET values in .env.local.");
  }
  return { clientId, clientSecret };
}

export function isGoogleOAuthConfigured() {
  try {
    getGoogleClientConfig();
    return true;
  } catch {
    return false;
  }
}

export function isFacebookOAuthConfigured() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const secret = process.env.FACEBOOK_CLIENT_SECRET;
  return Boolean(clientId && secret && !clientId.includes("YOUR_") && !secret.includes("YOUR_"));
}

export function getMockYouTubeVideos() {
  return {
    videos: [
      {
        id: "mock-video-1",
        title: "Welcome to your connected YouTube channel",
        thumbnailUrl: "https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
        publishedAt: "2026-07-10T10:00:00.000Z",
      },
      {
        id: "mock-video-2",
        title: "Recent upload from your channel",
        thumbnailUrl: "https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg",
        publishedAt: "2026-07-08T10:00:00.000Z",
      },
      {
        id: "mock-video-3",
        title: "Your latest content is now visible here",
        thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
        publishedAt: "2026-07-05T10:00:00.000Z",
      },
    ],
  };
}

export function getMockYouTubeAnalytics() {
  return {
    connected: true,
    period: { startDate: "2026-06-14", endDate: "2026-07-13" },
    totals: {
      views: 18240,
      estimatedMinutesWatched: 9840,
      subscribersGained: 128,
      likes: 942,
    },
    trend: [
      { date: "2026-06-14", views: 520, estimatedMinutesWatched: 310, subscribersGained: 3, likes: 24 },
      { date: "2026-06-15", views: 610, estimatedMinutesWatched: 370, subscribersGained: 5, likes: 31 },
      { date: "2026-06-16", views: 680, estimatedMinutesWatched: 410, subscribersGained: 7, likes: 38 },
      { date: "2026-06-17", views: 760, estimatedMinutesWatched: 440, subscribersGained: 8, likes: 42 },
      { date: "2026-06-18", views: 820, estimatedMinutesWatched: 500, subscribersGained: 9, likes: 47 },
      { date: "2026-06-19", views: 900, estimatedMinutesWatched: 560, subscribersGained: 10, likes: 52 },
      { date: "2026-06-20", views: 980, estimatedMinutesWatched: 600, subscribersGained: 11, likes: 58 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLast30DaysRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

export type OAuthStateRecord = {
  uid: string;
  platform: string;
  createdAt: number;
  codeVerifier?: string;
};

const oauthStateDoc = (state: string) => adminDb.collection("oauthStates").doc(state);
const inMemoryOAuthStates = new Map<string, OAuthStateRecord>();

async function saveOAuthState(state: string, record: OAuthStateRecord) {
  try {
    await oauthStateDoc(state).set(record);
  } catch (error) {
    console.warn("Falling back to in-memory OAuth state storage.", error);
    inMemoryOAuthStates.set(state, record);
  }
}

async function getOAuthState(state: string) {
  try {
    const snapshot = await oauthStateDoc(state).get();
    if (snapshot.exists) {
      return snapshot.data() as OAuthStateRecord;
    }
  } catch (error) {
    console.warn("Unable to read OAuth state from Firestore, checking memory fallback.", error);
  }

  return inMemoryOAuthStates.get(state) ?? null;
}

async function deleteOAuthState(state: string) {
  try {
    await oauthStateDoc(state).delete();
  } catch (error) {
    console.warn("Unable to delete OAuth state from Firestore, clearing memory fallback.", error);
  }
  inMemoryOAuthStates.delete(state);
}

export async function createOAuthState(uid: string, platform: string, codeVerifier?: string) {
  const payload: OAuthStateRecord = {
    uid,
    platform,
    createdAt: Date.now(),
  };
  if (codeVerifier) {
    payload.codeVerifier = codeVerifier;
  }
  const state = Buffer.from(JSON.stringify(payload)).toString("base64url");
  await saveOAuthState(state, payload);
  return state;
}

export async function resolveOAuthState(state: string) {
  if (!state) return null;
  const record = await getOAuthState(state);
  if (record) return record;

  try {
    const decodedStr = Buffer.from(state, "base64url").toString("utf-8");
    const payload = JSON.parse(decodedStr);
    if (payload?.uid && payload?.platform) {
      return payload as OAuthStateRecord;
    }
  } catch {
    // ignore parsing failure
  }

  return null;
}

function cryptoRandom() {
  return [...Array(40)]
    .map(() => Math.random().toString(36)[2])
    .join("");
}

export function getGoogleOAuthUrl(state: string, redirectUri?: string) {
  const { clientId } = getGoogleClientConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri ?? getEnv("GOOGLE_REDIRECT_URI"),
    scope: [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    state,
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri?: string) {
  const { clientId, clientSecret } = getGoogleClientConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri ?? getEnv("GOOGLE_REDIRECT_URI"),
    grant_type: "authorization_code",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function refreshGoogleToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function fetchYouTubeChannel(accessToken: string) {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    mine: "true",
  });
  const res = await fetch(`${YOUTUBE_CHANNELS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube channel lookup failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function fetchYouTubeChannelId(accessToken: string) {
  const params = new URLSearchParams({
    part: "id",
    mine: "true",
  });
  const res = await fetch(`${YOUTUBE_CHANNELS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube channel ID lookup failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return data?.items?.[0]?.id ?? null;
}

export async function fetchYouTubeAnalyticsReport(accessToken: string, refreshToken?: string) {
  const { startDate, endDate } = getLast30DaysRange();
  const url = new URL(YOUTUBE_ANALYTICS_URL);
  url.searchParams.set("ids", "channel==MINE");
  url.searchParams.set("dimensions", "day");
  url.searchParams.set("metrics", "views,estimatedMinutesWatched,subscribersGained,likes");
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  url.searchParams.set("maxResults", "30");

  async function request(token: string) {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshGoogleToken(refreshToken);
      if (refreshed.access_token) {
        return request(refreshed.access_token);
      }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube analytics report failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return normalizeYouTubeAnalytics(data, startDate, endDate);
  }

  return request(accessToken);
}

export async function fetchYouTubeRecentVideos(accessToken: string, refreshToken?: string, maxResults = 50) {
  async function fetchSearchPage(token: string, pageToken?: string) {
    const searchUrl = new URL(YOUTUBE_SEARCH_URL);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("forMine", "true");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("order", "date");
    searchUrl.searchParams.set("maxResults", String(maxResults));
    if (pageToken) searchUrl.searchParams.set("pageToken", pageToken);

    const res = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 && refreshToken && !pageToken) {
      const refreshed = await refreshGoogleToken(refreshToken);
      if (refreshed.access_token) {
        return fetchSearchPage(refreshed.access_token);
      }
    }

    if (!res.ok) {
      return { items: [], nextPageToken: null };
    }

    const data = await res.json();
    return {
      items: Array.isArray(data.items) ? data.items : [],
      nextPageToken: data.nextPageToken || null,
    };
  }

  async function request(token: string) {
    let allSearchItems: any[] = [];
    let pageToken: string | null = null;
    let pageCount = 0;

    do {
      pageCount++;
      const pageResult = await fetchSearchPage(token, pageToken || undefined);
      allSearchItems.push(...pageResult.items);
      pageToken = pageResult.nextPageToken;
    } while (pageToken && pageCount < 5);

    if (allSearchItems.length === 0) {
      return [];
    }

    const rawVideoIds = allSearchItems.map((item: any) => item.id?.videoId || item.id).filter(Boolean);
    const videoIdChunks: string[][] = [];
    for (let i = 0; i < rawVideoIds.length; i += 50) {
      videoIdChunks.push(rawVideoIds.slice(i, i + 50));
    }

    let allDetailItems: any[] = [];
    for (const chunk of videoIdChunks) {
      const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      videosUrl.searchParams.set("part", "snippet,statistics,status");
      videosUrl.searchParams.set("id", chunk.join(","));

      const statsRes = await fetch(videosUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (Array.isArray(statsData.items)) {
          allDetailItems.push(...statsData.items);
        }
      }
    }

    if (allDetailItems.length === 0) {
      return allSearchItems.map((item: any) => ({
        id: item.id?.videoId || item.id,
        title: item.snippet?.title || "YouTube Video",
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
        views: 0,
        likes: 0,
        comments: 0,
        privacyStatus: "public",
      }));
    }

    return allDetailItems
      .filter((item: any) => {
        const privacy = item.status?.privacyStatus;
        return !privacy || privacy === "public";
      })
      .map((item: any) => ({
        id: item.id,
        title: item.snippet?.title || "YouTube Video",
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
        publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
        views: Number(item.statistics?.viewCount || 0),
        likes: Number(item.statistics?.likeCount || 0),
        comments: Number(item.statistics?.commentCount || 0),
        privacyStatus: item.status?.privacyStatus || "public",
      }));
  }

  return request(accessToken);
}

// ─── Twitter / X ────────────────────────────────────────────────────────────

export async function fetchTwitterRecentTweets(accessToken: string, maxResults = 20) {
  // Get the authenticated user's ID first
  const userRes = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) {
    if (userRes.status === 402 || userRes.status === 403 || userRes.status === 429) {
      return [{
        id: "mock-tweet-1",
        text: "X API limit reached (Payment Required). Please upgrade your X Developer account.",
        thumbnailUrl: null,
        publishedAt: new Date().toISOString(),
        likes: 0, retweets: 0, replies: 0, views: 0, quotes: 0,
      }];
    }
    throw new Error(`Twitter user lookup failed (${userRes.status})`);
  }
  const userData = await userRes.json();
  const userId = userData?.data?.id;
  if (!userId) throw new Error("Twitter user ID not found");
  const followerCount = userData?.data?.public_metrics?.followers_count || 0;

  const params = new URLSearchParams({
    max_results: String(Math.min(maxResults, 100)),
    "tweet.fields": "created_at,public_metrics,attachments",
    "media.fields": "preview_image_url,url",
    expansions: "attachments.media_keys",
    exclude: "retweets,replies",
  });

  const tweetsRes = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!tweetsRes.ok) {
    if (tweetsRes.status === 402 || tweetsRes.status === 403 || tweetsRes.status === 429) {
      return [{
        id: "mock-tweet-1",
        text: "X API limit reached (Payment Required). Please upgrade your X Developer account.",
        thumbnailUrl: null,
        publishedAt: new Date().toISOString(),
        likes: 0, retweets: 0, replies: 0, views: 0, quotes: 0,
      }];
    }
    const text = await tweetsRes.text();
    throw new Error(`Twitter tweets fetch failed (${tweetsRes.status}): ${text}`);
  }

  const data = await tweetsRes.json();
  const tweets = Array.isArray(data?.data) ? data.data : [];
  const mediaMap: Record<string, any> = {};
  (data?.includes?.media || []).forEach((m: any) => {
    if (m.media_key) mediaMap[m.media_key] = m;
  });

  return tweets.map((tweet: any) => {
    const metrics = tweet.public_metrics || {};
    const mediaKeys = tweet.attachments?.media_keys || [];
    const firstMedia = mediaKeys[0] ? mediaMap[mediaKeys[0]] : null;
    return {
      id: tweet.id,
      text: tweet.text || "",
      thumbnailUrl: firstMedia?.preview_image_url || firstMedia?.url || null,
      publishedAt: tweet.created_at || new Date().toISOString(),
      likes: Number(metrics.like_count || 0),
      retweets: Number(metrics.retweet_count || 0),
      replies: Number(metrics.reply_count || 0),
      views: Number(metrics.impression_count || 0),
      quotes: Number(metrics.quote_count || 0),
      followerCount,
    };
  });
}

// ─── Instagram ───────────────────────────────────────────────────────────────

export async function fetchInstagramRecentMedia(accountId: string, accessToken: string, limit = 25) {
  let followerCount = 0;
  const targetId = accountId && accountId !== "undefined" ? accountId : "me";

  try {
    const userRes = await fetch(`https://graph.instagram.com/v20.0/${targetId}?fields=followers_count&access_token=${accessToken}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      followerCount = userData?.followers_count || 0;
    }
  } catch (e) {
    console.warn("[Instagram] Follower count fetch notice:", e);
  }

  // Include video_views – available for VIDEO/REELS on Business/Creator accounts
  const fields = "id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink,video_views,children{media_url,thumbnail_url,media_type}";
  const safeLimit = Math.min(limit, 25);

  let allItems: any[] = [];
  let nextUrl: string | null = null;

  // Endpoint strategies to ensure compatibility across Graph API versions and account types
  const candidateEndpoints = [
    `https://graph.instagram.com/v20.0/${targetId}/media?fields=${fields}&limit=${safeLimit}&access_token=${accessToken}`,
    `https://graph.instagram.com/v20.0/me/media?fields=${fields}&limit=${safeLimit}&access_token=${accessToken}`,
    `https://graph.instagram.com/me/media?fields=${fields}&limit=${safeLimit}&access_token=${accessToken}`,
    `https://graph.facebook.com/v20.0/${targetId}/media?fields=${fields}&limit=${safeLimit}&access_token=${accessToken}`,
  ];

  for (const ep of candidateEndpoints) {
    try {
      const firstRes = await fetch(ep);
      if (firstRes.ok) {
        const firstData: any = await firstRes.json();
        if (Array.isArray(firstData?.data)) {
          allItems.push(...firstData.data);
          nextUrl = firstData?.paging?.next || null;
          break;
        }
      }
    } catch (err) {
      console.warn(`[Instagram] Endpoint attempt failed (${ep}):`, err);
    }
  }

  // Page through up to 10 pages to ensure ALL posts are retrieved
  let pageCount = 1;
  while (nextUrl && pageCount < 10) {
    pageCount++;
    try {
      const pageRes: Response = await fetch(nextUrl);
      if (!pageRes.ok) break;
      const pageData: any = await pageRes.json();
      const items = Array.isArray(pageData?.data) ? pageData.data : [];
      allItems.push(...items);
      nextUrl = pageData?.paging?.next || null;
    } catch {
      break;
    }
  }

  // Fetch per-media insights (impressions = views, saved, shares) for Business/Creator accounts
  const insightMap = new Map<string, { impressions: number | null; plays: number | null; reach: number | null; saved: number | null; shares: number | null }>();
  await Promise.allSettled(
    allItems.map(async (item: any) => {
      const mediaType = item.media_type || "IMAGE";
      const isVideo = mediaType === "VIDEO";
      const viewsMetric = isVideo ? "views" : "impressions";
      const metrics = `${viewsMetric},reach,saved,shares`;
      const url = `https://graph.instagram.com/v20.0/${item.id}/insights?metric=${metrics}&access_token=${accessToken}`;

      console.log(`[Instagram Request] Endpoint: ${url}`);
      console.log(`[Instagram Request] Media ID: ${item.id} (${mediaType}), Requested metrics: ${metrics}`);

      try {
        const insightRes = await fetch(url);
        console.log(`[Instagram Request] Media ID: ${item.id} HTTP status: ${insightRes.status}`);
        
        if (insightRes.ok) {
          const insightData = await insightRes.json();
          console.log(`[Instagram Request] Media ID: ${item.id} API response:`, JSON.stringify(insightData));

          const m: Record<string, number> = {};
          if (Array.isArray(insightData?.data)) {
            insightData.data.forEach((entry: any) => {
              const val = entry.values?.[0]?.value ?? entry.value;
              m[entry.name] = typeof val === "number" ? val : 0;
            });
          }
          console.log(`[Instagram Request] Parsed for Media ID: ${item.id} -> views: ${m[viewsMetric]}, shares: ${m.shares}, reach: ${m.reach}, saves: ${m.saved}`);

          insightMap.set(item.id, {
            impressions: m.impressions ?? null,
            plays: m.views ?? null, // Map the fetched 'views' metric to our plays/views storage slot
            reach: m.reach ?? null,
            saved: m.saved ?? null,
            shares: m.shares ?? null,
          });
        } else {
          const errText = await insightRes.text();
          console.warn(`[Instagram API] Failed to fetch insights for media ${item.id} (${mediaType}). Status: ${insightRes.status}. Error:`, errText);
          insightMap.set(item.id, { impressions: null, plays: null, reach: null, saved: null, shares: null });
        }
      } catch (err) {
        console.error(`[Instagram API] Exception during insights fetch for ${item.id}:`, err);
        insightMap.set(item.id, { impressions: null, plays: null, reach: null, saved: null, shares: null });
      }
    })
  );

  return allItems.map((item: any) => {
    let thumbnailUrl = item.thumbnail_url || item.media_url || "";
    if (!thumbnailUrl && item.children?.data?.length > 0) {
      const firstChild = item.children.data[0];
      thumbnailUrl = firstChild.thumbnail_url || firstChild.media_url || "";
    }

    const insight = insightMap.get(item.id);
    // views: video_views for reels/videos; then plays (Reels/Videos from insights); then impressions (Images/Albums from insights); then reach
    const videoViews = typeof item.video_views === "number" ? item.video_views : null;
    const views = videoViews ?? insight?.plays ?? insight?.impressions ?? insight?.reach ?? null;
    const saved = insight?.saved ?? null;
    const shares = insight?.shares ?? null;

    console.log(`[Instagram Request] Media ID: ${item.id} final parsed metrics -> views: ${views}, shares: ${shares}, likes: ${item.like_count}, comments: ${item.comments_count}`);

    return {
      id: item.id,
      caption: item.caption || "",
      mediaType: item.media_type || "IMAGE",
      thumbnailUrl,
      permalink: item.permalink || `https://www.instagram.com/p/${item.id}`,
      publishedAt: item.timestamp || new Date().toISOString(),
      likes: Number(item.like_count || 0),
      comments: Number(item.comments_count || 0),
      views,
      saved,
      shares,
      followerCount,
    };
  });
}

// ─── Facebook ────────────────────────────────────────────────────────────────

export async function fetchFacebookRecentPosts(accessToken: string, limit = 20) {
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}&fields=id,access_token,followers_count,fan_count`
  );
  
  let pages: any[] = [{ id: "me", access_token: accessToken, followers_count: 0, fan_count: 0 }];

  if (pagesRes.ok) {
    const pagesData = await pagesRes.json();
    if (Array.isArray(pagesData?.data) && pagesData.data.length > 0) {
      pages = pagesData.data; // use all pages available
    }
  }

  const allItems: any[] = [];

  for (const page of pages) {
    const fieldsWithInsights = "id,message,story,full_picture,created_time,reactions.summary(total_count),comments.summary(total_count),shares,insights";
    const params = new URLSearchParams({
      fields: fieldsWithInsights,
      limit: String(limit),
      access_token: page.access_token || accessToken,
    });

    let postsRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/posts?${params.toString()}`);
    
    if (!postsRes.ok) {
      const errMsg = await postsRes.text();
      console.warn(`[Facebook API] Failed to fetch posts with insights for page ${page.id}. Status: ${postsRes.status}. Error:`, errMsg);
      
      // Retry without insights to at least fetch the basic posts
      console.log(`[Facebook API] Retrying page ${page.id} posts fetch without insights...`);
      const retryParams = new URLSearchParams({
        fields: "id,message,story,full_picture,created_time,reactions.summary(total_count),comments.summary(total_count),shares",
        limit: String(limit),
        access_token: page.access_token || accessToken,
      });
      postsRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/posts?${retryParams.toString()}`);
    }

    if (postsRes.ok) {
      const data = await postsRes.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const postsWithFollowers = data.data.map((p: any) => ({ ...p, followerCount: page.followers_count || page.fan_count || 0 }));
        allItems.push(...postsWithFollowers);
        continue;
      }
    } else {
      const finalErr = await postsRes.text();
      console.error(`[Facebook API] Direct posts fetch failed completely for page ${page.id}. Status: ${postsRes.status}. Error:`, finalErr);
    }
    
    // Fallback: If posts endpoint fails or is empty, try the feed endpoint
    if (page.id === "me" || page.id === "me/") {
      const feedRes = await fetch(`https://graph.facebook.com/v19.0/me/feed?${params.toString()}`);
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        if (Array.isArray(feedData?.data)) {
          const feedWithFollowers = feedData.data.map((p: any) => ({ ...p, followerCount: page.followers_count || page.fan_count || 0 }));
          allItems.push(...feedWithFollowers);
        }
      } else {
        console.warn(`[Facebook] Failed to fetch personal feed: ${feedRes.status}`);
      }
    }
  }

  return allItems.map((item: any) => {
    let reach: number | null = null;
    let impressions: number | null = null;
    
    console.log(`[Facebook Sync Debug] Raw post:`, JSON.stringify({ id: item.id, message: item.message?.slice(0, 30), insights: item.insights }));

    if (Array.isArray(item.insights?.data)) {
      item.insights.data.forEach((entry: any) => {
        const val = entry.values?.[0]?.value ?? entry.value;
        if (entry.name === "post_impressions_unique") reach = typeof val === "number" ? val : null;
        if (entry.name === "post_impressions") impressions = typeof val === "number" ? val : null;
      });
    }
    const views = impressions ?? reach ?? 0;
    
    console.log(`[Facebook Sync Debug] Parsed post ID: ${item.id} -> views (impressions/reach): ${views}`);

    return {
      id: item.id,
      message: item.message || item.story || "",
      thumbnailUrl: item.full_picture || "",
      publishedAt: item.created_time || new Date().toISOString(),
      likes: Number(item.reactions?.summary?.total_count || 0),
      comments: Number(item.comments?.summary?.total_count || 0),
      shares: Number(item.shares?.count || 0),
      views,
      followerCount: item.followerCount || 0,
    };
  });
}

// ─── LinkedIn ─────────────────────────────────────────────────────────────────

export async function fetchLinkedInRecentPosts(accessToken: string) {
  const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) throw new Error(`LinkedIn profile fetch failed (${profileRes.status})`);
  const profile = await profileRes.json();
  const personId = profile?.sub;
  if (!personId) throw new Error("LinkedIn person ID not found");

  const postsRes = await fetch(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${personId})&count=20`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  if (!postsRes.ok) {
    const text = await postsRes.text();
    throw new Error(`LinkedIn posts fetch failed (${postsRes.status}): ${text}`);
  }
  const data = await postsRes.json();
  const items = Array.isArray(data?.elements) ? data.elements : [];

  return items.map((item: any) => {
    const content = item.specificContent?.["com.linkedin.ugc.ShareContent"];
    const commentary = content?.shareCommentary?.text || "";
    const media = content?.media?.[0];
    const thumbnailUrl = media?.thumbnails?.[0]?.url || media?.originalUrl || "";
    return {
      id: item.id,
      commentary,
      thumbnailUrl,
      publishedAt: item.created?.time
        ? new Date(item.created.time).toISOString()
        : new Date().toISOString(),
      likes: 0,
      comments: 0,
    };
  });
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export async function fetchThreadsRecentPosts(accessToken: string, limit = 20) {
  const userRes = await fetch(`https://graph.threads.net/v1.0/me?fields=followers_count&access_token=${accessToken}`);
  let followerCount = 0;
  if (userRes.ok) {
    const userData = await userRes.json();
    followerCount = userData?.followers_count || 0;
  }

  const params = new URLSearchParams({
    fields: "id,text,media_type,media_url,thumbnail_url,timestamp,shortcode,permalink",
    limit: String(limit),
    access_token: accessToken,
  });

  const res = await fetch(`https://graph.threads.net/v1.0/me/threads?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Threads posts fetch failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const items = Array.isArray(data?.data) ? data.data : [];

  return items.map((item: any) => ({
    id: item.id,
    text: item.text || "",
    mediaType: item.media_type || "TEXT",
    thumbnailUrl: item.thumbnail_url || item.media_url || "",
    permalink: item.permalink || `https://www.threads.net/@user/post/${item.id}`,
    publishedAt: item.timestamp || new Date().toISOString(),
    likes: 0,
    replies: 0,
    followerCount,
  }));
}

function normalizeYouTubeAnalytics(data: any, startDate: string, endDate: string) {
  const rawRows = Array.isArray(data?.rows) ? data.rows : [];
  const trend = rawRows.map((row: any) => {
    const [date, views, estimatedMinutesWatched, subscribersGained, likes] = row;
    return {
      date,
      views: Number(views || 0),
      estimatedMinutesWatched: Number(estimatedMinutesWatched || 0),
      subscribersGained: Number(subscribersGained || 0),
      likes: Number(likes || 0),
    };
  });

  const totals = {
    views: Number(data?.totalsForAllResults?.views || 0),
    estimatedMinutesWatched: Number(data?.totalsForAllResults?.estimatedMinutesWatched || 0),
    subscribersGained: Number(data?.totalsForAllResults?.subscribersGained || 0),
    likes: Number(data?.totalsForAllResults?.likes || 0),
  };

  return {
    connected: true,
    period: { startDate, endDate },
    totals,
    trend,
    generatedAt: new Date().toISOString(),
  };
}

export function getInstagramOAuthUrl(state: string, redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: getEnv("INSTAGRAM_CLIENT_ID"),
    redirect_uri: redirectUri ?? getEnv("INSTAGRAM_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
    response_type: "code",
    force_reauth: "true",
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string, redirectUri?: string) {
  const body = new URLSearchParams({
    client_id: getEnv("INSTAGRAM_CLIENT_ID"),
    client_secret: getEnv("INSTAGRAM_CLIENT_SECRET"),
    redirect_uri: redirectUri ?? getEnv("INSTAGRAM_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    code,
    grant_type: "authorization_code",
  });
  const res = await fetch(INSTAGRAM_TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram token exchange failed (${res.status}): ${text}`);
  }
  const data = await res.json();

  if (data.access_token) {
    const exchangeUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${getEnv("INSTAGRAM_CLIENT_SECRET")}&access_token=${data.access_token}`;
    const exchangeRes = await fetch(exchangeUrl);
    if (exchangeRes.ok) {
      const exchangeData = await exchangeRes.json();
      if (exchangeData.access_token) {
         data.access_token = exchangeData.access_token;
         data.expires_in = exchangeData.expires_in || 5184000;
      }
    }
  }

  return data;
}

export async function fetchInstagramProfile(accessToken: string) {
  const res = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instagram profile fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function getFacebookOAuthUrl(state: string, redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: getEnv("FACEBOOK_CLIENT_ID"),
    redirect_uri: redirectUri ?? getEnv("FACEBOOK_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    scope: "public_profile,pages_show_list,pages_manage_posts,pages_read_engagement",
    response_type: "code",
    state,
  });
  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeFacebookCode(code: string, redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: getEnv("FACEBOOK_CLIENT_ID"),
    client_secret: getEnv("FACEBOOK_CLIENT_SECRET"),
    redirect_uri: redirectUri ?? getEnv("FACEBOOK_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    code,
  });
  const res = await fetch(`${FACEBOOK_TOKEN_URL}?${params.toString()}`);
  return res.json();
}

export async function fetchFacebookProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "id,name,accounts{id,name,access_token}",
    access_token: accessToken,
  });
  const res = await fetch(`${FACEBOOK_PROFILE_URL}?${params.toString()}`);
  return res.json();
}

export function getThreadsOAuthUrl(state: string, redirectUri?: string) {
  const params = new URLSearchParams({
    client_id: getEnv("THREADS_CLIENT_ID"),
    redirect_uri: redirectUri ?? getEnv("THREADS_REDIRECT_URI", "https://localhost:3001/api/connections/oauth-callback"),
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
    state,
  });
  return `${THREADS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeThreadsCode(code: string, redirectUri?: string) {
  const clientId = getEnv("THREADS_CLIENT_ID");
  const clientSecret = getEnv("THREADS_CLIENT_SECRET");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri ?? getEnv("THREADS_REDIRECT_URI", "https://localhost:3001/api/connections/oauth-callback"),
    code,
  });
  const res = await fetch(THREADS_TOKEN_URL, { method: "POST", body });
  const data = await res.json();

  // Exchange for long-lived token
  if (data.access_token) {
    const exchangeRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${clientSecret}&access_token=${data.access_token}`);
    if (exchangeRes.ok) {
      const exchangeData = await exchangeRes.json();
      if (exchangeData.access_token) {
         data.access_token = exchangeData.access_token;
         data.expires_in = exchangeData.expires_in || (60 * 24 * 60 * 60);
      }
    }
  }

  return data;
}

export async function fetchThreadsProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "id,username,name",
    access_token: accessToken,
  });
  const res = await fetch(`${THREADS_PROFILE_URL}?${params.toString()}`);
  return res.json();
}

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function getTwitterOAuthUrl(state: string, codeChallenge: string, redirectUri?: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEnv("TWITTER_CLIENT_ID"),
    redirect_uri: redirectUri ?? getEnv("TWITTER_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${TWITTER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTwitterCode(code: string, codeVerifier: string, redirectUri?: string) {
  const clientId = getEnv("TWITTER_CLIENT_ID");
  const clientSecret = getEnv("TWITTER_CLIENT_SECRET");
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri ?? getEnv("TWITTER_REDIRECT_URI", "http://localhost:3000/api/connections/oauth-callback"),
    code_verifier: codeVerifier,
  });

  const res = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body,
  });
  return res.json();
}

export async function fetchTwitterProfile(accessToken: string) {
  const res = await fetch(TWITTER_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.json();
}
