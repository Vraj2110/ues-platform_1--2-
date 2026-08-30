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
  deletedPosts?: Record<string, string[]>;
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
        deletedPosts: parsed.deletedPosts || {},
      };
    }
  } catch (err) {
    console.warn("Could not load connection store file:", err);
  }
  return { connections: {}, secrets: {}, analytics: {}, customPosts: {}, deletedPosts: {} };
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

export let firestoreError: string | null = null;

export async function getUserConnections(uid: string): Promise<Record<string, PlatformConnection>> {
  let fileConns = { ...getMemoryConnections(uid) };

  if (Object.keys(fileConns).length === 0) {
    const allUsers = Object.keys(memoryStore.connections);
    for (const u of allUsers) {
      if (Object.keys(memoryStore.connections[u]).length > 0) {
        fileConns = { ...memoryStore.connections[u] };
        break;
      }
    }
  }

  if (uid !== "demo-user" && isFirebaseAdminConfigured) {
    try {
      const snapshot = await adminDb.collection("users").doc(uid).collection("platformConnections").get();
      const result: Record<string, PlatformConnection> = {};
      snapshot.docs.forEach((doc: any) => {
        result[doc.id] = doc.data() as PlatformConnection;
      });
      return { ...fileConns, ...result };
    } catch (error: any) {
      firestoreError = error?.message || String(error);
      return fileConns;
    }
  }

  return fileConns;
}

export async function setUserConnection(
  uid: string,
  platformId: string,
  connection: PlatformConnection
) {
  const memoryConns = getMemoryConnections(uid);
  memoryConns[platformId] = connection;
  if (uid !== "demo-user") {
    const demoConns = getMemoryConnections("demo-user");
    demoConns[platformId] = connection;
  }
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
  let fileSecrets = getMemorySecrets(uid)[platformId] ?? null;

  if (!fileSecrets) {
    const allUsers = Object.keys(memoryStore.secrets);
    for (const u of allUsers) {
      if (memoryStore.secrets[u]?.[platformId]) {
        fileSecrets = memoryStore.secrets[u][platformId];
        break;
      }
    }
  }

  if (uid !== "demo-user" && isFirebaseAdminConfigured) {
    try {
      const snapshot = await userConnectionSecretsDoc(uid, platformId).get();
      const data = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
      if (data && typeof data.accessToken === "string" && data.accessToken) {
        return data;
      }
    } catch (error) {
      console.warn("Falling back to persistent connection secrets:", error);
    }
  }

  return fileSecrets;
}

export async function setUserConnectionSecrets(
  uid: string,
  platformId: string,
  secrets: Record<string, unknown>
) {
  const memorySecs = getMemorySecrets(uid);
  memorySecs[platformId] = secrets;
  if (uid !== "demo-user") {
    const demoSecs = getMemorySecrets("demo-user");
    demoSecs[platformId] = secrets;
  }
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

export async function saveCustomUserPost(uid: string, post: any) {
  if (!memoryStore.customPosts) {
    memoryStore.customPosts = {};
  }
  if (!memoryStore.customPosts[uid]) {
    memoryStore.customPosts[uid] = [];
  }
  memoryStore.customPosts[uid] = memoryStore.customPosts[uid].filter((p: any) => p.id !== post.id);
  memoryStore.customPosts[uid].unshift(post);

  if (uid && uid !== "demo-user") {
    if (!memoryStore.customPosts["demo-user"]) {
      memoryStore.customPosts["demo-user"] = [];
    }
    memoryStore.customPosts["demo-user"] = memoryStore.customPosts["demo-user"].filter((p: any) => p.id !== post.id);
    memoryStore.customPosts["demo-user"].unshift(post);
  }

  saveStore(memoryStore);

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      await adminDb.collection("users").doc(uid).collection("posts").doc(post.id).set(post, { merge: true });
    } catch (error) {
      console.warn("Firestore custom post save warning:", error);
    }
  }
}

