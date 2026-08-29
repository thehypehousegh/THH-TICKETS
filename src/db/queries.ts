import { type SQLiteDatabase } from 'expo-sqlite';
import { makeCode, salt, uid, SALT_LENGTH } from '../utils/codes';
import type { BatchRecord, EventRecord, NewEventInput, TicketSelection } from './types';

function earliestNonNull(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

interface EventRow {
  id: string;
  name: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  abbr: string;
  salt: string;
  thh_first: number;
  created_at: string;
}

interface TicketTypeRow {
  id: string;
  event_id: string;
  label: string;
  code: string;
}

interface BatchRow {
  id: string;
  event_id: string;
  person: string;
  created_at: string;
}

interface CodeRow {
  id: string;
  batch_id: string;
  code: string;
  type_label: string;
  used_at: string | null;
}

export async function fetchEvents(db: SQLiteDatabase): Promise<EventRecord[]> {
  const eventRows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY created_at DESC');
  const typeRows = await db.getAllAsync<TicketTypeRow>('SELECT * FROM ticket_types ORDER BY sort_order ASC');

  return eventRows.map((row) => ({
    id: row.id,
    name: row.name,
    venue: row.venue,
    date: row.date,
    time: row.time,
    description: row.description,
    abbr: row.abbr,
    salt: row.salt,
    thhFirst: !!row.thh_first,
    createdAt: row.created_at,
    types: typeRows
      .filter((t) => t.event_id === row.id)
      .map((t) => ({ id: t.id, label: t.label, code: t.code })),
  }));
}

export async function fetchBatches(db: SQLiteDatabase, eventId?: string): Promise<BatchRecord[]> {
  const batchRows = eventId
    ? await db.getAllAsync<BatchRow>(
        'SELECT * FROM batches WHERE event_id = ? ORDER BY created_at DESC',
        [eventId]
      )
    : await db.getAllAsync<BatchRow>('SELECT * FROM batches ORDER BY created_at DESC');
  const codeRows = await db.getAllAsync<CodeRow>('SELECT * FROM codes ORDER BY sort_order ASC');

  return batchRows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    person: row.person,
    createdAt: row.created_at,
    codes: codeRows
      .filter((c) => c.batch_id === row.id)
      .map((c) => ({ id: c.id, code: c.code, type: c.type_label, usedAt: c.used_at })),
  }));
}

export async function insertEvent(db: SQLiteDatabase, input: NewEventInput): Promise<EventRecord> {
  const id = uid();
  const createdAt = new Date().toISOString();
  const eventSalt = salt(SALT_LENGTH);
  const types = input.types.filter((t) => t.label.trim());

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO events (id, name, venue, date, time, description, abbr, salt, thh_first, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name, input.venue, input.date, input.time, input.description, input.abbr, eventSalt, input.thhFirst ? 1 : 0, createdAt]
    );
    for (let i = 0; i < types.length; i++) {
      await db.runAsync(
        `INSERT INTO ticket_types (id, event_id, label, code, sort_order) VALUES (?, ?, ?, ?, ?)`,
        [uid(), id, types[i].label.trim(), (types[i].code || types[i].label[0]).toUpperCase(), i]
      );
    }
  });

  return {
    id,
    name: input.name,
    venue: input.venue,
    date: input.date,
    time: input.time,
    description: input.description,
    abbr: input.abbr,
    salt: eventSalt,
    thhFirst: input.thhFirst,
    createdAt,
    types: types.map((t) => ({ id: uid(), label: t.label.trim(), code: (t.code || t.label[0]).toUpperCase() })),
  };
}

export async function insertBatch(
  db: SQLiteDatabase,
  event: EventRecord,
  person: string,
  selections: TicketSelection[]
): Promise<BatchRecord> {
  const id = uid();
  const createdAt = new Date().toISOString();
  const codes: { id: string; code: string; type: string }[] = [];
  selections.forEach((sel) => {
    for (let i = 0; i < sel.quantity; i++) {
      codes.push({ id: uid(), code: makeCode(event, sel.typeCode), type: sel.typeLabel });
    }
  });

  await db.withTransactionAsync(async () => {
    await db.runAsync(`INSERT INTO batches (id, event_id, person, created_at) VALUES (?, ?, ?, ?)`, [
      id,
      event.id,
      person,
      createdAt,
    ]);
    for (let i = 0; i < codes.length; i++) {
      await db.runAsync(
        `INSERT INTO codes (id, batch_id, code, type_label, sort_order) VALUES (?, ?, ?, ?, ?)`,
        [codes[i].id, id, codes[i].code, codes[i].type, i]
      );
    }
  });

  return {
    id,
    eventId: event.id,
    person,
    createdAt,
    codes: codes.map((c) => ({ id: c.id, code: c.code, type: c.type, usedAt: null })),
  };
}

