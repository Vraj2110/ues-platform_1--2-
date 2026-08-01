import fs from "fs";
import path from "path";
import { adminDb, isFirebaseAdminConfigured } from "@/lib/server/firebaseAdmin";
import type { PlatformConnection } from "@/types";

const STORE_PATH = path.join(process.cwd(), ".connections_store.json");

interface ConnectionStore {
  connections: Record<string, Record<string, PlatformConnection>>;
  secrets: Record<string, Record<string, Record<string, unknown>>>;
  analytics: Record<string, Record<string, unknown>>;
  customPosts?: Record<string, any[]>;
}

function loadStore(): ConnectionStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      return {
        connections: parsed.connections || {},
        secrets: parsed.secrets || {},
        analytics: parsed.analytics || {},
        customPosts: parsed.customPosts || {},
      };
    }
  } catch (err) {
    console.warn("Could not load connection store file:", err);
  }
  return { connections: {}, secrets: {}, analytics: {}, customPosts: {} };
}

function saveStore(store: ConnectionStore) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not write connection store file:", err);
  }
}

const memoryStore = loadStore();

const userConnectionDoc = (uid: string, platformId: string) =>
  adminDb.collection("users").doc(uid).collection("platformConnections").doc(platformId);

const userConnectionSecretsDoc = (uid: string, platformId: string) =>
  adminDb.collection("users").doc(uid).collection("platformConnectionSecrets").doc(platformId);

const userYouTubeAnalyticsDoc = (uid: string) =>
  adminDb.collection("users").doc(uid).collection("analytics").doc("youtube");

function getMemoryConnections(uid: string) {
  if (!memoryStore.connections[uid]) {
    memoryStore.connections[uid] = {};
  }
  return memoryStore.connections[uid];
}

function getMemorySecrets(uid: string) {
  if (!memoryStore.secrets[uid]) {
    memoryStore.secrets[uid] = {};
  }
  return memoryStore.secrets[uid];
}

export async function getUserConnections(uid: string): Promise<Record<string, PlatformConnection>> {
  if (!isFirebaseAdminConfigured) {
    return { ...getMemoryConnections(uid) };
  }

  try {
    const snapshot = await adminDb.collection("users").doc(uid).collection("platformConnections").get();
    const result: Record<string, PlatformConnection> = {};
    snapshot.docs.forEach((doc: any) => {
      result[doc.id] = doc.data() as PlatformConnection;
    });
    // Merge with persistent file store
    const fileConns = getMemoryConnections(uid);
    return { ...fileConns, ...result };
  } catch (error) {
    console.warn("Falling back to persistent connection storage:", error);
    return { ...getMemoryConnections(uid) };
  }
}

export async function setUserConnection(
  uid: string,
  platformId: string,
  connection: PlatformConnection
) {
  const memoryConns = getMemoryConnections(uid);
  memoryConns[platformId] = connection;
  saveStore(memoryStore);

  if (!isFirebaseAdminConfigured) {
    return;
  }

  try {
    await userConnectionDoc(uid, platformId).set(connection, { merge: true });
  } catch (error) {
    console.warn("Falling back to persistent store for connection write:", error);
  }
}

export async function getUserConnectionSecrets(uid: string, platformId: string) {
  const fileSecrets = getMemorySecrets(uid)[platformId] ?? null;

  if (!isFirebaseAdminConfigured) {
    return fileSecrets;
  }

  try {
    const snapshot = await userConnectionSecretsDoc(uid, platformId).get();
    return snapshot.exists ? (snapshot.data() as Record<string, unknown>) : fileSecrets;
  } catch (error) {
    console.warn("Falling back to persistent connection secrets:", error);
    return fileSecrets;
  }
}

export async function setUserConnectionSecrets(
  uid: string,
  platformId: string,
  secrets: Record<string, unknown>
) {
  const memorySecs = getMemorySecrets(uid);
  memorySecs[platformId] = secrets;
  saveStore(memoryStore);

  if (!isFirebaseAdminConfigured) {
    return;
  }

  try {
    await userConnectionSecretsDoc(uid, platformId).set(secrets, { merge: true });
  } catch (error) {
    console.warn("Falling back to persistent store for secret write:", error);
  }
}

export async function setUserYoutubeAnalytics(uid: string, analytics: Record<string, unknown>) {
  memoryStore.analytics[uid] = analytics;
  saveStore(memoryStore);

  if (!isFirebaseAdminConfigured) {
    return;
  }

  try {
    await userYouTubeAnalyticsDoc(uid).set(analytics, { merge: true });
  } catch (error) {
    console.warn("Falling back to persistent store for YouTube analytics write:", error);
  }
}

