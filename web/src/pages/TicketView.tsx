import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getEvent, getCodeByValue } from '../data/queries';
import { longWhen } from '../utils/codes';
import { Card } from '../components/ui';
import type { CodeRecord, EventRecord } from '../data/types';

/**
 * Public, no-login QR view for one issued ticket code -- linked to from the
 * on-screen payment confirmation today, and from the future SMS ticket
 * delivery (functions/src/sms.ts) once a provider is wired up. The URL
 * carries eventId + code rather than a bare global code so the lookup stays
 * scoped to one event's own codes subcollection (already public by design
 * for door check-in), instead of needing a platform-wide codes index.
 */
export function TicketView() {
  const { eventId, code } = useParams<{ eventId: string; code: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [ticket, setTicket] = useState<CodeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !code) return;
    Promise.all([getEvent(eventId), getCodeByValue(eventId, code)])
      .then(([e, c]) => {
        setEvent(e);
        setTicket(c);
      })
      .finally(() => setLoading(false));
  }, [eventId, code]);

  if (loading) return <div className="mx-auto max-w-sm px-4 py-16 text-center text-text-dim">Loading ticket...</div>;
  if (!event || !ticket) return <div className="mx-auto max-w-sm px-4 py-16 text-center text-text-dim">Ticket not found.</div>;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <Card className="flex flex-col items-center gap-4 text-center">
        <div>
          <h1 className="text-lg font-semibold text-text">{event.name}</h1>
          <p className="text-sm text-text-dim">{longWhen(event)}</p>
          <p className="text-sm text-text-dim">{event.venueName}</p>
        </div>
        <div className="rounded-xl bg-white p-4">
          <QRCodeSVG value={ticket.code} size={200} />
        </div>
        <div>
          <p className="font-mono text-base text-text">{ticket.code}</p>
          <p className="text-xs text-text-dim">{ticket.type}</p>
        </div>
        {ticket.usedAt ? (
          <p className="rounded-lg border border-warm/30 bg-warm/10 px-3 py-1.5 text-xs text-warm">
            Already checked in at {new Date(ticket.usedAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-text-dim">Show this screen at the door -- no need to print it.</p>
        )}
      </Card>
    </div>
  );
}
