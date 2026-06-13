import { db } from '@/lib/db/client';
import { visionUsage } from '@/lib/db/schema';
import type { VisionUsage } from './index';

export function recordVisionUsage(userId: number, foodEntryId: number | null, u: VisionUsage) {
  return db().insert(visionUsage).values({
    userId,
    foodEntryId,
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
