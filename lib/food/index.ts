import { desc, eq, and, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodEntries } from '@/lib/db/schema';
import type { MealInterpretation } from '@/lib/vision';
import type { EntryNutrition } from '@/lib/nutrition';

export interface CreateFoodTextInput {
  userId: number;
  text: string;
  loggedAt?: Date;
}

export interface CreateFoodPhotoInput {
  userId: number;
  imagePath: string;
  caption?: string;
  interpretation: MealInterpretation;
  loggedAt?: Date;
}

/** Spread the per-100 g + portion fields of an interpretation onto an insert/update payload. */
function nutritionValues(n: EntryNutrition): EntryNutrition {
  return {
    portionG: n.portionG,
    kcalPer100g: n.kcalPer100g,
    carbsGPer100g: n.carbsGPer100g,
    sugarGPer100g: n.sugarGPer100g,
    fatGPer100g: n.fatGPer100g,
    saturatedFatGPer100g: n.saturatedFatGPer100g,
    proteinGPer100g: n.proteinGPer100g,
    fiberGPer100g: n.fiberGPer100g,
    saltGPer100g: n.saltGPer100g,
  };
}

export function createFoodTextEntry(input: CreateFoodTextInput) {
  // Text entries start with null nutrition; populated later via Edit (dish re-estimate).
  return db().insert(foodEntries).values({
    userId: input.userId,
    loggedAt: input.loggedAt ?? new Date(),
    source: 'text',
    rawText: input.text,
    dishName: input.text.slice(0, 80),
  }).returning().get();
}

export function createFoodPhotoEntry(input: CreateFoodPhotoInput) {
  return db().insert(foodEntries).values({
    userId: input.userId,
    loggedAt: input.loggedAt ?? new Date(),
    source: 'photo',
    rawText: input.caption ?? null,
    imagePath: input.imagePath,
    dishName: input.interpretation.dishName,
    ingredientsJson: JSON.stringify(input.interpretation.ingredients),
    visionConfidence: input.interpretation.confidence,
    ...nutritionValues(input.interpretation),
  }).returning().get();
}

export function listFoodEntries(userId: number, limit = 100) {
  return db()
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.userId, userId))
    .orderBy(desc(foodEntries.loggedAt))
    .limit(limit)
    .all();
}

export function listFoodEntriesSince(userId: number, since: Date) {
  return db()
    .select()
    .from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), gte(foodEntries.loggedAt, since)))
    .orderBy(desc(foodEntries.loggedAt))
    .all();
}

export function listFoodEntriesPaged(userId: number, opts: { limit: number; offset: number }) {
  return db()
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.userId, userId))
    .orderBy(desc(foodEntries.loggedAt))
    .limit(opts.limit)
    .offset(opts.offset)
    .all();
}

export function countFoodEntries(userId: number): number {
  const row = db()
    .select({ n: sql<number>`count(*)` })
    .from(foodEntries)
    .where(eq(foodEntries.userId, userId))
    .get();
  return row?.n ?? 0;
}

export function getFoodEntry(id: number) {
  return db().select().from(foodEntries).where(eq(foodEntries.id, id)).get();
}

/** Portion-only edit: scales absolutes on read, no AI. */
export function updateFoodEntryPortion(id: number, portionG: number) {
  return db().update(foodEntries).set({ portionG }).where(eq(foodEntries.id, id)).run();
}

/** Dish edit: overwrite the dish name + re-estimated per-100 g values (+ portion if given). */
export function updateFoodEntryDish(id: number, dishName: string, nutrition: EntryNutrition) {
  return db().update(foodEntries)
    .set({ dishName, ...nutritionValues(nutrition) })
    .where(eq(foodEntries.id, id))
    .run();
}

export function deleteFoodEntryById(id: number) {
  return db().delete(foodEntries).where(eq(foodEntries.id, id)).run();
}
