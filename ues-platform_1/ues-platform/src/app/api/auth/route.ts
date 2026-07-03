import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";

export async function GET(request: Request) {
  const decoded = await verifyIdToken(request);
  if (!decoded?.uid) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, uid: decoded.uid, email: decoded.email });
}
