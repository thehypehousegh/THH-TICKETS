import type { EventRecord } from '../data/types';

/**
 * A human, at-a-glance status for an event card/header: whether it manually
 * ended early, naturally completed (past its end date/time), is happening
 * right now, or how far off it starts. Purely a display computation -- it
 * never writes anything back, so it's always accurate even though the
 * event's stored `status` field only changes on an explicit host action.
 */
export function describeEventTiming(event: Pick<EventRecord, 'status' | 'startDate' | 'startTime' | 'endDate' | 'endTime'>): string {
  if (event.status === 'ended') return 'Ended';

  const now = new Date();
  const start = new Date(`${event.startDate}T${event.startTime || '00:00'}:00`);
  const end = new Date(`${event.endDate}T${event.endTime || '23:59'}:00`);

  if (now.getTime() > end.getTime()) return 'Completed';
  if (now.getTime() >= start.getTime()) return 'Ongoing';

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysUntil = Math.round((startDay.getTime() - nowDay.getTime()) / 86400000);

  if (daysUntil <= 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil < 7) return `${daysUntil} day${daysUntil === 1 ? '' : 's'} more`;
  if (daysUntil < 30) {
    const weeks = Math.round(daysUntil / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} more`;
  }
  const months = Math.round(daysUntil / 30);
  return `${months} month${months === 1 ? '' : 's'} more`;
}
