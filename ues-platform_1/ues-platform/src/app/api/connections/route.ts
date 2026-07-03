import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/server/firebaseAdmin";
import { getUserConnections } from "@/lib/server/connections";

async function verifyToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const decoded = await verifyToken(request);
  if (!decoded?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await getUserConnections(decoded.uid);
  const list = Object.keys(connections).map((k) => ({ platformId: k, ...connections[k] }));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  return new NextResponse(null, { status: 405 });
}
