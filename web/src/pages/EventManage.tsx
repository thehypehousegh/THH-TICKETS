import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../data/AuthContext';
import {
  getEvent,
  getOrganizer,
  getOrCreateSupportThread,
  watchEventBatches,
  watchEventDiscounts,
  watchPurchaseRequests,
  generateCodes,
  createDiscount,
  setDiscountActive,
  deleteDiscount,
  markPurchaseRequestPaid,
} from '../data/queries';
import { computeEventStats } from '../utils/stats';
import { reservationMessage } from '../utils/codes';
import { SupportChat } from '../components/SupportChat';
import { Button, Card, Field, Input, Tag } from '../components/ui';
import type { BatchRecord, DiscountKind, DiscountRecord, DiscountValueType, EventRecord, PurchaseRequest, SupportThread, TicketSelection } from '../data/types';

export function EventManage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, organizer } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [openBatch, setOpenBatch] = useState<string | null>(null);
  const [thread, setThread] = useState<SupportThread | null>(null);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then(setEvent);
    const u1 = watchEventBatches(eventId, setBatches);
    const u2 = watchEventDiscounts(eventId, setDiscounts);
    const u3 = watchPurchaseRequests(eventId, setRequests);
    return () => { u1(); u2(); u3(); };
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    getOrganizer(event.hostUid)
      .then((owner) => getOrCreateSupportThread(event.hostUid, owner?.name ?? 'Organizer', event.id, event.name))
      .then((t) => { if (!cancelled) setThread(t); })
      .catch((err) => console.error('[EventManage] could not open support thread:', err));
    return () => { cancelled = true; };
  }, [event]);

  const stats = useMemo(() => (event ? computeEventStats(event, batches) : null), [event, batches]);
  const shareUrl = eventId ? `${window.location.origin}/e/${eventId}` : '';
  const isOwner = event && user && event.hostUid === user.uid;
  const isAdminViewer = organizer?.isAdmin && !isOwner;

  if (!event) return <div className="mx-auto max-w-4xl px-4 py-16 text-text-dim">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {isAdminViewer && (
        <div className="mb-4 rounded-lg border border-warm/40 bg-warm/10 px-3 py-2 text-sm text-warm">
          You're viewing this as admin -- changes you make here apply directly to this organizer's event.
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{event.name}</h1>
          <p className="text-text-dim">Join code: <span className="font-mono">{event.id}</span></p>
        </div>
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy share link</Button>
      </div>

      {stats && (
        <Card className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Paid" value={stats.paidTotal} />
          <Stat label="Self-generated" value={stats.freeTotal} />
          <Stat label="Total attendees" value={stats.total} />
          <Stat label="Verified / unverified" value={`${stats.verified} / ${stats.unverified}`} />
        </Card>
      )}

      <PendingOrders event={event} requests={requests} />

      <GenerateCodes event={event} />

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="font-medium text-text">Patrons</h2>
        {batches.length === 0 ? (
          <p className="text-sm text-text-dim">No codes issued yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {batches.map((b) => (
              <div key={b.id} className="rounded-lg border border-divider p-3">
                <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpenBatch(openBatch === b.id ? null : b.id)}>
                  <div>
                    <p className="font-medium text-text">{b.person}</p>
                    <p className="text-xs text-text-dim">{b.contact}{b.email ? ` · ${b.email}` : ''}</p>
                  </div>
                  <Tag variant={b.source === 'online' ? 'accent' : 'outline'}>{b.source === 'online' ? 'Paid' : 'Self-generated'}</Tag>
                </button>
                {openBatch === b.id && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-divider pt-3">
                    {b.codes.map((c) => (
                      <div key={c.id} className="flex flex-col items-center gap-1 rounded-lg border border-divider p-2">
                        <QRCodeSVG value={c.code} size={96} bgColor="transparent" fgColor="#e9e9ed" />
                        <p className="font-mono text-xs text-text">{c.code}</p>
                        <p className="text-[11px] text-text-dim">{c.type}</p>
                        <Tag variant={c.usedAt ? 'good' : 'outline'}>{c.usedAt ? 'Checked in' : 'Not checked in'}</Tag>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      onClick={() => navigator.clipboard.writeText(reservationMessage(event, b))}
                      className="self-start"
                    >
                      Copy reservation message
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Discounts event={event} discounts={discounts} />

      {thread && user && (
        <Card className="mt-6 flex flex-col gap-3">
          <h2 className="font-medium text-text">{isAdminViewer ? 'Message organizer about this event' : 'Message admin about this event'}</h2>
          <SupportChat
            threadId={thread.id}
            myUid={user.uid}
            myRole={organizer?.isAdmin ? 'admin' : 'organizer'}
            myName={organizer?.isAdmin ? 'Admin' : organizer?.name ?? 'Organizer'}
          />
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-text">{value}</p>
      <p className="text-xs text-text-dim">{label}</p>
    </div>
  );
}

function PendingOrders({ event, requests }: { event: EventRecord; requests: PurchaseRequest[] }) {
  const pending = requests.filter((r) => r.status === 'pending');
  if (pending.length === 0) return null;

  async function fulfill(r: PurchaseRequest) {
    if (!confirm(`Confirm payment of GHS ${r.amount.toFixed(2)} from ${r.buyerName} and issue their code(s)?`)) return;
    const selections: TicketSelection[] = r.items.map((i) => ({ typeLabel: i.label, typeCode: i.code, quantity: i.quantity }));
    await generateCodes(event, r.buyerName, r.buyerContact, r.buyerEmail, selections, 'online');
    await markPurchaseRequestPaid(r.id);
  }

  return (
    <Card className="mb-6 flex flex-col gap-3">
      <h2 className="font-medium text-text">Pending orders ({pending.length})</h2>
      <p className="text-xs text-text-dim">
        Online payment isn't wired up yet -- confirm payment with the buyer directly, then issue their
        code(s) here.
      </p>
      {pending.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-divider p-3">
          <div>
            <p className="font-medium text-text">{r.buyerName} · GHS {r.amount.toFixed(2)}</p>
            <p className="text-xs text-text-dim">
              {r.buyerContact}{r.buyerEmail ? ` · ${r.buyerEmail}` : ''} · {r.items.map((i) => `${i.quantity}x ${i.label}`).join(', ')}
            </p>
          </div>
          <Button onClick={() => fulfill(r)}>Confirm &amp; issue codes</Button>
        </div>
      ))}
    </Card>
  );
}

function GenerateCodes({ event }: { event: EventRecord }) {
  const [person, setPerson] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const selections: TicketSelection[] = event.ticketTypes
      .map((t) => ({ typeLabel: t.label, typeCode: t.code, quantity: quantities[t.id] ?? 0 }))
      .filter((s) => s.quantity > 0);
    if (!person.trim() || selections.length === 0) return;
    setSaving(true);
    try {
      await generateCodes(event, person.trim(), contact.trim(), email.trim(), selections, 'manual');
      setPerson(''); setContact(''); setEmail(''); setQuantities({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6 flex flex-col gap-3">
      <h2 className="font-medium text-text">Generate complimentary / guest codes</h2>
      <p className="text-xs text-text-dim">
        Not paid for -- for comps, guests, or walk-ins. Shows as "Self-generated" everywhere, including
        the verifier app.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name"><Input value={person} onChange={(e) => setPerson(e.target.value)} required /></Field>
          <Field label="Contact"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
          <Field label="Email (optional)"><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></Field>
        </div>
        <div className="flex flex-wrap gap-3">
          {event.ticketTypes.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm text-text-dim">
              {t.label}
              <input
                type="number"
                min={0}
                value={quantities[t.id] ?? 0}
                onChange={(e) => setQuantities((q) => ({ ...q, [t.id]: Math.max(0, Number(e.target.value)) }))}
                className="w-16 rounded-lg border border-divider bg-surface-hi px-2 py-1 text-center text-text"
              />
            </label>
          ))}
        </div>
        <Button type="submit" disabled={saving} className="self-start">{saving ? 'Generating...' : 'Generate codes'}</Button>
      </form>
    </Card>
  );
}

const DISCOUNT_KINDS: DiscountKind[] = ['earlybird', 'special', 'group', 'combo', 'other'];

function Discounts({ event, discounts }: { event: EventRecord; discounts: DiscountRecord[] }) {
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<DiscountKind>('earlybird');
  const [valueType, setValueType] = useState<DiscountValueType>('percent');
  const [value, setValue] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [showPublicly, setShowPublicly] = useState(false);
  const [publicInfo, setPublicInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await createDiscount(event.id, {
      code,
      kind,
      valueType,
      value: Number(value) || 0,
      ticketTypeIds: [],
      expiresAt: expiresAt || null,
      showPublicly,
      publicInfo: showPublicly && publicInfo.trim() ? publicInfo.trim() : null,
    });
    setCode('');
    setExpiresAt('');
    setShowPublicly(false);
    setPublicInfo('');
  }

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-medium text-text">Discounts</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
        <Field label="Code (blank = auto)"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value as DiscountKind)} className="w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text">
            {DISCOUNT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Value type">
          <select value={valueType} onChange={(e) => setValueType(e.target.value as DiscountValueType)} className="w-full rounded-lg border border-divider bg-surface px-3 py-2.5 text-sm text-text">
            <option value="percent">Percent</option>
            <option value="flat">Flat (GHS)</option>
          </select>
        </Field>
        <Field label="Value"><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Expires (blank = never)">
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-text sm:col-span-3">
          <input type="checkbox" checked={showPublicly} onChange={(e) => setShowPublicly(e.target.checked)} className="h-4 w-4" />
          Advertise this discount publicly, near ticket pricing on the event page
        </label>
        {showPublicly && (
          <Field label="Promo text shown to visitors" className="sm:col-span-4">
            <Input
              value={publicInfo}
              onChange={(e) => setPublicInfo(e.target.value)}
              placeholder='e.g. "Early Bird -- 20% off, first 50 tickets only"'
            />
          </Field>
        )}
        <Button type="submit" className="sm:col-span-4 sm:self-start">Create discount</Button>
      </form>

      <div className="flex flex-col gap-2">
        {discounts.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-divider p-3">
            <div>
              <p className="font-mono text-sm text-text">{d.code}</p>
              <p className="text-xs text-text-dim">
                {d.kind} · {d.valueType === 'percent' ? `${d.value}%` : `GHS ${d.value}`}
                {d.expiresAt ? ` · expires ${d.expiresAt}` : ' · no expiry'}
                {d.showPublicly ? ' · advertised publicly' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setDiscountActive(event.id, d.id, !d.active)}>
                {d.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="danger" onClick={() => deleteDiscount(event.id, d.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
