import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'file::memory:';
import * as auth from './index';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

test('createAuthenticatedSession returns an authenticated session for a user', () => {
  const u = db().insert(users).values({ username: 'demo', createdAt: new Date() }).returning().get();
  const sid = auth.createAuthenticatedSession(u.id);
  assert.equal(typeof sid, 'string');
  assert.equal(auth.isSessionAuthenticated(sid), true);
  assert.equal(auth.getAuthenticatedUser(sid)?.id, u.id);
});
