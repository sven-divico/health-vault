import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { measurements, foodEntries } from '@/lib/db/schema';
import { absoluteNutrition, type EntryNutrition } from '@/lib/nutrition';
import { absoluteDrink } from '@/lib/drinks';
import { drinkEntries } from '@/lib/db/schema';
import { t } from '@/lib/i18n/de';

export interface Point { t: number; v: number }

export interface MetricDef {
  key: 'weight' | 'mood' | 'activity' | 'kcal' | 'drink_volume' | 'alcohol';
  label: string;
  unit: string;
  color: string;
}

export const METRICS: MetricDef[] = [
  { key: 'weight', label: t.metrics.weight, unit: 'kg', color: '#2563eb' },
  { key: 'mood', label: t.metrics.mood, unit: '1-5', color: '#16a34a' },
  { key: 'activity', label: t.metrics.activity, unit: 'min', color: '#ea580c' },
  { key: 'kcal', label: t.metrics.kcal, unit: 'kcal', color: '#a855f7' },
  { key: 'drink_volume', label: t.metrics.drinkVolume, unit: 'ml', color: '#06b6d4' },
  { key: 'alcohol', label: t.metrics.alcohol, unit: 'g', color: '#b91c1c' },
];

/** Local-day midnight (ms) — buckets by the user's local calendar day, consistent with the
 * "Heute" pill (Phase A used local midnight). */
function localDayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

type DatedNutrition = EntryNutrition & { loggedAt: Date };

/** Sum derived absolute kcal per LOCAL day. */
export function sumKcalByDay(rows: DatedNutrition[]): Point[] {
  const byDay = new Map<number, number>();
  for (const r of rows) {
    const kcal = absoluteNutrition(r).kcal;
    if (kcal == null) continue;
    const t = localDayStart(r.loggedAt);
    byDay.set(t, (byDay.get(t) ?? 0) + kcal);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, v }));
}

export function measurementPoints(userId: number, kind: 'weight' | 'mood' | 'activity', since: Date): Point[] {
  const rows = db().select().from(measurements)
    .where(and(eq(measurements.userId, userId), eq(measurements.kind, kind), gte(measurements.loggedAt, since)))
    .all();
  return rows
    .filter((r) => r.valueNumeric != null)
    .map((r) => ({ t: r.loggedAt.getTime(), v: r.valueNumeric as number }))
    .sort((a, b) => a.t - b.t);
}

export function kcalPoints(userId: number, since: Date): Point[] {
  const rows = db().select().from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), gte(foodEntries.loggedAt, since)))
    .all();
  return sumKcalByDay(rows);
}

/** Sum a per-local-day value over drink entries (volume or derived alcohol grams). */
function drinkPoints(userId: number, since: Date, metric: 'volume' | 'alcohol'): Point[] {
  const rows = db().select().from(drinkEntries)
    .where(and(eq(drinkEntries.userId, userId), gte(drinkEntries.loggedAt, since)))
    .all();
  const byDay = new Map<number, number>();
  for (const r of rows) {
    const abs = absoluteDrink(r);
    const v = metric === 'volume' ? abs.volumeMl : abs.alcoholG;
    if (v == null) continue;
    const t = localDayStart(r.loggedAt);
    byDay.set(t, (byDay.get(t) ?? 0) + v);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, v }));
}

export function seriesFor(userId: number, key: MetricDef['key'], since: Date): Point[] {
  switch (key) {
    case 'kcal': return kcalPoints(userId, since);
    case 'drink_volume': return drinkPoints(userId, since, 'volume');
    case 'alcohol': return drinkPoints(userId, since, 'alcohol');
    default: return measurementPoints(userId, key, since);
  }
}
