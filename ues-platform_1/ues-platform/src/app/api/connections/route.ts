import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken, lastAuthError } from '@/lib/server/auth';
import { getUserConnections, firestoreError } from '@/lib/server/connections';
import { firebaseInitError, isFirebaseAdminConfigured } from '@/lib/server/firebaseAdmin';

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

    const response = NextResponse.json(connections);
    response.headers.set('x-firebase-configured', String(isFirebaseAdminConfigured));
    response.headers.set('x-firebase-uid', uid);
    if (firebaseInitError) {
      response.headers.set('x-firebase-error', encodeURIComponent(firebaseInitError));
    }
    if (lastAuthError) {
      response.headers.set('x-firebase-auth-error', encodeURIComponent(lastAuthError));
    }
    if (firestoreError) {
      response.headers.set('x-firestore-error', encodeURIComponent(firestoreError));
    }
    return response;
  } catch (error) {
    console.error('Error fetching connection status:', error);
    return NextResponse.json({ error: 'Failed to fetch connection status' }, { status: 500 });
  }
}