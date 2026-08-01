import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// This configuration uses environment variables for Firebase Admin credentials.
// This is the recommended approach for security and portability, especially in production.
//
// How to set up:
// 1. Create a `.env.local` file in the root of your project if it doesn't exist.
// 2. Download your service account key JSON file from the Firebase console
//    (Project settings -> Service accounts -> Generate new private key).
// 3. Copy the values from the JSON file into your `.env.local` file as shown below.
//
// Example `.env.local` file:
//
// FIREBASE_PROJECT_ID="your-project-id"
// FIREBASE_CLIENT_EMAIL="firebase-adminsdk-....@your-project-id.iam.gserviceaccount.com"
// FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n"
//
// IMPORTANT: For the `FIREBASE_PRIVATE_KEY`, you MUST wrap the key in quotes and replace all literal newlines with `\n`.
// The code below will handle converting `\n` back to actual newlines.

const hasServiceAccount =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

if (!getApps().length && !hasServiceAccount) {
  throw new Error(
    'Firebase Admin SDK credentials are not set in environment variables. Please create a .env.local file with FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
  );
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
} as ServiceAccount;

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminDb = getFirestore();

export { adminDb };