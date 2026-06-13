import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumKcalByDay } from './index';

// per-100 g kcal × portion/100 → absolute kcal. 100 g @ given kcal_per_100g = that many kcal.
function entry(loggedAt: Date, kcalPer100g: number | null) {
  return {
    loggedAt,
    portionG: 100,
    kcalPer100g,
    carbsGPer100g: null, sugarGPer100g: null, fatGPer100g: null,
    saturatedFatGPer100g: null, proteinGPer100g: null, fiberGPer100g: null, saltGPer100g: null,
  };
}

test('sums derived absolute kcal per LOCAL day, skipping null', () => {
  const day1 = new Date('2026-01-01T08:00:00'); // local
  const day1b = new Date('2026-01-01T20:00:00');
  const day2 = new Date('2026-01-02T12:00:00');
  const series = sumKcalByDay([
    entry(day1, 200),
    entry(day1b, 300),
    entry(day2, 500),
    entry(new Date('2026-01-02T13:00:00'), null), // no kcal → skipped
  ]);

  const midnight = (s: string) => { const d = new Date(s); d.setHours(0, 0, 0, 0); return d.getTime(); };
  assert.deepEqual(series, [
    { t: midnight('2026-01-01T00:00:00'), v: 500 },
    { t: midnight('2026-01-02T00:00:00'), v: 500 },
  ]);
});
