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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-divider bg-surface/80 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-2xl hover:shadow-accent/30"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface-hi">
        {event.flyerUrl ? (
          <img
            src={event.flyerUrl}
            alt={event.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center p-4 text-center text-sm font-medium text-white/80"
            style={{ backgroundImage: 'var(--gradient-brand)' }}
          >
            {event.name}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/10" />
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
        <h3 className="line-clamp-1 font-semibold text-text">{event.name}</h3>
        <p className="line-clamp-1 text-xs text-text-dim">{longWhen(event)}</p>
        <p className="line-clamp-1 text-xs text-text-dim">{event.venueName}</p>
        <p className="gradient-brand-text mt-auto pt-1 text-sm font-bold">
          {cheapest === null ? 'Free' : cheapest === 0 ? 'Free' : `From GHS ${cheapest.toFixed(2)}`}
        </p>
      </div>
    </Link>
  );
}
