import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { updateCustomPostId } from "@/lib/server/connections";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const decoded = await verifyIdToken(request);
    const uid = (decoded as any)?.uid;

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { oldId, newId } = body;

    if (!oldId || !newId) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }

    updateCustomPostId(uid, oldId, newId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming upload:", error);
    return NextResponse.json({ error: "Failed to confirm upload" }, { status: 500 });
  }
}
