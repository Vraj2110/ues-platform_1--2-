import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: NextRequest) {
  try {
    // Securely verify the user's Firebase ID token before proceeding.
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    await getAuth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Auth verification failed in YouTube start route:', error);
    return NextResponse.json({ error: 'Authentication failed. Please sign in again.' }, { status: 401 });
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    console.error('Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI environment variables.');
    return NextResponse.json({ error: 'OAuth configuration on the server is missing.' }, { status: 500 });
  }

  // 1. Generate a unique state parameter to prevent CSRF attacks
  const state = uuidv4();

  // 2. Store the state in an HTTP-only, secure cookie
  cookies().set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  // 3. Construct the Google OAuth URL
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/youtube.readonly&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${state}`;

  // 4. Return the URL to the client to initiate the redirect
  return NextResponse.json({ url: authUrl });
}