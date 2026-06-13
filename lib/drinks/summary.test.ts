import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDrinks } from './summary';

const DAY = 24 * 60 * 60 * 1000;

function drink(loggedAt: Date, volumeMl: number, alc: number | null = null) {
  return { loggedAt, volumeMl, alcoholGPer100ml: alc, sugarGPer100ml: null };
}

test('sums volume/alcohol per window; today since local midnight', () => {
  const now = new Date('2026-06-13T15:00:00').getTime();
  const entries = [
    drink(new Date('2026-06-13T09:00:00'), 500, 4), // today: 500ml, 20g alc
    drink(new Date(now - 5 * DAY), 1000),           // 7d/month: 1000ml, no alc
    drink(new Date(now - 20 * DAY), 250, 8),        // month only
  ];
  const [today, h24, d7, month] = summarizeDrinks(entries, now);
  assert.equal(today.sums.volume, 500);
  assert.equal(today.sums.alcohol, 20);
  assert.equal(h24.sums.volume, 500);
  assert.equal(d7.sums.volume, 1500);
  assert.equal(d7.sums.alcohol, 20);   // only the 500ml drink had alcohol
  assert.equal(month.sums.volume, 1750);
  assert.equal(month.sums.alcohol, 40); // 20 + 20
});

test('no contributing alcohol → null (shown as —)', () => {
  const now = new Date('2026-06-13T15:00:00').getTime();
  const [, , , month] = summarizeDrinks([drink(new Date(now - DAY), 500)], now);
  assert.equal(month.sums.volume, 500);
  assert.equal(month.sums.alcohol, null);
  assert.equal(month.sums.sugar, null);
});
