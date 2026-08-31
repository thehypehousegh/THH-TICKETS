import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { extractStoragePath } from './storagePath';

if (!getApps().length) initializeApp();

// Wipes everything tied to the calling account: their events (and each
// event's batches/codes/discounts subcollections), purchase requests against
// those events, support threads they opened, their organizer profile, any
// flyer/logo images in Storage, and finally the Auth user itself. Runs with
// the Admin SDK, so it bypasses firestore.rules entirely -- request.auth.uid
// (verified by the callable-function wrapper, not client-supplied) is the
// only account this can ever touch.
export const deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to delete your account.');
  }

  const db = getFirestore();
  const storagePaths: string[] = [];

  const eventsSnap = await db.collection('events').where('hostUid', '==', uid).get();
  for (const eventDoc of eventsSnap.docs) {
    const flyerPath = extractStoragePath((eventDoc.data() as { flyerUrl?: string }).flyerUrl);
    if (flyerPath) storagePaths.push(flyerPath);
    await db.recursiveDelete(eventDoc.ref);
  }

  const purchaseRequestsSnap = await db.collection('purchaseRequests').where('hostUid', '==', uid).get();
  await Promise.all(purchaseRequestsSnap.docs.map((d) => d.ref.delete()));

  const threadsSnap = await db.collection('supportThreads').where('organizerUid', '==', uid).get();
  for (const threadDoc of threadsSnap.docs) {
    await db.recursiveDelete(threadDoc.ref);
  }

  const organizerRef = db.collection('organizers').doc(uid);
  const organizerSnap = await organizerRef.get();
  const logoPath = extractStoragePath((organizerSnap.data() as { logoUrl?: string } | undefined)?.logoUrl);
  if (logoPath) storagePaths.push(logoPath);
  await organizerRef.delete();

  const bucket = getStorage().bucket();
  await Promise.allSettled(storagePaths.map((path) => bucket.file(path).delete({ ignoreNotFound: true })));

  await getAuth().deleteUser(uid);

  return { ok: true };
});
