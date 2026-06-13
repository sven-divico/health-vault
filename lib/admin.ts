import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'hv_admin';

function expectedToken(secret: string): string {
  // derived token (not the raw secret) stored in the cookie
  return createHmac('sha256', secret).update('admin-gate-v1').digest('hex');
}

export function adminEnabled(): boolean { return !!process.env.ADMIN_SECRET; }

export function checkSecret(input: string): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  const a = Buffer.from(input); const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return expectedToken(secret);
}

export function isAdminCookieValid(cookieVal: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !cookieVal) return false;
  const exp = expectedToken(secret);
  const a = Buffer.from(cookieVal); const b = Buffer.from(exp);
  return a.length === b.length && timingSafeEqual(a, b);
}
