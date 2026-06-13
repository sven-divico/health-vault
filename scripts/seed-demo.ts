import 'dotenv/config';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { users, measurements, foodEntries } from '../lib/db/schema';
import { DEMO_USERNAME } from '../lib/demo';

const DAYS = 90;
const IMG_ROOT = resolve(process.env.IMAGE_DIR ?? './data/images');

function ensureDemoUser(): number {
  const d = db();
  const existing = d.select().from(users).where(eq(users.username, DEMO_USERNAME)).all();
  if (existing.length > 1) throw new Error(`Multiple users named ${DEMO_USERNAME}; aborting to stay safe.`);
  if (existing.length === 1) return existing[0].id;
  return d.insert(users).values({ username: DEMO_USERNAME, createdAt: new Date() }).returning().get().id;
}

function wipeDemo(userId: number) {
  const d = db();
  d.delete(measurements).where(eq(measurements.userId, userId)).run();
  d.delete(foodEntries).where(eq(foodEntries.userId, userId)).run();
}

function noise(scale: number) { return (Math.random() - 0.5) * scale; }

function seed(userId: number) {
  const d = db();
  const now = Date.now();
  const dayMs = 86_400_000;
  const cats = ['run', 'walk', 'gym', 'yoga'];

  for (let i = DAYS; i >= 0; i--) {
    const t = new Date(now - i * dayMs);
    const progress = (DAYS - i) / DAYS; // 0 -> 1 over time
    // Engineered correlation: activity up -> weight down -> mood up
    const activityMin = Math.max(0, Math.round(15 + progress * 35 + noise(20)));
    const weight = +(85 - progress * 6 + noise(0.6)).toFixed(1);
    const mood = Math.min(5, Math.max(1, Math.round(2.5 + progress * 2 + noise(1))));

    d.insert(measurements).values({ userId, loggedAt: t, kind: 'weight', valueNumeric: weight }).run();
    d.insert(measurements).values({ userId, loggedAt: t, kind: 'mood', valueNumeric: mood }).run();
    if (activityMin > 0) {
      d.insert(measurements).values({
        userId, loggedAt: t, kind: 'activity',
        category: cats[i % cats.length], valueNumeric: activityMin,
      }).run();
    }
  }

  const userImgDir = join(IMG_ROOT, String(userId));
  mkdirSync(userImgDir, { recursive: true });
  const dishes = ['Oatmeal & berries', 'Chicken salad', 'Salmon & rice', 'Veggie stir-fry', 'Greek yogurt'];
  let imageCount = 0;
  for (let n = 0; n < 18; n++) {
    const t = new Date(now - Math.floor((n / 18) * DAYS) * dayMs - 3_600_000 * (n % 6));
    const withImage = n % 4 === 0;
    let imagePath: string | null = null;
    if (withImage) {
      const srcIdx = (imageCount % 4) + 1;
      imageCount++;
      const src = resolve('scripts/seed-assets', `meal-${srcIdx}.jpg`);
      const name = `seed-${n}.jpg`;
      if (existsSync(src)) { copyFileSync(src, join(userImgDir, name)); imagePath = `${userId}/${name}`; }
    }
    d.insert(foodEntries).values({
      userId, loggedAt: t,
      source: withImage ? 'photo' : 'text',
      rawText: dishes[n % dishes.length],
      dishName: dishes[n % dishes.length],
      imagePath,
      estimatedKcal: 300 + (n % 5) * 120,
    }).run();
  }
}

const userId = ensureDemoUser();
wipeDemo(userId);
seed(userId);
console.log(`Seeded demo user (id=${userId}) with ${DAYS} days of correlated data.`);
