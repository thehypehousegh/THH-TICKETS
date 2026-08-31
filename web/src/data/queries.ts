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
import type {
  BatchRecord,
  CodeRecord,
  DiscountKind,
  DiscountRecord,
  DiscountValueType,
  EventRecord,
  EventStatus,
  NewEventInput,
  OrganizerProfile,
  PurchaseRequest,
  PurchaseRequestItem,
  TicketSelection,
} from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const DISCOUNT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateDiscountCode(length = 6): string {
  let s = '';
  for (let i = 0; i < length; i++) s += DISCOUNT_ALPHABET[Math.floor(Math.random() * DISCOUNT_ALPHABET.length)];
  return s;
}

function assertValidDates(startDate: string, startTime: string, endDate: string, endTime: string) {
  const start = new Date(`${startDate}T${startTime || '00:00'}:00`);
  const end = new Date(`${endDate}T${endTime || '23:59'}:00`);
  if (end.getTime() < start.getTime()) {
    throw new Error('End date/time cannot be before the start date/time.');
  }
}

export async function createEvent(hostUid: string, input: NewEventInput): Promise<EventRecord> {
  assertValidDates(input.startDate, input.startTime, input.endDate, input.endTime);
  const salt = uid().toUpperCase().slice(0, 7);
  const createdAt = new Date().toISOString();

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
      startDate: input.startDate,
      startTime: input.startTime,
      endDate: input.endDate,
      endTime: input.endTime,
      venueName: input.venueName,
      venuePin: input.venuePin,
      flyerUrl: input.flyerUrl,
      abbr: input.abbr,
      salt,
      thhFirst: input.thhFirst,
      ticketTypes: input.ticketTypes.map((t) => ({ id: uid(), label: t.label, code: t.code, price: t.price })),
      ussdShortCode: null,
      status: 'draft',
      createdAt,
    };
    await setDoc(ref, event);
    return event;
  }
  throw new Error('Could not generate a unique event code -- please try again.');
}

export async function updateEvent(eventId: string, input: NewEventInput): Promise<void> {
  assertValidDates(input.startDate, input.startTime, input.endDate, input.endTime);
  await updateDoc(doc(db, 'events', eventId), {
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    startTime: input.startTime,
    endDate: input.endDate,
    endTime: input.endTime,
    venueName: input.venueName,
    venuePin: input.venuePin,
    flyerUrl: input.flyerUrl,
    abbr: input.abbr,
    thhFirst: input.thhFirst,
    ticketTypes: input.ticketTypes.map((t) => ({ id: uid(), label: t.label, code: t.code, price: t.price })),
  });
}

export async function setEventStatus(eventId: string, status: EventStatus): Promise<void> {
  await updateDoc(doc(db, 'events', eventId), { status });
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

export async function getEvent(eventId: string): Promise<EventRecord | null> {
  const snap = await getDoc(doc(db, 'events', eventId));
  return snap.exists() ? (snap.data() as EventRecord) : null;
}

export async function generateCodes(
  event: EventRecord,
  person: string,
  contact: string,
  email: string,
  selections: TicketSelection[],
  source: 'manual' | 'online' = 'manual'
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
    email,
    source,
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
  return { id: batchRef.id, eventId: event.id, person, contact, email, source, createdAt, codes };
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

/** Public browse page: every published event, newest first. Ended/draft
 * events are filtered out client-side by describeEventTiming/status so a
 * single listener also covers "ongoing" and "ended" tabs without extra
 * composite-index queries. */
export function watchPublishedEvents(onChange: (events: EventRecord[]) => void): Unsubscribe {
  const q = query(collection(db, 'events'), where('status', '==', 'published'), orderBy('startDate', 'asc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as EventRecord));
  });
}

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

export interface NewDiscountInput {
  code: string; // empty string = auto-generate
  kind: DiscountKind;
  valueType: DiscountValueType;
  value: number;
  ticketTypeIds: string[];
}

export async function createDiscount(eventId: string, input: NewDiscountInput): Promise<DiscountRecord> {
  const ref = doc(collection(db, 'events', eventId, 'discounts'));
  const record: DiscountRecord = {
    id: ref.id,
    eventId,
    code: (input.code.trim() || generateDiscountCode()).toUpperCase(),
    kind: input.kind,
    valueType: input.valueType,
    value: input.value,
    ticketTypeIds: input.ticketTypeIds,
    active: true,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, record);
  return record;
}

export async function setDiscountActive(eventId: string, discountId: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'events', eventId, 'discounts', discountId), { active });
}

