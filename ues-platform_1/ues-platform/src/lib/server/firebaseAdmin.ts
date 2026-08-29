import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

function normalizeEnv(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const withoutDouble = trimmed.match(/^"([\s\S]*)"$/);
  if (withoutDouble) return withoutDouble[1];
  const withoutSingle = trimmed.match(/^'([\s\S]*)'$/);
  if (withoutSingle) return withoutSingle[1];
  return trimmed;
}

const projectId = normalizeEnv(process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.FIREBASE_PROJECT_ID);
const clientEmail = normalizeEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL ?? process.env.FIREBASE_CLIENT_EMAIL);
const privateKeyRaw = normalizeEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? process.env.FIREBASE_PRIVATE_KEY);
const privateKey = privateKeyRaw?.replace(/\\n/g, "\n");

function missingError() {
  return new Error(
    "Missing Firebase Admin credentials in environment variables. Set FIREBASE_ADMIN_PROJECT_ID/FIREBASE_ADMIN_CLIENT_EMAIL/FIREBASE_ADMIN_PRIVATE_KEY or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
  );
}

export let firebaseInitError: string | null = null;

let app: admin.app.App | null = null;
if (projectId && clientEmail && privateKey) {
  try {
    app = !getApps().length
      ? admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        })
      : admin.app();
  } catch (error: any) {
    firebaseInitError = error?.message || String(error);
    console.warn("Firebase Admin initialization failed, falling back to proxy auth objects:", error);
  }
} else {
  const missing = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");
  firebaseInitError = `Missing keys in env: ${missing.join(", ")}`;
}

function makeMissingProxy(name: string) {
  return new Proxy(
    {},
    {
      get() {
        throw missingError();
      },
      apply() {
        throw missingError();
      },
    }
  );
}

export const isFirebaseAdminConfigured = Boolean(app);
export const adminAuth: any = app ? app.auth() : makeMissingProxy("adminAuth");
export const adminDb: any = app ? app.firestore() : makeMissingProxy("adminDb");