export async function deleteCustomUserPost(uid: string, postId: string) {
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

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      await adminDb.collection("users").doc(uid).collection("posts").doc(postId).delete();
    } catch (error) {
      console.warn("Firestore custom post delete warning:", error);
    }
  }
}

export async function syncCustomPostsWithLiveOrigin(uid: string, platformId: string, liveIds: string[]) {
  if (memoryStore.customPosts) {
    const liveSet = new Set((liveIds || []).map((id) => String(id)));
    const targetPlatform = platformId === "twitter" ? "x" : platformId;
    const store = memoryStore.customPosts;

    Object.keys(store).forEach((u) => {
      if (Array.isArray(store[u])) {
        store[u] = store[u].filter((post: any) => {
          const postPlat = post.platform === "twitter" ? "x" : post.platform;
          if (postPlat === targetPlatform) {
            const rawId = String(post.platformPostId || post.id || "").replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, "");
            if (post.id.includes("processing")) return true;
            const isLive = post.id.includes("-live-") || !!post.platformPostId;
            if (!isLive && post._addedAt) return true;
            return liveSet.has(String(post.id)) || liveSet.has(String(post.platformPostId)) || liveSet.has(rawId);
          }
          return true;
        });
      }
    });
    saveStore(memoryStore);
  }

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      const liveSet = new Set((liveIds || []).map((id) => String(id)));
      const targetPlatform = platformId === "twitter" ? "x" : platformId;

      const snapshot = await adminDb.collection("users").doc(uid).collection("posts").get();
      const deletePromises = snapshot.docs.map(async (doc: any) => {
        const post = doc.data();
        const postPlat = post.platform === "twitter" ? "x" : post.platform;
        if (postPlat === targetPlatform) {
          const rawId = String(post.platformPostId || post.id || "").replace(/^(ig-live-|yt-live-|x-live-|fb-live-|li-live-|th-live-|ig-|yt-|x-|fb-|li-|th-)/, "");
          if (post.id.includes("processing")) return;
          const isLive = post.id.includes("-live-") || !!post.platformPostId;
          if (!isLive && post._addedAt) return;

          const keep = liveSet.has(String(post.id)) || liveSet.has(String(post.platformPostId)) || liveSet.has(rawId);
          if (!keep) {
            console.log(`[Firestore Sync] Deleting post ${doc.id} (not found in live feed)`);
            await doc.ref.delete();
          }
        }
      });
      await Promise.all(deletePromises);
    } catch (err) {
      console.warn("Failed to sync Firestore custom posts with live origin:", err);
    }
  }
}

export async function updateCustomPostThumbnail(uid: string, videoId: string, thumbnailUrl: string) {
  if (memoryStore.customPosts?.[uid]) {
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].map((post: any) => {
      if (post.id === videoId || post.videoId === videoId || post.id === `yt-${videoId}` || videoId.endsWith(post.id) || post.id.endsWith(videoId)) {
        return { ...post, thumbnailUrl };
      }
      return post;
    });
    saveStore(memoryStore);
  }

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      const postsRef = adminDb.collection("users").doc(uid).collection("posts");
      const snapshot = await postsRef.get();
      const updatePromises = snapshot.docs.map(async (doc: any) => {
        const post = doc.data();
        if (post.id === videoId || post.videoId === videoId || post.id === `yt-${videoId}` || videoId.endsWith(post.id) || post.id.endsWith(videoId)) {
          await doc.ref.update({ thumbnailUrl });
        }
      });
      await Promise.all(updatePromises);
    } catch (err) {
      console.warn("Failed to update post thumbnail in Firestore:", err);
    }
  }
}

export async function updateCustomPostId(uid: string, oldId: string, newId: string) {
  if (memoryStore.customPosts?.[uid]) {
    memoryStore.customPosts[uid] = memoryStore.customPosts[uid].map((post: any) => {
      if (post.id === oldId) {
        return { ...post, id: newId, url: `https://www.youtube.com/watch?v=${newId}` };
      }
      return post;
    });
    saveStore(memoryStore);
  }

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      const postsRef = adminDb.collection("users").doc(uid).collection("posts");
      const oldDoc = await postsRef.doc(oldId).get();
      if (oldDoc.exists) {
        const data = oldDoc.data();
        await postsRef.doc(newId).set({
          ...data,
          id: newId,
          url: `https://www.youtube.com/watch?v=${newId}`,
        });
        await postsRef.doc(oldId).delete();
      }
    } catch (err) {
      console.warn("Failed to update post ID in Firestore:", err);
    }
  }
}

