import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { makeCode, type EventLike } from './codes';

if (!getApps().length) initializeApp();

const paystackSecretKey = defineSecret('PAYSTACK_SECRET_KEY');

interface VerifyItem {
  ticketTypeId: string;
  quantity: number;
}

interface VerifyRequest {
  reference: string;
  eventId: string;
  buyerName: string;
  buyerContact: string;
  buyerEmail: string;
  items: VerifyItem[];
  discountCode: string | null;
}

interface TicketType {
  id: string;
  label: string;
  code: string;
  price: number;
}

interface DiscountRecord {
  valueType: 'percent' | 'flat';
  value: number;
  ticketTypeIds: string[];
  active: boolean;
  expiresAt: string | null;
}

// Kept in sync with web/src/data/queries.ts's isDiscountUsable -- a code
// stops applying once its expiry date has fully elapsed, even if `active`
// is still true (expiry is a separate, automatic cutoff a client can't
// override by just resubmitting the same code after it lapses).
function isDiscountUsable(d: DiscountRecord, now = new Date()): boolean {
  if (!d.active) return false;
  if (!d.expiresAt) return true;
  return new Date(`${d.expiresAt}T23:59:59`).getTime() >= now.getTime();
}

interface EventDoc extends EventLike {
  hostUid: string;
  status: string;
  ticketTypes: TicketType[];
}

interface CodeRecord {
  id: string;
  code: string;
  type: string;
  usedAt: null;
  usedBy: null;
}

interface OrderResult {
  batchId: string;
  eventId: string;
  amount: number;
  createdAt: string;
  codes: CodeRecord[];
}

// Verifies a Paystack transaction reference server-side, then -- and only
// then -- issues the matching ticket codes. Nothing about the amount or
// ticket selection is trusted from the client: the price is recomputed from
// the event's own ticketTypes/discounts, and Paystack's own verify endpoint
// (not the client's "payment succeeded" callback, which anyone could fake)
// is the sole source of truth for whether money actually moved. Re-sending
// an already-fulfilled reference returns the original result instead of
// issuing a second batch of codes.
export const verifyPaystackPayment = onCall({ secrets: [paystackSecretKey] }, async (request): Promise<OrderResult> => {
  const data = request.data as VerifyRequest;
  if (!data || typeof data.reference !== 'string' || !data.reference.trim()) {
    throw new HttpsError('invalid-argument', 'A payment reference is required.');
  }
  if (typeof data.eventId !== 'string' || !data.eventId.trim()) {
    throw new HttpsError('invalid-argument', 'eventId is required.');
  }
  if (!data.buyerName?.trim() || !data.buyerContact?.trim()) {
    throw new HttpsError('invalid-argument', 'Buyer name and contact are required.');
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one ticket must be selected.');
  }

  const db = getFirestore();
  const eventRef = db.collection('events').doc(data.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found.');
  const event = eventSnap.data() as EventDoc;
  if (event.status !== 'published') {
    throw new HttpsError('failed-precondition', 'This event is not open for ticket sales.');
  }

  const resolvedItems: { ticketTypeId: string; label: string; code: string; price: number; quantity: number }[] = [];
  let subtotal = 0;
  for (const item of data.items) {
    const quantity = Math.floor(Number(item.quantity));
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    const type = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
    if (!type) throw new HttpsError('invalid-argument', `Unknown ticket type: ${item.ticketTypeId}`);
    resolvedItems.push({ ticketTypeId: type.id, label: type.label, code: type.code, price: type.price, quantity });
    subtotal += type.price * quantity;
  }
  if (resolvedItems.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one ticket must be selected.');
  }

  let discountAmount = 0;
  if (data.discountCode) {
    const discountsSnap = await eventRef
      .collection('discounts')
      .where('code', '==', data.discountCode.trim().toUpperCase())
      .get();
    const discount = discountsSnap.docs.map((d) => d.data() as DiscountRecord).find((d) => isDiscountUsable(d));
    if (discount) {
      const applicable = resolvedItems.filter(
        (i) => discount.ticketTypeIds.length === 0 || discount.ticketTypeIds.includes(i.ticketTypeId)
      );
      const applicableTotal = applicable.reduce((sum, i) => sum + i.price * i.quantity, 0);
      discountAmount = discount.valueType === 'percent' ? applicableTotal * (discount.value / 100) : Math.min(discount.value, applicableTotal);
    }
  }

  const expectedTotal = Math.max(0, subtotal - discountAmount);
  const expectedAmountPesewas = Math.round(expectedTotal * 100);

  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecretKey.value()}` },
  });
  if (!verifyRes.ok) {
    throw new HttpsError('internal', `Paystack verification request failed with status ${verifyRes.status}`);
  }
  const payload = (await verifyRes.json()) as {
    status: boolean;
    data?: { status?: string; amount?: number; currency?: string };
  };
  const tx = payload.data;
  if (!payload.status || !tx || tx.status !== 'success') {
    throw new HttpsError('failed-precondition', 'Payment was not successful.');
  }
  if (tx.currency !== 'GHS') {
    throw new HttpsError('failed-precondition', 'Unexpected payment currency.');
  }
  if (tx.amount !== expectedAmountPesewas) {
    throw new HttpsError('failed-precondition', 'The paid amount does not match this order\'s total.');
  }

  const orderRef = db.collection('paidOrders').doc(data.reference);
  return db.runTransaction(async (txn) => {
    const existing = await txn.get(orderRef);
    if (existing.exists) {
      return existing.data() as OrderResult;
    }

    const batchRef = eventRef.collection('batches').doc();
    const createdAt = new Date().toISOString();
    const codes: CodeRecord[] = [];

    txn.set(batchRef, {
      id: batchRef.id,
      eventId: data.eventId,
      person: data.buyerName.trim(),
      contact: data.buyerContact.trim(),
      email: data.buyerEmail?.trim() ?? '',
      source: 'online',
      createdAt,
    });

    for (const item of resolvedItems) {
      for (let i = 0; i < item.quantity; i++) {
        const codeRef = eventRef.collection('codes').doc();
        const record: CodeRecord = { id: codeRef.id, code: makeCode(event, item.code), type: item.label, usedAt: null, usedBy: null };
        txn.set(codeRef, { ...record, batchId: batchRef.id, createdAt });
        codes.push(record);
      }
    }

    const result: OrderResult = { batchId: batchRef.id, eventId: data.eventId, amount: expectedTotal, createdAt, codes };
    txn.set(orderRef, result);
    return result;
  });
});
