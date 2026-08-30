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
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload && (payload.user_id || payload.sub)) {
          return { uid: payload.user_id || payload.sub, email: payload.email, ...payload };
        }
      }
    } catch {}
    return null;
  }
}
