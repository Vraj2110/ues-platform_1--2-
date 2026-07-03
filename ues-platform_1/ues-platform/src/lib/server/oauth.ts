import { adminDb } from "@/lib/server/firebaseAdmin";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROFILE_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://graph.instagram.com/oauth/access_token";
const INSTAGRAM_PROFILE_URL = "https://graph.instagram.com/me";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export type OAuthStateRecord = {
  uid: string;
  platform: string;
  createdAt: number;
};

const oauthStateDoc = (state: string) => adminDb.collection("oauthStates").doc(state);

export async function createOAuthState(uid: string, platform: string) {
  const state = cryptoRandom();
  await oauthStateDoc(state).set({
    uid,
    platform,
    createdAt: Date.now(),
  });
  return state;
}

export async function resolveOAuthState(state: string) {
  const snapshot = await oauthStateDoc(state).get();
  if (!snapshot.exists) return null;
  const record = snapshot.data() as OAuthStateRecord;
  const age = Date.now() - record.createdAt;
  if (age > 1000 * 60 * 15) {
    await oauthStateDoc(state).delete();
    return null;
  }
  await oauthStateDoc(state).delete();
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
  const data = await response.json();
  return data;
}

export async function refreshGoogleToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", body });
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
  const data = await res.json();
  return data;
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
