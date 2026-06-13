import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { visionUsage } from '@/lib/db/schema';
import type { VisionUsage } from './index';

export function recordVisionUsage(userId: number, foodEntryId: number | null, u: VisionUsage, drinkEntryId: number | null = null) {
  return db().insert(visionUsage).values({
    userId,
    foodEntryId,
    drinkEntryId,
    loggedAt: new Date(),
    model: u.model,
    srcBytes: u.srcBytes,
    sentBytes: u.sentBytes,
    width: u.width,
    height: u.height,
    inputTokens: u.inputTokens,
    outputTokens: u.outputTokens,
    costMicroUsd: u.costMicroUsd,
    visionConfidence: u.visionConfidence,
    downsampleMs: u.downsampleMs,
  }).run();
}

// Before deleting a food/drink entry, null the FK on its usage rows so the cost record is
// kept (user-level totals stay intact) without a dangling foreign-key reference.
export function unlinkVisionUsageFood(foodEntryId: number) {
  return db().update(visionUsage).set({ foodEntryId: null }).where(eq(visionUsage.foodEntryId, foodEntryId)).run();
}

export function unlinkVisionUsageDrink(drinkEntryId: number) {
  return db().update(visionUsage).set({ drinkEntryId: null }).where(eq(visionUsage.drinkEntryId, drinkEntryId)).run();
}