export async function getUserYoutubeAnalytics(uid: string) {
  const fileAnalytics = memoryStore.analytics[uid] ?? null;

  if (!isFirebaseAdminConfigured) {
    return fileAnalytics;
  }

  try {
    const snapshot = await userYouTubeAnalyticsDoc(uid).get();
    return snapshot.exists ? (snapshot.data() as Record<string, unknown>) : fileAnalytics;
  } catch (error) {
    console.warn("Falling back to persistent store for YouTube analytics read:", error);
    return fileAnalytics;
  }
}

export async function clearUserConnection(uid: string, platformId: string) {
  const memoryConnections = getMemoryConnections(uid);
  delete memoryConnections[platformId];
  const memorySecrets = getMemorySecrets(uid);
  delete memorySecrets[platformId];
  delete memoryStore.analytics[uid];
  saveStore(memoryStore);

  if (!isFirebaseAdminConfigured) {
    return;
  }

  try {
    await setUserConnection(uid, platformId, {
      platformId: platformId as any,
      connected: false,
    });
    await userConnectionSecretsDoc(uid, platformId).delete();
  } catch (error) {
    console.warn("Falling back to persistent store for connection clear:", error);
  }
}

export function saveCustomUserPost(uid: string, post: any) {
  if (!memoryStore.customPosts) {
    memoryStore.customPosts = {};
  }
  if (!memoryStore.customPosts[uid]) {
    memoryStore.customPosts[uid] = [];
  }
  memoryStore.customPosts[uid] = memoryStore.customPosts[uid].filter((p: any) => p.id !== post.id);
  memoryStore.customPosts[uid].unshift(post);

  // Also store under demo-user if uid is different so unauthenticated sessions see it
  if (uid && uid !== "demo-user") {
    if (!memoryStore.customPosts["demo-user"]) {
      memoryStore.customPosts["demo-user"] = [];
    }
    memoryStore.customPosts["demo-user"] = memoryStore.customPosts["demo-user"].filter((p: any) => p.id !== post.id);
    memoryStore.customPosts["demo-user"].unshift(post);
  }

  saveStore(memoryStore);
}

export function deleteCustomUserPost(uid: string, postId: string) {
  if (memoryStore.customPosts?.[uid]) {
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].filter(
      (p: any) => p.id !== postId && p.videoId !== postId
    );
  }
  if (memoryStore.customPosts?.["demo-user"]) {
    memoryStore.customPosts["demo-user"] = memoryStore.customPosts["demo-user"].filter(
      (p: any) => p.id !== postId && p.videoId !== postId
    );
  }
  saveStore(memoryStore);
}

export function syncCustomPostsWithLiveOrigin(uid: string, liveVideoIds: string[]) {
  if (memoryStore.customPosts?.[uid] && Array.isArray(liveVideoIds)) {
    const liveSet = new Set(liveVideoIds);
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].filter((post: any) => {
      if (post.platform === "youtube" && post.id && post.id.startsWith("yt-") === false) {
        return liveSet.has(post.id);
      }
      return true;
    });
    saveStore(memoryStore);
  }
}

export function updateCustomPostThumbnail(uid: string, videoId: string, thumbnailUrl: string) {
  if (memoryStore.customPosts?.[uid]) {
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].map((post: any) => {
      if (post.id === videoId || post.videoId === videoId || post.id === `yt-${videoId}` || videoId.endsWith(post.id) || post.id.endsWith(videoId)) {
        return { ...post, thumbnailUrl };
      }
      return post;
    });
    saveStore(memoryStore);
  }
}

export function updateCustomPostId(uid: string, oldId: string, newId: string) {
  if (memoryStore.customPosts?.[uid]) {
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].map((post: any) => {
      if (post.id === oldId) {
        return { ...post, id: newId, url: `https://www.youtube.com/watch?v=${newId}` };
      }
      return post;
    });
    saveStore(memoryStore);
  }
}

export function getCustomUserPosts(uid: string): any[] {
  const userPosts = memoryStore.customPosts?.[uid] || [];
  const demoPosts = memoryStore.customPosts?.["demo-user"] || [];

  if (uid === "demo-user") return demoPosts;

  // Combine user posts and demo posts, deduplicating by id
  const postMap = new Map<string, any>();
  demoPosts.forEach((p) => postMap.set(p.id, p));
  userPosts.forEach((p) => postMap.set(p.id, p));
  return Array.from(postMap.values());
}
