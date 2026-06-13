import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rangeBounds, filterByRange, toRangeKey, isRangeKey } from './time-range';

const DAY = 24 * 60 * 60 * 1000;

test('today = local midnight of now', () => {
  const now = new Date('2026-06-13T15:30:00').getTime(); // local time
  const { from } = rangeBounds('today', now);
  const d = new Date(from);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
  assert.equal(d.getMilliseconds(), 0);
  // Same local calendar day as `now`, and not in the future.
  assert.equal(d.getDate(), new Date(now).getDate());
  assert.ok(from <= now);
});

test('24h / 7d / month are rolling windows back from now', () => {
  const now = 1_000_000_000_000;
  assert.deepEqual(rangeBounds('24h', now), { from: now - DAY });
  assert.deepEqual(rangeBounds('7d', now), { from: now - 7 * DAY });
  assert.deepEqual(rangeBounds('month', now), { from: now - 31 * DAY });
});

test('all = epoch (everything)', () => {
  assert.deepEqual(rangeBounds('all', 1_000_000_000_000), { from: 0 });
});

test('filterByRange keeps points with t >= from', () => {
  const now = 1_000_000_000_000;
  const points = [
    { t: now - 2 * DAY, v: 1 },
    { t: now - 12 * 60 * 60 * 1000, v: 2 }, // 12h ago
    { t: now, v: 3 },
  ];
  assert.deepEqual(filterByRange(points, '24h', now).map((p) => p.v), [2, 3]);
  assert.deepEqual(filterByRange(points, '7d', now).map((p) => p.v), [1, 2, 3]);
  assert.deepEqual(filterByRange(points, 'all', now).map((p) => p.v), [1, 2, 3]);
});

test('isRangeKey / toRangeKey validate and default', () => {
  assert.ok(isRangeKey('7d'));
  assert.ok(!isRangeKey('nope'));
  assert.ok(!isRangeKey(undefined));
  assert.equal(toRangeKey('month'), 'month');
  assert.equal(toRangeKey('garbage'), '7d');
  assert.equal(toRangeKey(undefined), '7d');
});
