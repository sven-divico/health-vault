import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumKcalByDay } from './index';

test('sums kcal per UTC day', () => {
  const rows = [
    { loggedAt: new Date('2026-01-01T08:00:00Z'), estimatedKcal: 200 },
    { loggedAt: new Date('2026-01-01T20:00:00Z'), estimatedKcal: 300 },
    { loggedAt: new Date('2026-01-02T12:00:00Z'), estimatedKcal: 500 },
    { loggedAt: new Date('2026-01-02T13:00:00Z'), estimatedKcal: null },
  ];
  const series = sumKcalByDay(rows);
  assert.deepEqual(series, [
    { t: Date.parse('2026-01-01T00:00:00Z'), v: 500 },
    { t: Date.parse('2026-01-02T00:00:00Z'), v: 500 },
  ]);
});
