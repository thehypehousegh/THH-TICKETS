import { collection, doc, getDoc, onSnapshot, updateDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/app';
import type { BatchRecord, CodeRecord, EventRecord } from './types';

export type JoinOutcome =
  | { status: 'found'; event: EventRecord }
  | { status: 'not-found' }
  | { status: 'error' };

export async function fetchEvent(eventId: string): Promise<JoinOutcome> {
  try {
    const snap = await getDoc(doc(db, 'events', eventId.trim().toUpperCase()));
    if (!snap.exists()) return { status: 'not-found' };
    return { status: 'found', event: snap.data() as EventRecord };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Live batches+codes for one event, joined client-side -- same shape and
 * same reasoning as the host app's watchEventBatches: codes live in their
 * own subcollection so security rules can restrict this app to touching
 * only usedAt/usedBy, never a code's actual content.
 */
export function watchEventBatches(eventId: string, onChange: (batches: BatchRecord[]) => void): Unsubscribe {
  let batchDocs: Record<string, Omit<BatchRecord, 'codes'>> = {};
  let codeDocs: Record<string, CodeRecord & { batchId: string }> = {};

  const emit = () => {
    const batches = Object.values(batchDocs)
      .map((b) => ({ ...b, codes: Object.values(codeDocs).filter((c) => c.batchId === b.id) }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    onChange(batches);
  };

  const unsubBatches = onSnapshot(collection(db, 'events', eventId, 'batches'), (snap) => {
    batchDocs = {};
    snap.forEach((d) => { batchDocs[d.id] = d.data() as Omit<BatchRecord, 'codes'>; });
    emit();
  });
  const unsubCodes = onSnapshot(collection(db, 'events', eventId, 'codes'), (snap) => {
    codeDocs = {};
    snap.forEach((d) => { codeDocs[d.id] = d.data() as CodeRecord & { batchId: string }; });
    emit();
  });

  return () => {
    unsubBatches();
    unsubCodes();
  };
}

export async function setCodeUsed(eventId: string, codeId: string, used: boolean, usedBy: string): Promise<void> {
  await updateDoc(doc(db, 'events', eventId, 'codes', codeId), {
    usedAt: used ? new Date().toISOString() : null,
    usedBy: used ? usedBy : null,
  });
}
