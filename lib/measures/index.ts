import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { measurements } from '@/lib/db/schema';

export type MeasurementKind = 'weight' | 'mood' | 'activity';

export function recordWeight(userId: number, kg: number, note?: string) {
  return db().insert(measurements).values({
    userId, loggedAt: new Date(), kind: 'weight', valueNumeric: kg, note: note ?? null,
  }).returning().get();
}

export function recordMood(userId: number, score: number, note?: string) {
  return db().insert(measurements).values({
    userId, loggedAt: new Date(), kind: 'mood', valueNumeric: score, note: note ?? null,
  }).returning().get();
}

export function recordActivity(userId: number, description: string) {
  return db().insert(measurements).values({
    userId, loggedAt: new Date(), kind: 'activity', valueText: description,
  }).returning().get();
}

export function listMeasurements(userId: number, kind: MeasurementKind, limit = 200) {
  return db()
    .select()
    .from(measurements)
    .where(and(eq(measurements.userId, userId), eq(measurements.kind, kind)))
    .orderBy(desc(measurements.loggedAt))
    .limit(limit)
    .all();
}

export function latestMeasurement(userId: number, kind: MeasurementKind) {
  return db()
    .select()
    .from(measurements)
    .where(and(eq(measurements.userId, userId), eq(measurements.kind, kind)))
    .orderBy(desc(measurements.loggedAt))
    .limit(1)
    .get();
}
