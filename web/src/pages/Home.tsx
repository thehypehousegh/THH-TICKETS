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
    <div>
      <div className="relative overflow-hidden border-b border-divider">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{ backgroundImage: 'var(--gradient-brand)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundImage: 'var(--gradient-warm)', opacity: 0.35 }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="text-sm font-bold uppercase tracking-widest text-warm">The Hype House presents</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold leading-tight text-text sm:text-5xl">
            Find your next night out. <span className="gradient-brand-text">Grab your ticket.</span>
          </h1>
          <p className="mt-4 max-w-xl text-text-dim">
            Every event created from the web or the mobile host app lands here, live -- browse, buy, and get in.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-divider bg-surface p-1">
            {(['upcoming', 'ongoing', 'ended'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  tab === t ? 'text-white shadow-md shadow-accent/30' : 'text-text-dim hover:text-text'
                }`}
                style={tab === t ? { backgroundImage: 'var(--gradient-brand)' } : undefined}
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
    </div>
  );
}
