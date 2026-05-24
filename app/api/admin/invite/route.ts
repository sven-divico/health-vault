import { NextResponse } from 'next/server';
import { createInvite } from '@/lib/auth';

export const runtime = 'nodejs';

// Simple bootstrap endpoint: protected by a shared secret in env.
// POST { username: "alice" } with header x-admin-secret: <ADMIN_SECRET>
export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: 'admin disabled' }, { status: 503 });
  if (req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { username } = (await req.json()) as { username?: string };
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });
  const token = createInvite(username.trim());
  const base = process.env.PUBLIC_BASE_URL ?? '';
  return NextResponse.json({
    token,
    telegramStartCommand: `/start ${token}`,
    helpUrl: `${base}/login`,
  });
}
