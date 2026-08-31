import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getEvent, findDiscountByCode, submitPurchaseRequest, verifyPaystackPayment, type PaidOrder } from '../data/queries';
import { describeEventTiming } from '../utils/eventTiming';
import { longWhen } from '../utils/codes';
import { PAYSTACK_PUBLIC_KEY, payWithPaystack, generatePaystackReference } from '../paystack';
import { Button, Card, Field, Input } from '../components/ui';
import type { DiscountRecord, EventRecord, PurchaseRequestItem } from '../data/types';

export function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<DiscountRecord | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paidOrder, setPaidOrder] = useState<PaidOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paystackEnabled = Boolean(PAYSTACK_PUBLIC_KEY);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then(setEvent)
      .finally(() => setLoading(false));
  }, [eventId]);

  const timing = event ? describeEventTiming(event) : '';
  const salesClosed = timing === 'Ended' || timing === 'Completed';

  const items: PurchaseRequestItem[] = useMemo(() => {
    if (!event) return [];
    return event.ticketTypes
      .map((t) => ({ ticketTypeId: t.id, label: t.label, code: t.code, price: t.price, quantity: quantities[t.id] ?? 0 }))
      .filter((i) => i.quantity > 0);
  }, [event, quantities]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    const applicable = items.filter((i) => discount.ticketTypeIds.length === 0 || discount.ticketTypeIds.includes(i.ticketTypeId));
    const applicableTotal = applicable.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return discount.valueType === 'percent' ? applicableTotal * (discount.value / 100) : Math.min(discount.value, applicableTotal);
  }, [discount, items]);
  const total = Math.max(0, subtotal - discountAmount);

  async function applyDiscount() {
    if (!event || !discountCode.trim()) return;
    setDiscountError(null);
    const match = await findDiscountByCode(event.id, discountCode);
    if (!match) {
      setDiscount(null);
      setDiscountError('That discount code is not valid for this event.');
      return;
    }
    setDiscount(match);
  }

  async function handleCheckout() {
    if (!event || items.length === 0 || !buyerName.trim() || !buyerContact.trim()) return;
    if (paystackEnabled && !buyerEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      if (paystackEnabled) {
        const reference = generatePaystackReference();
        await payWithPaystack({
          email: buyerEmail.trim(),
          amountGHS: total,
          reference,
          metadata: { eventId: event.id, eventName: event.name },
        });
        const order = await verifyPaystackPayment({
          reference,
          eventId: event.id,
          buyerName: buyerName.trim(),
          buyerContact: buyerContact.trim(),
          buyerEmail: buyerEmail.trim(),
          items: items.map((i) => ({ ticketTypeId: i.ticketTypeId, quantity: i.quantity })),
          discountCode: discount?.code ?? null,
        });
        setPaidOrder(order);
      } else {
        await submitPurchaseRequest(event, buyerName.trim(), buyerContact.trim(), buyerEmail.trim(), items, discount?.code ?? null, total);
      }
      setConfirmed(true);
    } catch (err) {
      setError(err instanceof Error && err.message === 'Payment cancelled.' ? 'Payment was cancelled.' : 'Could not complete your order. Please try again -- if you were charged, contact the organizer with your payment reference.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-text-dim">Loading event...</div>;
  if (!event) return <div className="mx-auto max-w-3xl px-4 py-16 text-text-dim">Event not found.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 overflow-hidden rounded-xl border border-divider bg-surface">
        {event.flyerUrl && <img src={event.flyerUrl} alt={event.name} className="max-h-[420px] w-full object-cover" />}
        <div className="p-5">
          <h1 className="text-2xl font-semibold text-text">{event.name}</h1>
          <p className="mt-1 text-text-dim">{longWhen(event)} · {timing}</p>
          <p className="text-text-dim">{event.venueName}</p>
          {event.ussdShortCode && (
            <p className="mt-2 font-mono text-sm text-accent2">Dial {event.ussdShortCode} to buy via USSD</p>
          )}
          {event.description && <p className="mt-4 whitespace-pre-line text-sm text-text">{event.description}</p>}
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-medium text-text">Tickets</h2>

        {salesClosed ? (
          <p className="text-text-dim">Ticket sales are closed for this event.</p>
        ) : confirmed ? (
          <div className="rounded-lg border border-good/30 bg-good/10 p-4 text-sm text-good">
            {paidOrder ? (
              <div className="flex flex-col gap-3">
                <p>Payment received -- here {paidOrder.codes.length === 1 ? 'is your ticket code' : 'are your ticket codes'}:</p>
                <div className="flex flex-col gap-1.5">
                  {paidOrder.codes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-good/30 bg-surface px-3 py-2 font-mono text-text">
                      <span>{c.code}</span>
                      <span className="text-xs text-text-dim">{c.type}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-dim">
                  Screenshot or write these down -- show one at the door for each person. A receipt was also sent
                  to {buyerEmail} by Paystack.
                </p>
              </div>
            ) : (
              <>Order received. Online payment isn't wired up yet, so the organizer will reach out via{' '}
              {buyerContact || buyerEmail} to confirm and issue your ticket code(s).</>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {event.ticketTypes.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-divider p-3">
                  <div>
                    <p className="font-medium text-text">{t.label}</p>
                    <p className="text-sm text-text-dim">GHS {t.price.toFixed(2)}</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={quantities[t.id] ?? 0}
                    onChange={(e) => setQuantities((q) => ({ ...q, [t.id]: Math.max(0, Number(e.target.value)) }))}
                    className="w-16 rounded-lg border border-divider bg-surface-hi px-2 py-1.5 text-center text-text"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input placeholder="Discount code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
              <Button variant="secondary" onClick={applyDiscount} type="button">Apply</Button>
            </div>
            {discountError && <p className="text-sm text-danger">{discountError}</p>}
            {discount && <p className="text-sm text-good">Discount "{discount.code}" applied.</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Your name" />
              </Field>
              <Field label="Contact (phone)">
                <Input value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} placeholder="0XX XXX XXXX" />
              </Field>
              <Field label={paystackEnabled ? 'Email (required for payment receipt)' : 'Email (optional -- ticket code sent here too)'}>
                <Input
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  required={paystackEnabled}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between border-t border-divider pt-3">
              <div className="text-sm text-text-dim">
                {items.length === 0 ? 'Select at least one ticket' : `${items.reduce((s, i) => s + i.quantity, 0)} ticket(s)`}
              </div>
              <div className="text-lg font-semibold text-text">GHS {total.toFixed(2)}</div>
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button
              disabled={
                items.length === 0 ||
                !buyerName.trim() ||
                !buyerContact.trim() ||
                (paystackEnabled && !buyerEmail.trim()) ||
                submitting
              }
              onClick={handleCheckout}
            >
              {submitting ? (paystackEnabled ? 'Waiting for payment...' : 'Submitting...') : paystackEnabled ? 'Pay with Paystack' : 'Checkout'}
            </Button>
            <p className="text-xs text-text-dim">
              {paystackEnabled
                ? 'Pay by card or mobile money via Paystack. Your ticket code(s) appear on screen the moment payment is confirmed.'
                : "Online card/mobile-money payment isn't set up for this event yet. Checkout reserves your order and the organizer follows up directly to confirm payment and send your ticket code."}
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
