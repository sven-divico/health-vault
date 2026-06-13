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
    estimatedKcal: integer('estimated_kcal'),
    visionConfidence: real('vision_confidence'),
  },
  (t) => ({
    userTimeIdx: index('food_user_time_idx').on(t.userId, t.loggedAt),
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

export type User = typeof users.$inferSelect;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type Measurement = typeof measurements.$inferSelect;
