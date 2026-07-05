import { adminDb } from "@/lib/server/firebaseAdmin";
import type { PlatformConnection } from "@/types";

const userConnectionDoc = (uid: string, platformId: string) =>
  adminDb.collection("users").doc(uid).collection("platformConnections").doc(platformId);

const userConnectionSecretsDoc = (uid: string, platformId: string) =>
  adminDb.collection("users").doc(uid).collection("platformConnectionSecrets").doc(platformId);

const userYouTubeAnalyticsDoc = (uid: string) =>
  adminDb.collection("users").doc(uid).collection("analytics").doc("youtube");

export async function getUserConnections(uid: string): Promise<Record<string, PlatformConnection>> {
  const snapshot = await adminDb.collection("users").doc(uid).collection("platformConnections").get();
  const result: Record<string, PlatformConnection> = {};
  snapshot.docs.forEach((doc: any) => {
    result[doc.id] = doc.data() as PlatformConnection;
  });
  
  return result;
}

export async function setUserConnection(
  uid: string,
  platformId: string,
  connection: PlatformConnection
) {
  await userConnectionDoc(uid, platformId).set(connection, { merge: true });
}

export async function getUserConnectionSecrets(uid: string, platformId: string) {
  const snapshot = await userConnectionSecretsDoc(uid, platformId).get();
  return snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
}

export async function setUserConnectionSecrets(
  uid: string,
  platformId: string,
  secrets: Record<string, unknown>
) {
  await userConnectionSecretsDoc(uid, platformId).set(secrets, { merge: true });
}

export async function setUserYoutubeAnalytics(uid: string, analytics: Record<string, unknown>) {
  await userYouTubeAnalyticsDoc(uid).set(analytics, { merge: true });
}

export async function getUserYoutubeAnalytics(uid: string) {
  const snapshot = await userYouTubeAnalyticsDoc(uid).get();
  return snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
}

export async function clearUserConnection(uid: string, platformId: string) {
  await setUserConnection(uid, platformId, {
    platformId: platformId as any,
    connected: false,
  });
  await userConnectionSecretsDoc(uid, platformId).delete();
}
