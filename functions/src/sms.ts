import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();

const SITE_BASE_URL = 'https://thh-tickets.web.app';

interface BatchDoc {
  eventId: string;
  person: string;
  contact: string;
}

/**
 * STUB -- no SMS provider is wired up yet. Fires on every new batch (manual,
 * comp, or Paystack-verified online purchase alike, since both paths write
 * to events/{eventId}/batches -- see functions/src/paystack.ts and
 * web/src/data/queries.ts's generateCodes), and logs exactly what a real
 * send would contain. Wiring up a provider later (Twilio, Hubtel, Africa's
 * Talking, etc. -- all viable in Ghana) is then a one-file change: replace
 * the console.log below with a real API call using a secret set the same
 * way GROQ_API_KEY/PAYSTACK_SECRET_KEY are (see README.md's "SMS ticket
 * delivery" section).
 */
export const onBatchCreatedSendSms = onDocumentCreated('events/{eventId}/batches/{batchId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const batch = snap.data() as BatchDoc;
  if (!batch.contact?.trim()) return;

  const db = getFirestore();
  const codesSnap = await db
    .collection('events').doc(batch.eventId).collection('codes')
    .where('batchId', '==', event.params.batchId)
    .get();
  const codes = codesSnap.docs.map((d) => (d.data() as { code: string }).code);
  if (codes.length === 0) return;

  const links = codes.map((code) => `${SITE_BASE_URL}/ticket/${batch.eventId}/${encodeURIComponent(code)}`);
  const message =
    codes.length === 1
      ? `Your THH ticket code: ${codes[0]}. View your QR code: ${links[0]}`
      : `Your THH ticket codes: ${codes.join(', ')}. View QR codes: ${links.join(' ')}`;

  console.log(`[sms stub] would text ${batch.contact} (${batch.person}): ${message}`);
});
