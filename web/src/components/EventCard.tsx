import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { longWhen } from '../utils/codes';
import type { EventRecord } from '../data/types';

export function EventCard({ event }: { event: EventRecord }) {
  const cheapest = event.ticketTypes.reduce<number | null>(
    (min, t) => (min === null || t.price < min ? t.price : min),
    null
  );
  return (
    <Link
      to={`/e/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-divider bg-surface transition hover:border-accent/50"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-hi">
        {event.flyerUrl ? (
          <img
            src={event.flyerUrl}
            alt={event.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-dim text-sm">No flyer</div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge event={event} />
        </div>
        {event.ussdShortCode && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 font-mono text-[11px] text-white">
            {event.ussdShortCode}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 text-left">
        <h3 className="line-clamp-1 font-medium text-text">{event.name}</h3>
        <p className="line-clamp-1 text-xs text-text-dim">{longWhen(event)}</p>
        <p className="line-clamp-1 text-xs text-text-dim">{event.venueName}</p>
        <p className="mt-auto pt-1 text-sm font-medium text-accent2">
          {cheapest === null ? 'Free' : cheapest === 0 ? 'Free' : `From GHS ${cheapest.toFixed(2)}`}
        </p>
      </div>
    </Link>
  );
}
