import { test } from 'node:test';
import assert from 'node:assert/strict';

// Must be set before the db client is first called (it lazily initialises).
process.env.DATABASE_URL = 'file::memory:';

import { recordActivity } from './index';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';

test('recordActivity stores category, durationMin, note', () => {
  // FK enforcement is ON, so insert a real user first and use its id.
  const u = db().insert(users).values({ username: 'act-test', createdAt: new Date() }).returning().get();
  const row = recordActivity(u.id, { category: 'run', durationMin: 28, note: '5km' });
  assert.equal(row.kind, 'activity');
  assert.equal(row.category, 'run');
  assert.equal(row.valueNumeric, 28);
  assert.equal(row.note, '5km');
});
