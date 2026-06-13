'use server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { createInvite } from '@/lib/auth';
import { ADMIN_COOKIE, checkSecret, isAdminCookieValid } from '@/lib/admin';

export async function unlockAdmin(formData: FormData) {
  const secret = String(formData.get('secret') ?? '');
  const tokenVal = checkSecret(secret);
  if (!tokenVal) return { ok: false as const, error: 'Invalid secret' };
  (await cookies()).set(ADMIN_COOKIE, tokenVal, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8,
  });
  return { ok: true as const };
}

async function requireAdmin() {
  const c = await cookies();
  if (!isAdminCookieValid(c.get(ADMIN_COOKIE)?.value)) throw new Error('forbidden');
}

export async function listUsers() {
  await requireAdmin();
  return db().select().from(users).all().map((u) => ({ id: u.id, username: u.username, linked: u.telegramUserId != null }));
}

export async function createInviteAction(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get('username') ?? '').trim();
  if (!username) return { ok: false as const, error: 'username required' };
  const token = createInvite(username);
  return { ok: true as const, token, startCommand: `/start ${token}` };
}
