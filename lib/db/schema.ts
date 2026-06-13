import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull(),
    telegramUserId: integer('telegram_user_id'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => ({
    usernameIdx: uniqueIndex('users_username_idx').on(t.username),
    telegramIdx: uniqueIndex('users_telegram_idx').on(t.telegramUserId),
  }),
);

export const inviteTokens = sqliteTable('invite_tokens', {
  token: text('token').primaryKey(),
  proposedUsername: text('proposed_username').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  consumedAt: integer('consumed_at', { mode: 'timestamp' }),
  consumedByUserId: integer('consumed_by_user_id').references(() => users.id),
});

export const loginChallenges = sqliteTable(
  'login_challenges',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: text('session_id').notNull(),
    userId: integer('user_id').notNull().references(() => users.id),
    code: text('code').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    consumedAt: integer('consumed_at', { mode: 'timestamp' }),
  },
  (t) => ({
    sessionIdx: index('login_challenges_session_idx').on(t.sessionId),
  }),
);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  authenticated: integer('authenticated', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});

export const foodEntries = sqliteTable(
  'food_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    loggedAt: integer('logged_at', { mode: 'timestamp' }).notNull(),
    source: text('source', { enum: ['text', 'photo'] }).notNull(),
    rawText: text('raw_text'),
    imagePath: text('image_path'),
    dishName: text('dish_name'),
    ingredientsJson: text('ingredients_json'),
    // Nutrition stored per-100 g + an estimated portion; absolutes are derived on read
    // (lib/nutrition). A portion change scales linearly (no AI); a dish change re-estimates
    // only the per-100 g values.
    portionG: real('portion_g'),
    kcalPer100g: real('kcal_per_100g'),
    carbsGPer100g: real('carbs_g_per_100g'),
    sugarGPer100g: real('sugar_g_per_100g'),
    fatGPer100g: real('fat_g_per_100g'),
    saturatedFatGPer100g: real('saturated_fat_g_per_100g'),
    proteinGPer100g: real('protein_g_per_100g'),
    fiberGPer100g: real('fiber_g_per_100g'),
    saltGPer100g: real('salt_g_per_100g'),
    visionConfidence: real('vision_confidence'),
  },
  (t) => ({
    userTimeIdx: index('food_user_time_idx').on(t.userId, t.loggedAt),
  }),
);

export const drinkEntries = sqliteTable(
  'drink_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    loggedAt: integer('logged_at', { mode: 'timestamp' }).notNull(),
    source: text('source', { enum: ['text', 'web'] }).notNull(),
    name: text('name'),
    volumeMl: real('volume_ml').notNull(),
    // Concentration per 100 ml (same recalc principle as food's per-100 g): a volume edit
    // rescales linearly, a name edit re-estimates these. alcohol_g_per_100ml = ABV% × 0.789.
    alcoholGPer100ml: real('alcohol_g_per_100ml'),
    sugarGPer100ml: real('sugar_g_per_100ml'),
    rawText: text('raw_text'),
    visionConfidence: real('vision_confidence'),
  },
  (t) => ({
    userTimeIdx: index('drink_user_time_idx').on(t.userId, t.loggedAt),
  }),
);

export const measurements = sqliteTable(
  'measurements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    loggedAt: integer('logged_at', { mode: 'timestamp' }).notNull(),
    kind: text('kind', { enum: ['weight', 'mood', 'activity'] }).notNull(),
    category: text('category'),
    valueNumeric: real('value_numeric'),
    valueText: text('value_text'),
    note: text('note'),
  },
  (t) => ({
    userKindTimeIdx: index('measurements_user_kind_time_idx').on(t.userId, t.kind, t.loggedAt),
  }),
);

export const visionUsage = sqliteTable(
  'vision_usage',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    foodEntryId: integer('food_entry_id').references(() => foodEntries.id),
    drinkEntryId: integer('drink_entry_id').references(() => drinkEntries.id),
    loggedAt: integer('logged_at', { mode: 'timestamp' }).notNull(),
    model: text('model').notNull(),
    srcBytes: integer('src_bytes').notNull(),
    sentBytes: integer('sent_bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    costMicroUsd: integer('cost_micro_usd').notNull(),
    visionConfidence: real('vision_confidence'),
    downsampleMs: integer('downsample_ms').notNull(),
  },
  (t) => ({
    userTimeIdx: index('vision_usage_user_time_idx').on(t.userId, t.loggedAt),
  }),
);

export type User = typeof users.$inferSelect;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type DrinkEntry = typeof drinkEntries.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
export type VisionUsageRow = typeof visionUsage.$inferSelect;