export async function deleteDiscount(eventId: string, discountId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId, 'discounts', discountId));
}

export function watchEventDiscounts(eventId: string, onChange: (discounts: DiscountRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'events', eventId, 'discounts'), (snap) => {
    onChange(snap.docs.map((d) => d.data() as DiscountRecord));
  });
}

export async function findDiscountByCode(eventId: string, code: string): Promise<DiscountRecord | null> {
  const snap = await getDocs(
    query(collection(db, 'events', eventId, 'discounts'), where('code', '==', code.trim().toUpperCase()))
  );
  const match = snap.docs.find((d) => (d.data() as DiscountRecord).active);
  return match ? (match.data() as DiscountRecord) : null;
}

/** Super-admin only (see /firestore.rules) -- every event on the platform,
 * regardless of who created it. */
export async function fetchAllEvents(): Promise<EventRecord[]> {
  const snap = await getDocs(collection(db, 'events'));
  return snap.docs.map((d) => d.data() as EventRecord);
}

export async function fetchAllOrganizers(): Promise<OrganizerProfile[]> {
  const snap = await getDocs(collection(db, 'organizers'));
  return snap.docs.map((d) => d.data() as OrganizerProfile);
}

export async function fetchEventBatchesOnce(eventId: string): Promise<BatchRecord[]> {
  const [batchesSnap, codesSnap] = await Promise.all([
    getDocs(collection(db, 'events', eventId, 'batches')),
    getDocs(collection(db, 'events', eventId, 'codes')),
  ]);
  const codes = codesSnap.docs.map((d) => d.data() as CodeRecord & { batchId: string });
  return batchesSnap.docs.map((d) => {
    const b = d.data() as Omit<BatchRecord, 'codes'>;
    return { ...b, codes: codes.filter((c) => c.batchId === b.id) };
  });
}

/** Live pending/paid purchase requests for one event, newest first --
 * used by the organizer's Manage page to review and fulfill orders until
 * Paystack verification (#53) automates this. */
export function watchPurchaseRequests(eventId: string, onChange: (requests: PurchaseRequest[]) => void): Unsubscribe {
  const q = query(collection(db, 'purchaseRequests'), where('eventId', '==', eventId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => d.data() as PurchaseRequest));
  });
}

/** Marks a request as paid once the organizer has manually confirmed payment
 * (see the purchaseRequests rules block: only that request's own hostUid may
 * flip its status). Callers should then generate the matching codes with
 * generateCodes(..., 'online'). */
export async function markPurchaseRequestPaid(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'purchaseRequests', requestId), { status: 'paid' });
}

/**
 * Submits a pending purchase request from the public checkout page. Does not
 * issue codes -- that only happens once Paystack verification lands (#53),
 * server-side. See the purchaseRequests rules block in /firestore.rules for
 * why hostUid is required and re-checked against the event doc.
 */
export async function submitPurchaseRequest(
  event: EventRecord,
  buyerName: string,
  buyerContact: string,
  buyerEmail: string,
  items: PurchaseRequestItem[],
  discountCode: string | null,
  amount: number
): Promise<PurchaseRequest> {
  const ref = doc(collection(db, 'purchaseRequests'));
  const record: PurchaseRequest = {
    id: ref.id,
    eventId: event.id,
    hostUid: event.hostUid,
    buyerName,
    buyerContact,
    buyerEmail,
    items,
    discountCode,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, record);
  return record;
}
