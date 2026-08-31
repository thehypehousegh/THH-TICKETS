import { describeEventTiming } from '../utils/eventTiming';
import type { EventRecord } from '../data/types';

const TONE: Record<string, string> = {
  Ended: 'bg-white/5 text-text-dim',
  Completed: 'bg-white/5 text-text-dim',
  Ongoing: 'bg-good/15 text-good',
  Today: 'bg-accent/20 text-accent2',
};

export function StatusBadge({ event }: { event: EventRecord }) {
  const label = describeEventTiming(event);
  const cls = TONE[label] ?? 'bg-accent/10 text-accent2';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
