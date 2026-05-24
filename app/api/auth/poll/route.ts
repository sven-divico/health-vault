import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, isSessionAuthenticated } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const c = await cookies();
  const sid = c.get(SESSION_COOKIE)?.value;
  if (!sid) return NextResponse.json({ authenticated: false });
  return NextResponse.json({ authenticated: isSessionAuthenticated(sid) });
}
