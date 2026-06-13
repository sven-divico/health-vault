import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodEntries } from '@/lib/db/schema';
import { rangeBounds, type RangeKey } from '@/lib/time-range';
import { absoluteNutrition, NUTRIENTS, type EntryNutrition, type NutrientKey, type AbsoluteNutrition } from './index';

/** Periods shown in the summary band, in display order. */
export const SUMMARY_PERIODS: RangeKey[] = ['today', '24h', '7d', 'month'];

export interface PeriodSummary {
  key: RangeKey;
  sums: AbsoluteNutrition; // null when no entry in the window has that nutrient
}

type DatedNutrition = EntryNutrition & { loggedAt: Date };

/** Pure: sum absolutes per nutrient for each period window (computed in local time). */
export function summarize(entries: DatedNutrition[], now: number, periods: RangeKey[] = SUMMARY_PERIODS): PeriodSummary[] {
  return periods.map((key) => {
    const { from } = rangeBounds(key, now);
    const sums = {} as AbsoluteNutrition;
    for (const n of NUTRIENTS) sums[n.key] = null;
    const counts = {} as Record<NutrientKey, number>;
    for (const n of NUTRIENTS) counts[n.key] = 0;

    for (const e of entries) {
      if (e.loggedAt.getTime() < from) continue;
      const abs = absoluteNutrition(e);
      for (const n of NUTRIENTS) {
        const v = abs[n.key];
        if (v == null) continue;
        sums[n.key] = (sums[n.key] ?? 0) + v;
        counts[n.key]++;
      }
    }
    return { key, sums };
  });
}

/** DB-backed summary over the widest window (month), reused for every period. */
export function summaryForUser(userId: number, now: number): PeriodSummary[] {
  // The oldest period bound is `month`; fetch once from there and slice in memory.
  const widest = Math.min(...SUMMARY_PERIODS.map((k) => rangeBounds(k, now).from));
  const rows = db().select().from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), gte(foodEntries.loggedAt, new Date(widest))))
    .all();
  return summarize(rows, now);
}
