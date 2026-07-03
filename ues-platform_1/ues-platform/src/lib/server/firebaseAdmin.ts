import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

function normalizeEnv(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  // Remove surrounding single or double quotes without using the `s` flag
  const withoutDouble = trimmed.match(/^"([\s\S]*)"$/);
  if (withoutDouble) return withoutDouble[1];
  const withoutSingle = trimmed.match(/^'([\s\S]*)'$/);
  if (withoutSingle) return withoutSingle[1];
  return trimmed;
}

const projectId = normalizeEnv(process.env.FIREBASE_ADMIN_PROJECT_ID);
const clientEmail = normalizeEnv(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
const privateKeyRaw = normalizeEnv(process.env.FIREBASE_ADMIN_PRIVATE_KEY);
const privateKey = privateKeyRaw?.replace(/\\n/g, "\n");

function missingError() {
  return new Error(
    "Missing Firebase Admin credentials in environment variables. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
  );
}

let app: admin.app.App | null = null;
if (projectId && clientEmail && privateKey) {
  app = !getApps().length
    ? admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      })
    : admin.app();
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

export const adminAuth: any = app ? app.auth() : makeMissingProxy("adminAuth");
export const adminDb: any = app ? app.firestore() : makeMissingProxy("adminDb");
