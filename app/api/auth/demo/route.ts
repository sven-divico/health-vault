import { NextResponse } from 'next/server';
import { SESSION_COOKIE, createAuthenticatedSession, getUserByUsername } from '@/lib/auth';
import { DEMO_USERNAME } from '@/lib/demo';

export const runtime = 'nodejs';

export async function POST() {
  const demo = getUserByUsername(DEMO_USERNAME); // resolves ONLY the demo user; no input accepted
  if (!demo) return NextResponse.json({ error: 'demo not seeded' }, { status: 404 });
  const sessionId = createAuthenticatedSession(demo.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
