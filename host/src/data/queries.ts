import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/app';
import { generateJoinCode } from './joinCode';
import { makeCode } from '../utils/codes';
import type { BatchRecord, CodeRecord, EventRecord, NewEventInput, TicketSelection } from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function createEvent(hostUid: string, input: NewEventInput): Promise<EventRecord> {
  const salt = uid().toUpperCase().slice(0, 7);
  const createdAt = new Date().toISOString();

  // Retry on the (very unlikely) chance a freshly-generated join code already
  // exists as another event's ID.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateJoinCode();
    const ref = doc(db, 'events', id);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const event: EventRecord = {
      id,
      hostUid,
      name: input.name,
      description: input.description,
      date: input.date,
      time: input.time,
      venueName: input.venueName,
      venuePin: input.venuePin,
      flyerUrl: input.flyerUrl,
      abbr: input.abbr,
      salt,
      thhFirst: input.thhFirst,
      ticketTypes: input.ticketTypes.map((t) => ({ id: uid(), label: t.label, code: t.code, price: t.price })),
      ussdShortCode: null,
      createdAt,
    };
    await setDoc(ref, event);
    return event;
  }
  throw new Error('Could not generate a unique event code -- please try again.');
}

export async function deleteEvent(eventId: string): Promise<void> {
  const codesSnap = await getDocs(collection(db, 'events', eventId, 'codes'));
  const batchesSnap = await getDocs(collection(db, 'events', eventId, 'batches'));
  const batch = writeBatch(db);
  codesSnap.forEach((d) => batch.delete(d.ref));
  batchesSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'events', eventId));
  await batch.commit();
}

export async function generateCodes(
  event: EventRecord,
  person: string,
  contact: string,
  selections: TicketSelection[]
): Promise<BatchRecord> {
  const batchRef = doc(collection(db, 'events', event.id, 'batches'));
  const createdAt = new Date().toISOString();
  const codes: CodeRecord[] = [];
  const writer = writeBatch(db);

  writer.set(batchRef, {
    id: batchRef.id,
    eventId: event.id,
    person,
    contact,
    source: 'manual',
    createdAt,
  });

  selections.forEach((sel) => {
    for (let i = 0; i < sel.quantity; i++) {
      const codeRef = doc(collection(db, 'events', event.id, 'codes'));
      const record: CodeRecord = {
        id: codeRef.id,
        code: makeCode(event, sel.typeCode),
        type: sel.typeLabel,
        usedAt: null,
        usedBy: null,
      };
      writer.set(codeRef, { ...record, batchId: batchRef.id, createdAt });
      codes.push(record);
    }
  });

  await writer.commit();
  return { id: batchRef.id, eventId: event.id, person, contact, source: 'manual', createdAt, codes };
}

export async function deleteCode(eventId: string, batchId: string, codeId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId, 'codes', codeId));
  const remaining = await getDocs(query(collection(db, 'events', eventId, 'codes'), where('batchId', '==', batchId)));
  if (remaining.empty) {
    await deleteDoc(doc(db, 'events', eventId, 'batches', batchId));
  }
}

export async function setCodeUsed(eventId: string, codeId: string, used: boolean, usedBy: string | null): Promise<void> {
  await updateDoc(doc(db, 'events', eventId, 'codes', codeId), {
    usedAt: used ? new Date().toISOString() : null,
    usedBy: used ? usedBy : null,
  });
}

export function watchHostEvents(hostUid: string, onChange: (events: EventRecord[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), where('hostUid', '==', hostUid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as EventRecord));
  });
}

/**
 * Live batches+codes for one event, joined client-side into BatchRecord[]
 * (Firestore keeps them as sibling subcollections so verifier writes can be
 * restricted to just the codes' usedAt/usedBy fields -- see /firestore.rules).
 */
export function watchEventBatches(eventId: string, onChange: (batches: BatchRecord[]) => void): Unsubscribe {
  let batchDocs: Record<string, Omit<BatchRecord, 'codes'>> = {};
  let codeDocs: Record<string, CodeRecord & { batchId: string }> = {};

  const emit = () => {
    const batches = Object.values(batchDocs)
      .map((b) => ({
        ...b,
        codes: Object.values(codeDocs).filter((c) => c.batchId === b.id),
      }))
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
