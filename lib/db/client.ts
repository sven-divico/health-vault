import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

function dbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./data/vault.sqlite';
  const path = url.startsWith('file:') ? url.slice('file:'.length) : url;
  if (path === ':memory:' || path === '') return ':memory:';
  return resolve(path);
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _migrated = false;

export function db() {
  if (_db) return _db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  _db = drizzle(sqlite, { schema });
  if (!_migrated) {
    try {
      migrate(_db, { migrationsFolder: resolve('./drizzle') });
      _migrated = true;
    } catch (e) {
      console.error('[db] migration failed (continuing):', e);
    }
  }
  return _db;
}
