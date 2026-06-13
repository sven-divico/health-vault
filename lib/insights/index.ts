import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { measurements, foodEntries } from '@/lib/db/schema';

export interface Point { t: number; v: number }

export interface MetricDef {
  key: 'weight' | 'mood' | 'activity' | 'kcal';
  label: string;
  unit: string;
  color: string;
}

export const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#2563eb' },
  { key: 'mood', label: 'Mood', unit: '1-5', color: '#16a34a' },
  { key: 'activity', label: 'Activity', unit: 'min', color: '#ea580c' },
  { key: 'kcal', label: 'Food', unit: 'kcal', color: '#a855f7' },
];

function dayStartUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function sumKcalByDay(rows: { loggedAt: Date; estimatedKcal: number | null }[]): Point[] {
  const byDay = new Map<number, number>();
  for (const r of rows) {
    if (r.estimatedKcal == null) continue;
    const t = dayStartUtc(r.loggedAt);
    byDay.set(t, (byDay.get(t) ?? 0) + r.estimatedKcal);
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
  return sumKcalByDay(rows.map((r) => ({ loggedAt: r.loggedAt, estimatedKcal: r.estimatedKcal })));
}

export function seriesFor(userId: number, key: MetricDef['key'], since: Date): Point[] {
  return key === 'kcal' ? kcalPoints(userId, since) : measurementPoints(userId, key, since);
}
