import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, getAuthenticatedUser } from '@/lib/auth';
import { resolveImagePath } from '@/lib/images';
import { readFileSync } from 'node:fs';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const c = await cookies();
  const user = getAuthenticatedUser(c.get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { path } = await params;
  const rel = path.join('/');
  // path is "<userId>/<file>" — must match the authenticated user
  if (!rel.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const abs = resolveImagePath(user.id, rel);
  if (!abs) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const buf = readFileSync(abs);
  const ext = abs.split('.').pop()?.toLowerCase();
  const ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return new NextResponse(buf, { headers: { 'content-type': ct, 'cache-control': 'private, max-age=3600' } });
}
