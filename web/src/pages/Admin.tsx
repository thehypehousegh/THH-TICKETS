import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { fetchAllEvents, fetchAllOrganizers, fetchEventBatchesOnce, watchAllThreads } from '../data/queries';
import { computeEventStats } from '../utils/stats';
import { describeEventTiming } from '../utils/eventTiming';
import { SupportChat } from '../components/SupportChat';
import { Button, Card, Tag } from '../components/ui';
import type { EventRecord, OrganizerProfile, SupportThread } from '../data/types';

interface OrganizerRollup {
  organizer: OrganizerProfile;
  events: EventRecord[];
  paidRevenue: number;
  paidTickets: number;
  freeTickets: number;
}

function formatPayout(o: OrganizerProfile): string {
  if (!o.payout) return 'Not set';
  if (o.payout.method === 'momo') return `${o.payout.network} · ${o.payout.phone}`;
  return `${o.payout.bankName} · ${o.payout.accountName} · ${o.payout.accountNumber}`;
}

export function Admin() {
  const { user, organizer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rollups, setRollups] = useState<OrganizerRollup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [organizers, events] = await Promise.all([fetchAllOrganizers(), fetchAllEvents()]);
      const eventsByHost = new Map<string, EventRecord[]>();
      events.forEach((e) => eventsByHost.set(e.hostUid, [...(eventsByHost.get(e.hostUid) ?? []), e]));

      const next: OrganizerRollup[] = [];
      for (const org of organizers) {
        const orgEvents = eventsByHost.get(org.uid) ?? [];
        let paidRevenue = 0, paidTickets = 0, freeTickets = 0;
        for (const e of orgEvents) {
          const batches = await fetchEventBatchesOnce(e.id);
          const stats = computeEventStats(e, batches);
          paidTickets += stats.paidTotal;
          freeTickets += stats.freeTotal;
          stats.byType.forEach((t) => {
            const price = e.ticketTypes.find((tt) => tt.label === t.label)?.price ?? 0;
            paidRevenue += price * t.paid;
          });
        }
        next.push({ organizer: org, events: orgEvents, paidRevenue, paidTickets, freeTickets });
      }
      next.sort((a, b) => b.paidRevenue - a.paidRevenue);
      setRollups(next);
    } catch {
      setError('Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizer?.isAdmin) load();
  }, [organizer?.isAdmin, load]);

  useEffect(() => {
    if (!organizer?.isAdmin) return;
    return watchAllThreads(setThreads);
  }, [organizer?.isAdmin]);

  if (!organizer?.isAdmin) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-text-dim">Not authorized.</div>;
  }

  const openThreads = threads.filter((t) => t.status === 'open');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text">Super admin</h1>
        <Button variant="secondary" onClick={load}>Refresh</Button>
      </div>
      <p className="mb-6 text-sm text-text-dim">
        Every organizer and event on the platform. Revenue figures are computed from paid-ticket counts ×
        ticket price, not confirmed Paystack settlements -- use them as an estimate for payouts, not a
        final reconciliation, until online payments are wired up. Click any event to open, edit, or message
        its organizer directly.
      </p>

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="font-medium text-text">Support inbox {openThreads.length > 0 && <span className="text-hot">({openThreads.length} open)</span>}</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-text-dim">No support conversations yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {threads.map((t) => (
              <div key={t.id} className="rounded-lg border border-divider p-3">
                <button
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setOpenThreadId(openThreadId === t.id ? null : t.id)}
                >
                  <div>
                    <p className="font-medium text-text">
                      {t.organizerName} {t.eventName ? <span className="text-text-dim">· {t.eventName}</span> : <span className="text-text-dim">· General</span>}
                    </p>
                    <p className="line-clamp-1 text-xs text-text-dim">{t.lastMessagePreview || 'No messages yet'}</p>
                  </div>
                  <Tag variant={t.status === 'open' ? 'hot' : 'outline'}>{t.status}</Tag>
                </button>
                {openThreadId === t.id && user && (
                  <div className="mt-3 border-t border-divider pt-3">
                    <SupportChat threadId={t.id} myUid={user.uid} myRole="admin" myName="Admin" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <p className="text-text-dim">Loading...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rollups.map((r) => (
            <Card key={r.organizer.uid} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-text">{r.organizer.name}</p>
                <Tag variant="accent">GHS {r.paidRevenue.toFixed(2)}</Tag>
              </div>
              <p className="text-sm text-text-dim">{r.organizer.contact}</p>
              <p className="text-sm text-text-dim">Payout: {formatPayout(r.organizer)}</p>
              <p className="text-sm text-text-dim">
                {r.events.length} event{r.events.length === 1 ? '' : 's'} · {r.paidTickets} paid · {r.freeTickets} self-generated
              </p>
              {r.events.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 border-t border-divider pt-2">
                  {r.events.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-text">{e.name}</span>
                      <div className="flex items-center gap-2">
                        <Tag>{describeEventTiming(e)}</Tag>
                        <Link to={`/dashboard/events/${e.id}`} className="font-medium text-accent2 hover:underline">Manage</Link>
                        <Link to={`/dashboard/events/${e.id}/edit`} className="font-medium text-accent2 hover:underline">Edit</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {rollups.length === 0 && <p className="text-text-dim">No organizers yet.</p>}
        </div>
      )}
    </div>
  );
}
