import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { extractStoragePath } from './storagePath';

if (!getApps().length) initializeApp();

// How long an event's flyer stays after it's over, per the platform owner's
// request: "at most 2 weeks after Event has been marked as Ended or
// Completed per End date". There's no separate "endedAt" timestamp on an
// event record -- only its originally scheduled endDate/endTime -- so an
// event ended early (status flips to 'ended' before its scheduled end)
// keeps that scheduled date as the cleanup anchor rather than the moment it
// was actually ended. A precise endedAt field is a possible future
// refinement if that gap matters in practice.
const CLEANUP_AFTER_DAYS = 14;

export const cleanupExpiredFlyers = onSchedule('every day 03:00', async () => {
  const db = getFirestore();
  const bucket = getStorage().bucket();
  const now = Date.now();

  const snap = await db.collection('events').get();
  const stale = snap.docs.filter((doc) => {
    const event = doc.data() as { flyerUrl?: string | null; endDate?: string; endTime?: string };
    if (!event.flyerUrl || !event.endDate) return false;
    const end = new Date(`${event.endDate}T${event.endTime || '23:59'}:00`).getTime();
    return (now - end) / 86400000 >= CLEANUP_AFTER_DAYS;
  });

  await Promise.all(
    stale.map(async (doc) => {
      const flyerUrl = (doc.data() as { flyerUrl: string }).flyerUrl;
      try {
        const path = extractStoragePath(flyerUrl);
        if (path) await bucket.file(path).delete({ ignoreNotFound: true });
        await doc.ref.update({ flyerUrl: null });
      } catch (err) {
        console.error(`[cleanupExpiredFlyers] failed for event ${doc.id}:`, err);
      }
    })
  );

  console.log(`[cleanupExpiredFlyers] cleaned up ${stale.length} expired flyer(s).`);
});
