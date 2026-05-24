import { desc, eq, and, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodEntries } from '@/lib/db/schema';
import type { MealInterpretation } from '@/lib/vision';

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

export function createFoodTextEntry(input: CreateFoodTextInput) {
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
    estimatedKcal: input.interpretation.estimatedKcal,
    visionConfidence: input.interpretation.confidence,
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
