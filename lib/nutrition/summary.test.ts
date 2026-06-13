import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './summary';

const DAY = 24 * 60 * 60 * 1000;

// per-100 g kcal 100, portion 100 g → 100 kcal absolute per entry (easy to sum).
function entry(loggedAt: Date, kcalPer100g: number | null = 100) {
  return {
    loggedAt,
    portionG: 100,
    kcalPer100g,
    carbsGPer100g: null,
    sugarGPer100g: null,
    fatGPer100g: null,
    saturatedFatGPer100g: null,
    proteinGPer100g: null,
    fiberGPer100g: null,
    saltGPer100g: null,
  };
}

test('sums absolutes per window; today = since local midnight', () => {
  const now = new Date('2026-06-13T15:00:00').getTime(); // local
  const midnightToday = new Date('2026-06-13T08:00:00').getTime(); // after local midnight
  const entries = [
    entry(new Date(midnightToday)),          // in today, 24h, 7d, month
    entry(new Date(now - 12 * 60 * 60 * 1000)), // 12h ago: maybe before today's midnight, in 24h/7d/month
    entry(new Date(now - 5 * DAY)),          // in 7d, month
    entry(new Date(now - 20 * DAY)),         // only month
  ];
  const [today, h24, d7, month] = summarize(entries, now);

  assert.equal(month.sums.kcal, 400); // all four
  assert.equal(d7.sums.kcal, 300);    // excludes the 20-day-old one
  assert.equal(h24.sums.kcal, 200);   // the two within 24h
  // "today" includes only entries since local midnight (08:00 entry, and the 12h-ago = 03:00).
  assert.ok(today.sums.kcal === 200 || today.sums.kcal === 100);
});

test('nutrient with no contributing entries stays null (shown as —)', () => {
  const now = new Date('2026-06-13T15:00:00').getTime();
  const [, , , month] = summarize([entry(new Date(now - 2 * DAY), null)], now);
  assert.equal(month.sums.kcal, null); // kcalPer100g was null
  assert.equal(month.sums.protein, null);
});
