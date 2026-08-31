import { describeEventTiming } from '../utils/eventTiming';
import type { EventRecord } from '../data/types';

const TONE: Record<string, string> = {
  Ended: 'bg-white/10 text-text-dim',
  Completed: 'bg-white/10 text-text-dim',
  Ongoing: 'bg-good/25 text-good shadow-[0_0_12px_-2px] shadow-good/50',
  Today: 'bg-hot/25 text-hot shadow-[0_0_12px_-2px] shadow-hot/50',
  Tomorrow: 'bg-warm/25 text-warm',
};

export function StatusBadge({ event }: { event: EventRecord }) {
  const label = describeEventTiming(event);
  const cls = TONE[label] ?? 'bg-accent/25 text-accent2';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
