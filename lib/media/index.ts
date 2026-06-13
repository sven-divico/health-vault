import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodEntries } from '@/lib/db/schema';

export interface MediaItem { id: number; imagePath: string; name: string; caption: string | null; loggedAt: number }

export function listMedia(userId: number, limit = 200): MediaItem[] {
  const rows = db().select().from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), isNotNull(foodEntries.imagePath)))
    .orderBy(desc(foodEntries.loggedAt)).limit(limit).all();
  return rows.map((r) => ({
    id: r.id,
    imagePath: r.imagePath as string,
    name: r.dishName ?? r.rawText ?? 'Image',
    caption: r.rawText ?? null,
    loggedAt: r.loggedAt.getTime(),
  }));
}
