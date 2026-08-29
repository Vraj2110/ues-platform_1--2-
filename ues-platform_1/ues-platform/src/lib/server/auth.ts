import { adminAuth } from "@/lib/server/firebaseAdmin";

export let lastAuthError: string | null = null;

export async function verifyIdToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch (error: any) {
    lastAuthError = error?.message || String(error);
    return null;
  }
}
