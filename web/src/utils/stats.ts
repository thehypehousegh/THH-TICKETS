import type { BatchRecord, EventRecord } from '../data/types';

export interface TicketTypeStats {
  label: string;
  paid: number;
  free: number;
}

export interface EventStats {
  byType: TicketTypeStats[];
  paidTotal: number;
  freeTotal: number;
  total: number;
  verified: number;
  unverified: number;
}

/**
 * Paid = came from a batch with source 'online' (a purchase, once online
 * sales are wired up). Free/self-generated = source 'manual' -- whatever the
 * host typed in on the Generate screen for walk-ins, comps, or guest codes.
 * Ticket types not yet used by any issued code still show up (at zero) so
 * the breakdown always lists every type defined on the event.
 */
export function computeEventStats(event: EventRecord, batches: BatchRecord[]): EventStats {
  const byTypeMap = new Map<string, TicketTypeStats>();
  event.ticketTypes.forEach((t) => byTypeMap.set(t.label, { label: t.label, paid: 0, free: 0 }));

  let paidTotal = 0;
  let freeTotal = 0;
  let verified = 0;

  batches.forEach((b) => {
    b.codes.forEach((c) => {
      let bucket = byTypeMap.get(c.type);
      if (!bucket) {
        bucket = { label: c.type, paid: 0, free: 0 };
        byTypeMap.set(c.type, bucket);
      }
      if (b.source === 'online') {
        bucket.paid++;
        paidTotal++;
      } else {
        bucket.free++;
        freeTotal++;
      }
      if (c.usedAt) verified++;
    });
  });

  const total = paidTotal + freeTotal;
  return {
    byType: Array.from(byTypeMap.values()),
    paidTotal,
    freeTotal,
    total,
    verified,
    unverified: total - verified,
  };
}
