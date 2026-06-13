import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { drinkEntries } from '@/lib/db/schema';
import { rangeBounds, type RangeKey } from '@/lib/time-range';
import { absoluteDrink, type EntryDrink } from './index';

export type DrinkMetricKey = 'volume' | 'alcohol' | 'sugar';

export interface DrinkMetric {
  key: DrinkMetricKey;
  label: string;
  unit: 'ml' | 'g';
}

export const DRINK_METRICS: DrinkMetric[] = [
  { key: 'volume', label: 'Volumen', unit: 'ml' },
  { key: 'alcohol', label: 'Alkohol', unit: 'g' },
  { key: 'sugar', label: 'Zucker', unit: 'g' },
];

export const DRINK_SUMMARY_PERIODS: RangeKey[] = ['today', '24h', '7d', 'month'];

export type DrinkSums = Record<DrinkMetricKey, number | null>;
export interface DrinkPeriodSummary { key: RangeKey; sums: DrinkSums }

type DatedDrink = EntryDrink & { loggedAt: Date };

/** Pure: sum Volumen/Alkohol/Zucker per period window (local time). */
export function summarizeDrinks(entries: DatedDrink[], now: number, periods: RangeKey[] = DRINK_SUMMARY_PERIODS): DrinkPeriodSummary[] {
  return periods.map((key) => {
    const { from } = rangeBounds(key, now);
    const sums: DrinkSums = { volume: null, alcohol: null, sugar: null };
    for (const e of entries) {
      if (e.loggedAt.getTime() < from) continue;
      const abs = absoluteDrink(e);
      const add = (k: DrinkMetricKey, v: number | null) => { if (v != null) sums[k] = (sums[k] ?? 0) + v; };
      add('volume', abs.volumeMl);
      add('alcohol', abs.alcoholG);
      add('sugar', abs.sugarG);
    }
    return { key, sums };
  });
}

export function drinkSummaryForUser(userId: number, now: number): DrinkPeriodSummary[] {
  const widest = Math.min(...DRINK_SUMMARY_PERIODS.map((k) => rangeBounds(k, now).from));
  const rows = db().select().from(drinkEntries)
    .where(and(eq(drinkEntries.userId, userId), gte(drinkEntries.loggedAt, new Date(widest))))
    .all();
  return summarizeDrinks(rows, now);
}
