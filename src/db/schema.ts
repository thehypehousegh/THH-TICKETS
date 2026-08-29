import { type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'thh-tickets.db';

const MIGRATIONS: string[] = [
  // v1
  `
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      venue TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      abbr TEXT NOT NULL,
      salt TEXT NOT NULL,
      thh_first INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_types (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      code TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY NOT NULL,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      person TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codes (
      id TEXT PRIMARY KEY NOT NULL,
      batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      type_label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      used_at TEXT DEFAULT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ticket_types_event ON ticket_types(event_id);
    CREATE INDEX IF NOT EXISTS idx_batches_event ON batches(event_id);
    CREATE INDEX IF NOT EXISTS idx_codes_batch ON codes(batch_id);
  `,
  // v2 — device role (host / verifier) and any future one-off local settings
  `
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    await db.execAsync(MIGRATIONS[v]);
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}
