import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/server/auth';
import { getUserConnections } from '@/lib/server/connections';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyIdToken(request);
    const uid = (decodedToken?.uid as string) || "demo-user";

    const connectionsByPlatform = await getUserConnections(uid);
    const connections = Object.entries(connectionsByPlatform).map(([platformId, connection]) => ({
      ...connection,
      platformId,
    }));

    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return NextResponse.json({ error: 'Failed to fetch connection status' }, { status: 500 });
  }
}