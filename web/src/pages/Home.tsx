import { useEffect, useMemo, useState } from 'react';
import { watchPublishedEvents } from '../data/queries';
import { describeEventTiming } from '../utils/eventTiming';
import { EventCard } from '../components/EventCard';
import type { EventRecord } from '../data/types';

type Tab = 'upcoming' | 'ongoing' | 'ended';

export function Home() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = watchPublishedEvents((e) => {
      setEvents(e);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const label = describeEventTiming(e);
      const bucket: Tab = label === 'Ongoing' || label === 'Today' ? 'ongoing' : label === 'Ended' || label === 'Completed' ? 'ended' : 'upcoming';
      if (bucket !== tab) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q) || e.venueName.toLowerCase().includes(q);
    });
  }, [events, tab, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-text">Events happening now</h1>
        <p className="text-text-dim">
          Publicity and tickets for events created on THH Events, published from either the web or the mobile
          host app.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-divider bg-surface p-1">
          {(['upcoming', 'ongoing', 'ended'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? 'bg-accent text-white' : 'text-text-dim hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events or venues..."
          className="w-full max-w-xs rounded-lg border border-divider bg-surface px-3 py-2 text-sm text-text placeholder:text-text-dim focus:border-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="text-text-dim">Loading events...</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-text-dim">No {tab} events right now.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}
