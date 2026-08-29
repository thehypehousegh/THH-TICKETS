import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { EventImportPayload } from '../db/queries';
import type { BatchRecord, EventRecord } from '../db/types';

const FORMAT = 'thh-ticket-export';
const FORMAT_VERSION = 1;

const BACKUP_FORMAT = 'thh-ticket-full-backup';
const BACKUP_FORMAT_VERSION = 1;

function sanitize(s: string) {
  return s.replace(/[^A-Za-z0-9_-]/g, '-');
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function buildEventExport(event: EventRecord, batches: BatchRecord[]) {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      date: event.date,
      time: event.time,
      description: event.description,
      abbr: event.abbr,
      salt: event.salt,
      thhFirst: event.thhFirst,
      createdAt: event.createdAt,
      hostKey: event.hostKey,
      hostMasterKey: event.hostMasterKey,
    },
    types: event.types.map((t) => ({ id: t.id, label: t.label, code: t.code })),
    batches: batches.map((b) => ({
      id: b.id,
      person: b.person,
      createdAt: b.createdAt,
      codes: b.codes.map((c) => ({ id: c.id, code: c.code, type: c.type, usedAt: c.usedAt })),
    })),
  };
}

export async function exportEventData(event: EventRecord, batches: BatchRecord[]): Promise<void> {
  const payload = buildEventExport(event, batches);
  const json = JSON.stringify(payload, null, 2);
  const file = new File(Paths.cache, `${sanitize(event.abbr)}-${sanitize(event.name)}.thhticket.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: `${event.name} — event data` });
  }
}

export type SaveOutcome = 'saved' | 'canceled' | 'failed';

/**
 * Lets the user pick an on-device folder (Files/SAF on Android, Files/iCloud
 * Drive on iOS) and writes the export straight there — no detour through the
 * share sheet and whatever app happens to handle it.
 */
export async function saveEventDataToDevice(event: EventRecord, batches: BatchRecord[]): Promise<SaveOutcome> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return 'canceled';
  }

  try {
    const payload = buildEventExport(event, batches);
    const json = JSON.stringify(payload, null, 2);
    const name = `${sanitize(event.abbr)}-${sanitize(event.name)}-${compactTimestamp()}.thhticket.json`;
    const file = directory.createFile(name, 'application/json');
    file.write(json);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export interface FullBackupPayload {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  deviceRole: string | null;
  hostMasterKey: string | null;
  events: ReturnType<typeof buildEventExport>[];
}

/**
 * Everything this device has, in one file — every event this phone knows
 * about (created or imported) plus its own role and recovery key. Meant as
 * the reliable, app-controlled equivalent of "uninstall keeps my data": no
 * app can hook the OS uninstall dialog, so back up and restore explicitly
 * instead of hoping the platform's own backup feature covers it.
 */
export function buildFullBackup(
  events: EventRecord[],
  batchesForEvent: (eventId: string) => BatchRecord[],
  deviceRole: string | null,
  hostMasterKey: string | null
): FullBackupPayload {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    deviceRole,
    hostMasterKey,
    events: events.map((e) => buildEventExport(e, batchesForEvent(e.id))),
  };
}

export async function exportFullBackup(payload: FullBackupPayload): Promise<void> {
  const json = JSON.stringify(payload, null, 2);
  const file = new File(Paths.cache, `thh-tickets-backup-${compactTimestamp()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'THH Ticket Codes — full backup' });
  }
}

export async function saveFullBackupToDevice(payload: FullBackupPayload): Promise<SaveOutcome> {
  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch {
    return 'canceled';
  }

  try {
    const json = JSON.stringify(payload, null, 2);
    const name = `thh-tickets-backup-${compactTimestamp()}.json`;
    const file = directory.createFile(name, 'application/json');
    file.write(json);
    return 'saved';
  } catch {
    return 'failed';
  }
}

export type FullBackupImportOutcome =
  | { status: 'imported'; payload: FullBackupPayload }
  | { status: 'canceled' }
  | { status: 'invalid'; reason: string };

export async function pickAndParseFullBackupImport(): Promise<FullBackupImportOutcome> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };

  try {
    const file = new File(result.assets[0].uri);
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed?.format !== BACKUP_FORMAT || !Array.isArray(parsed.events)) {
      return { status: 'invalid', reason: 'This file is not a THH Ticket Codes full backup.' };
    }
    const payload: FullBackupPayload = {
      format: BACKUP_FORMAT,
      version: parsed.version ?? 1,
      exportedAt: parsed.exportedAt ?? '',
      deviceRole: parsed.deviceRole ?? null,
      hostMasterKey: parsed.hostMasterKey ?? null,
      events: parsed.events.map((e: any) => ({
        ...e,
        event: {
          ...e.event,
          hostKey: typeof e.event?.hostKey === 'string' ? e.event.hostKey : '',
          hostMasterKey: typeof e.event?.hostMasterKey === 'string' ? e.event.hostMasterKey : '',
        },
        types: Array.isArray(e.types) ? e.types : [],
        batches: Array.isArray(e.batches) ? e.batches : [],
      })),
    };
    return { status: 'imported', payload };
  } catch (e) {
    return { status: 'invalid', reason: 'Could not read that file.' };
  }
}

export type ImportOutcome =
  | { status: 'imported'; payload: EventImportPayload }
  | { status: 'canceled' }
  | { status: 'invalid'; reason: string };

export async function pickAndParseEventImport(): Promise<ImportOutcome> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return { status: 'canceled' };

  try {
    const file = new File(result.assets[0].uri);
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed?.format !== FORMAT || !parsed.event || !Array.isArray(parsed.batches)) {
      return { status: 'invalid', reason: 'This file is not a THH Ticket Codes event export.' };
    }
    const payload: EventImportPayload = {
      event: {
        ...parsed.event,
        hostKey: typeof parsed.event.hostKey === 'string' ? parsed.event.hostKey : '',
        hostMasterKey: typeof parsed.event.hostMasterKey === 'string' ? parsed.event.hostMasterKey : '',
      },
      types: Array.isArray(parsed.types) ? parsed.types : [],
      batches: parsed.batches,
    };
    return { status: 'imported', payload };
  } catch (e) {
    return { status: 'invalid', reason: 'Could not read that file.' };
  }
}
