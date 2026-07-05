import { adminDb } from "@/lib/server/firebaseAdmin";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROFILE_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";
const INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://graph.instagram.com/oauth/access_token";
const INSTAGRAM_PROFILE_URL = "https://graph.instagram.com/me";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
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

export async function createOAuthState(uid: string, platform: string) {
  const state = cryptoRandom();
  await saveOAuthState(state, {
    uid,
    platform,
    createdAt: Date.now(),
  });
  return state;
}

export async function resolveOAuthState(state: string) {
  const record = await getOAuthState(state);
  if (!record) return null;

  const age = Date.now() - record.createdAt;
  if (age > 1000 * 60 * 15) {
    await deleteOAuthState(state);
    return null;
  }

  await deleteOAuthState(state);
  return record;
}

function cryptoRandom() {
  return [...Array(40)]
    .map(() => Math.random().toString(36)[2])
    .join("");
}

export function getGoogleOAuthUrl(state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
    scope: [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ].join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    state,
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({
    code,
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: getEnv("GOOGLE_REDIRECT_URI"),
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

export async function fetchYouTubeRecentVideos(accessToken: string, refreshToken?: string, maxResults = 8) {
  const url = new URL(YOUTUBE_SEARCH_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("forMine", "true");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(maxResults));

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
      throw new Error(`YouTube recent videos fetch failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
      publishedAt: item.snippet.publishedAt,
    }));
  }

  return request(accessToken);
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

export function getInstagramOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getEnv("INSTAGRAM_CLIENT_ID"),
    redirect_uri: getEnv("INSTAGRAM_REDIRECT_URI"),
    scope: "user_profile,user_media",
    response_type: "code",
    state,
  });
  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

export async function exchangeInstagramCode(code: string) {
  const body = new URLSearchParams({
    client_id: getEnv("INSTAGRAM_CLIENT_ID"),
    client_secret: getEnv("INSTAGRAM_CLIENT_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: getEnv("INSTAGRAM_REDIRECT_URI"),
    code,
  });
  const res = await fetch(INSTAGRAM_TOKEN_URL, { method: "POST", body });
  return res.json();
}

export async function fetchInstagramProfile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "id,username,account_type",
    access_token: accessToken,
  });
  const res = await fetch(`${INSTAGRAM_PROFILE_URL}?${params.toString()}`);
  return res.json();
}