export async function getCustomUserPosts(uid: string): Promise<any[]> {
  const userPosts = memoryStore.customPosts?.[uid] || [];
  const demoPosts = memoryStore.customPosts?.["demo-user"] || [];
  let combined = [...userPosts, ...demoPosts];

  if (combined.length === 0 && memoryStore.customPosts) {
    const allUsers = Object.keys(memoryStore.customPosts);
    for (const u of allUsers) {
      if (Array.isArray(memoryStore.customPosts[u]) && memoryStore.customPosts[u].length > 0) {
        combined = memoryStore.customPosts[u];
        break;
      }
    }
  }

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      const snapshot = await adminDb.collection("users").doc(uid).collection("posts").get();
      const firestorePosts = snapshot.docs.map((doc: any) => doc.data());
      const postMap = new Map<string, any>();
      combined.forEach((p) => postMap.set(p.id, p));
      firestorePosts.forEach((p: any) => postMap.set(p.id, p));
      return Array.from(postMap.values());
    } catch (error) {
      console.warn("Falling back to memory for custom posts read:", error);
    }
  }

  const postMap = new Map<string, any>();
  combined.forEach((p) => postMap.set(p.id, p));
  return Array.from(postMap.values());
}

export async function saveDeletedPostId(uid: string, postId: string) {
  if (!memoryStore.deletedPosts) {
    memoryStore.deletedPosts = {};
  }
  if (!memoryStore.deletedPosts[uid]) {
    memoryStore.deletedPosts[uid] = [];
  }
  if (!memoryStore.deletedPosts[uid].includes(postId)) {
    memoryStore.deletedPosts[uid].push(postId);
  }
  if (uid !== "demo-user") {
    if (!memoryStore.deletedPosts["demo-user"]) {
      memoryStore.deletedPosts["demo-user"] = [];
    }
    if (!memoryStore.deletedPosts["demo-user"].includes(postId)) {
      memoryStore.deletedPosts["demo-user"].push(postId);
    }
  }
  saveStore(memoryStore);

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      await adminDb.collection("users").doc(uid).collection("deletedPosts").doc(postId).set({
        postId,
        deletedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn("Firestore deleted post save warning:", error);
    }
  }
}

export async function getDeletedPostIds(uid: string): Promise<Set<string>> {
  const userDeleted = memoryStore.deletedPosts?.[uid] || [];
  const demoDeleted = memoryStore.deletedPosts?.["demo-user"] || [];
  const combined = new Set([...userDeleted, ...demoDeleted]);

  if (isFirebaseAdminConfigured && uid !== "demo-user") {
    try {
      const snapshot = await adminDb.collection("users").doc(uid).collection("deletedPosts").get();
      snapshot.docs.forEach((doc: any) => {
        combined.add(doc.id);
      });
    } catch (error) {
      console.warn("Firestore deleted posts read warning:", error);
    }
  }

  return combined;
}

export async function getAllUserIds(): Promise<string[]> {
  const userIds = new Set<string>();

  // 1. Get from memory store
  if (memoryStore.connections) {
    Object.keys(memoryStore.connections).forEach((uid) => {
      if (uid !== "demo-user") {
        userIds.add(uid);
      }
    });
  }

  // 2. Get from Firestore
  if (isFirebaseAdminConfigured) {
    try {
      const snapshot = await adminDb.collection("users").get();
      snapshot.docs.forEach((doc: any) => {
        if (doc.id !== "demo-user") {
          userIds.add(doc.id);
        }
      });
    } catch (error) {
      console.warn("Error listing users from Firestore:", error);
    }
  }

  return Array.from(userIds);
}