export async function setCodeUsedAsync(db: SQLiteDatabase, codeId: string, used: boolean): Promise<void> {
  await db.runAsync('UPDATE codes SET used_at = ? WHERE id = ?', [used ? new Date().toISOString() : null, codeId]);
}

export interface EventImportPayload {
  event: {
    id: string;
    name: string;
    venue: string;
    date: string;
    time: string;
    description: string;
    abbr: string;
    salt: string;
    thhFirst: boolean;
    createdAt: string;
  };
  types: { id: string; label: string; code: string }[];
  batches: {
    id: string;
    person: string;
    createdAt: string;
    codes: { id: string; code: string; type: string; usedAt: string | null }[];
  }[];
}

/**
 * Merge semantics that work for both directions this is used in:
 *  - Handing an event to a fresh device (nothing local yet) — everything is a
 *    plain insert.
 *  - Reconciling a verifier phone's results back into a device that already
 *    has the event — for a code both sides already know about, the earlier of
 *    the two check-in timestamps wins, so importing never erases a check-in
 *    recorded elsewhere, and combining several phones' results just works.
 * An event's own descriptive fields (name/venue/date/...) are always refreshed
 * to the incoming copy; they don't carry any state worth protecting.
 */
export async function importEvent(db: SQLiteDatabase, payload: EventImportPayload): Promise<void> {
  const { event, types, batches } = payload;

  await db.withTransactionAsync(async () => {
    const existingEvent = await db.getFirstAsync<{ id: string }>('SELECT id FROM events WHERE id = ?', [event.id]);
    if (existingEvent) {
      await db.runAsync(
        `UPDATE events SET name = ?, venue = ?, date = ?, time = ?, description = ?, abbr = ?, salt = ?, thh_first = ? WHERE id = ?`,
        [event.name, event.venue, event.date, event.time, event.description, event.abbr, event.salt, event.thhFirst ? 1 : 0, event.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO events (id, name, venue, date, time, description, abbr, salt, thh_first, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [event.id, event.name, event.venue, event.date, event.time, event.description, event.abbr, event.salt, event.thhFirst ? 1 : 0, event.createdAt]
      );
    }

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const existingType = await db.getFirstAsync<{ id: string }>('SELECT id FROM ticket_types WHERE id = ?', [t.id]);
      if (existingType) {
        await db.runAsync('UPDATE ticket_types SET label = ?, code = ?, sort_order = ? WHERE id = ?', [t.label, t.code, i, t.id]);
      } else {
        await db.runAsync(
          'INSERT INTO ticket_types (id, event_id, label, code, sort_order) VALUES (?, ?, ?, ?, ?)',
          [t.id, event.id, t.label, t.code, i]
        );
      }
    }

    for (const batch of batches) {
      const existingBatch = await db.getFirstAsync<{ id: string }>('SELECT id FROM batches WHERE id = ?', [batch.id]);
      if (!existingBatch) {
        await db.runAsync('INSERT INTO batches (id, event_id, person, created_at) VALUES (?, ?, ?, ?)', [
          batch.id,
          event.id,
          batch.person,
          batch.createdAt,
        ]);
      }
      for (let i = 0; i < batch.codes.length; i++) {
        const c = batch.codes[i];
        const existingCode = await db.getFirstAsync<{ id: string; used_at: string | null }>(
          'SELECT id, used_at FROM codes WHERE id = ?',
          [c.id]
        );
        if (!existingCode) {
          // First time this device has seen this code — e.g. the initial hand-off
          // from the main phone to a door-verifier phone.
          await db.runAsync(
            'INSERT INTO codes (id, batch_id, code, type_label, sort_order, used_at) VALUES (?, ?, ?, ?, ?, ?)',
            [c.id, batch.id, c.code, c.type, i, c.usedAt]
          );
        } else {
          // Reconciling a verifier phone's results back into a device that
          // already had this code — adopt whichever check-in happened first,
          // so results from multiple door phones combine into one true state
          // without a scan on one phone ever erasing a scan recorded on another.
          const merged = earliestNonNull(existingCode.used_at, c.usedAt);
          if (merged !== existingCode.used_at) {
            await db.runAsync('UPDATE codes SET used_at = ? WHERE id = ?', [merged, c.id]);
          }
        }
      }
    }
  });
}
