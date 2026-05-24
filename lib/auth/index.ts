import { randomBytes } from 'node:crypto';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { inviteTokens, loginChallenges, sessions, users } from '@/lib/db/schema';

const LOGIN_CHALLENGE_TTL_MS = 30_000;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
export const SESSION_COOKIE = 'hv_session';

function token(bytes = 16) { return randomBytes(bytes).toString('base64url'); }

export function createInvite(proposedUsername: string): string {
  const t = token(12);
  db().insert(inviteTokens).values({
    token: t,
    proposedUsername,
    createdAt: new Date(),
  }).run();
  return t;
}

export type ConsumeInviteResult =
  | { ok: true; userId: number; username: string }
  | { ok: false; reason: 'invalid' | 'already_used' | 'telegram_already_linked' };

export function consumeInvite(rawToken: string, telegramUserId: number): ConsumeInviteResult {
  const d = db();
  const row = d.select().from(inviteTokens).where(eq(inviteTokens.token, rawToken)).get();
  if (!row) return { ok: false, reason: 'invalid' };
  if (row.consumedAt) return { ok: false, reason: 'already_used' };

  const existing = d.select().from(users).where(eq(users.telegramUserId, telegramUserId)).get();
  if (existing) return { ok: false, reason: 'telegram_already_linked' };

  const inserted = d.insert(users).values({
    username: row.proposedUsername,
    telegramUserId,
    createdAt: new Date(),
  }).returning({ id: users.id, username: users.username }).get();

  d.update(inviteTokens)
    .set({ consumedAt: new Date(), consumedByUserId: inserted.id })
    .where(eq(inviteTokens.token, rawToken))
    .run();

  return { ok: true, userId: inserted.id, username: inserted.username };
}

export function getUserByTelegramId(telegramUserId: number) {
  return db().select().from(users).where(eq(users.telegramUserId, telegramUserId)).get();
}

export function getUserByUsername(username: string) {
  return db().select().from(users).where(eq(users.username, username)).get();
}

export function getUserById(id: number) {
  return db().select().from(users).where(eq(users.id, id)).get();
}

function twoDigitCode(): string {
  // 00-99 inclusive
  return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

export function startLoginChallenge(username: string): { sessionId: string; code: string } | null {
  const user = getUserByUsername(username);
  if (!user || user.telegramUserId == null) return null;
  const sessionId = token(24);
  const code = twoDigitCode();
  const now = new Date();
  const expires = new Date(now.getTime() + LOGIN_CHALLENGE_TTL_MS);

  const d = db();
  d.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    authenticated: false,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  }).run();
  d.insert(loginChallenges).values({
    sessionId,
    userId: user.id,
    code,
    expiresAt: expires,
  }).run();
  return { sessionId, code };
}

export function attemptLoginByCode(telegramUserId: number, code: string): boolean {
  const user = getUserByTelegramId(telegramUserId);
  if (!user) return false;
  const now = new Date();
  const challenge = db()
    .select()
    .from(loginChallenges)
    .where(
      and(
        eq(loginChallenges.userId, user.id),
        eq(loginChallenges.code, code),
        isNull(loginChallenges.consumedAt),
        gt(loginChallenges.expiresAt, now),
      ),
    )
    .get();
  if (!challenge) return false;
  const d = db();
  d.update(loginChallenges).set({ consumedAt: now }).where(eq(loginChallenges.id, challenge.id)).run();
  d.update(sessions).set({ authenticated: true }).where(eq(sessions.id, challenge.sessionId)).run();
  return true;
}

export function getSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const row = db().select().from(sessions).where(eq(sessions.id, sessionId)).get();
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

export function getAuthenticatedUser(sessionId: string | undefined) {
  const s = getSession(sessionId);
  if (!s || !s.authenticated || !s.userId) return null;
  return getUserById(s.userId);
}

export function isSessionAuthenticated(sessionId: string): boolean {
  const s = getSession(sessionId);
  return !!s?.authenticated;
}
