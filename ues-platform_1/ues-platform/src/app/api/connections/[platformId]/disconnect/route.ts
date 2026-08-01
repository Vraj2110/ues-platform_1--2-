import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { clearUserConnection } from '@/lib/server/connections';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { platformId: string } }) {
  const { platformId } = params;
  if (!platformId) {
    return NextResponse.json({ error: 'Platform ID is missing' }, { status: 400 });
  }

  try {
    // Securely get the user's UID by verifying the Firebase ID token.
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clearUserConnection(uid, platformId);

    return NextResponse.json({ message: 'Connection removed successfully' });
  } catch (error: any) {
    console.error(`Failed to disconnect ${platformId}:`, error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Token expired, please re-authenticate' }, { status: 401 });
    }
    return NextResponse.json({ error: `Failed to disconnect ${platformId}` }, { status: 500 });
  }
}