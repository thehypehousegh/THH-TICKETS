import { type SQLiteDatabase } from 'expo-sqlite';
import { generateHostKey } from '../utils/codes';
import { DEVICE_ROLE_SETTING_KEY } from './role';
import { getOrCreateHostMasterKey } from './queries';

export const DATABASE_NAME = 'thh-tickets.db';

type Migration = string | ((db: SQLiteDatabase) => Promise<void>);

const MIGRATIONS: Migration[] = [
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
  // v3 — per-event host code, required to promote a verifier device back to host
  `
    ALTER TABLE events ADD COLUMN host_key TEXT NOT NULL DEFAULT '';
  `,
  // v4 — backfill a real host_key for events created before v3 existed, so they
  // aren't permanently stuck unable to ever promote a verifier device
  async (db: SQLiteDatabase) => {
    const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM events WHERE host_key = ''");
    for (const row of rows) {
      await db.runAsync('UPDATE events SET host_key = ? WHERE id = ?', [generateHostKey(), row.id]);
    }
  },
  // v5 — each event also carries its creating host device's own recovery
  // master key, so "I forgot to save this one event's code" has a fallback
  // that doesn't require hardcoding any secret in this (public) source tree
  `
    ALTER TABLE events ADD COLUMN host_master_key TEXT NOT NULL DEFAULT '';
  `,
  // v6 — if this device is (or has been) host, give it a master key now and
  // backfill it onto any of its own events created before v5 existed
  async (db: SQLiteDatabase) => {
    const roleRow = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [DEVICE_ROLE_SETTING_KEY]
    );
    if (roleRow?.value !== 'host') return;

    const masterKey = await getOrCreateHostMasterKey(db);
    await db.runAsync("UPDATE events SET host_master_key = ? WHERE host_master_key = ''", [masterKey]);
  },
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  // SQLite enforces foreign keys (and therefore ON DELETE CASCADE) only when a
  // connection asks for it — it's a per-connection setting, not part of the
  // database file, so this has to run on every launch, not just once ever.
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  for (let v = currentVersion; v < MIGRATIONS.length; v++) {
    const migration = MIGRATIONS[v];
    if (typeof migration === 'string') {
      await db.execAsync(migration);
    } else {
      await migration(db);
    }
    await db.execAsync(`PRAGMA user_version = ${v + 1}`);
  }
}
