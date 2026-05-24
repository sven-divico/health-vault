import { NextResponse } from 'next/server';
import { SESSION_COOKIE, startLoginChallenge } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { username } = (await req.json()) as { username?: string };
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'username required' }, { status: 400 });
  }
  const challenge = startLoginChallenge(username.trim());
  if (!challenge) {
    return NextResponse.json({ error: 'unknown user or not linked to Telegram' }, { status: 404 });
  }
  const res = NextResponse.json({ code: challenge.code, expiresInSec: 30 });
  res.cookies.set(SESSION_COOKIE, challenge.sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
