import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { clearUserConnection } from "@/lib/server/connections";

export async function POST(request: Request, { params }: { params: { platformId: string } }) {
  const decoded = await verifyIdToken(request);
  if (!decoded?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (decoded as any).uid as string;
  const { platformId } = params;
  await clearUserConnection(uid, platformId);
  return NextResponse.json({ ok: true });
}
