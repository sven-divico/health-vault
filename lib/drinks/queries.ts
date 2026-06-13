import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { drinkEntries } from '@/lib/db/schema';

export interface CreateDrinkInput {
  userId: number;
  source: 'text' | 'web';
  name: string;
  volumeMl: number;
  alcoholGPer100ml: number | null;
  sugarGPer100ml: number | null;
  rawText?: string | null;
  visionConfidence?: number | null;
  loggedAt?: Date;
}

export function createDrinkEntry(input: CreateDrinkInput) {
  return db().insert(drinkEntries).values({
    userId: input.userId,
    loggedAt: input.loggedAt ?? new Date(),
    source: input.source,
    name: input.name,
    volumeMl: input.volumeMl,
    alcoholGPer100ml: input.alcoholGPer100ml,
    sugarGPer100ml: input.sugarGPer100ml,
    rawText: input.rawText ?? null,
    visionConfidence: input.visionConfidence ?? null,
  }).returning().get();
}

export function listDrinkEntriesPaged(userId: number, opts: { limit: number; offset: number }) {
  return db()
    .select()
    .from(drinkEntries)
    .where(eq(drinkEntries.userId, userId))
    .orderBy(desc(drinkEntries.loggedAt))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
}

export function countDrinkEntries(userId: number): number {
  const row = db()
    .select({ n: sql<number>`count(*)` })
    .from(drinkEntries)
    .where(eq(drinkEntries.userId, userId))
    .get();
  return row?.n ?? 0;
}

export function listDrinkEntriesSince(userId: number, since: Date) {
  return db()
    .select()
    .from(drinkEntries)
    .where(and(eq(drinkEntries.userId, userId), gte(drinkEntries.loggedAt, since)))
    .all();
}

/** Total drink volume (ml) since `since` — for the water gauge. */
export function sumVolumeSince(userId: number, since: Date): number {
  const row = db()
    .select({ v: sql<number>`coalesce(sum(${drinkEntries.volumeMl}), 0)` })
    .from(drinkEntries)
    .where(and(eq(drinkEntries.userId, userId), gte(drinkEntries.loggedAt, since)))
    .get();
  return row?.v ?? 0;
}

export function getDrinkEntry(id: number) {
  return db().select().from(drinkEntries).where(eq(drinkEntries.id, id)).get();
}

/** Volume-only edit: scales absolutes on read, no AI. */
export function updateDrinkEntryVolume(id: number, volumeMl: number) {
  return db().update(drinkEntries).set({ volumeMl }).where(eq(drinkEntries.id, id)).run();
}

/** Name edit: overwrite name + re-estimated per-100 ml concentrations. */
export function updateDrinkEntryName(id: number, name: string, conc: { alcoholGPer100ml: number | null; sugarGPer100ml: number | null }) {
  return db().update(drinkEntries)
    .set({ name, alcoholGPer100ml: conc.alcoholGPer100ml, sugarGPer100ml: conc.sugarGPer100ml })
    .where(eq(drinkEntries.id, id))
    .run();
}

export function deleteDrinkEntryById(id: number) {
  return db().delete(drinkEntries).where(eq(drinkEntries.id, id)).run();
}
