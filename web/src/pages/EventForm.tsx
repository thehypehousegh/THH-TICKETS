import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { createEvent, updateEvent, getEvent } from '../data/queries';
import { uploadImage } from '../firebase/upload';
import { abbrFromName } from '../utils/codes';
import { Button, Card, Field, Input, Textarea } from '../components/ui';
import type { NewEventInput, TicketType } from '../data/types';

type DraftTicketType = { label: string; code: string; price: string };

const emptyTicket: DraftTicketType = { label: '', code: 'R', price: '0' };

export function EventForm() {
  const { user } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const isEdit = Boolean(eventId);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [abbr, setAbbr] = useState('');
  const [thhFirst, setThhFirst] = useState(true);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [tickets, setTickets] = useState<DraftTicketType[]>([{ ...emptyTicket }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId).then((e) => {
      if (!e) return;
      setName(e.name);
      setDescription(e.description);
      setStartDate(e.startDate);
      setStartTime(e.startTime);
      setEndDate(e.endDate);
      setEndTime(e.endTime);
      setVenueName(e.venueName);
      setAbbr(e.abbr);
      setThhFirst(e.thhFirst);
      setFlyerUrl(e.flyerUrl);
      setTickets(e.ticketTypes.map((t: TicketType) => ({ label: t.label, code: t.code, price: String(t.price) })));
    });
  }, [eventId]);

  function updateTicket(i: number, patch: Partial<DraftTicketType>) {
    setTickets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let finalFlyerUrl = flyerUrl;
      if (flyerFile) finalFlyerUrl = await uploadImage(user.uid, 'flyer', flyerFile);

      const input: NewEventInput = {
        name,
        description,
        startDate,
        startTime,
        endDate,
        endTime,
        venueName,
        venuePin: null,
        flyerUrl: finalFlyerUrl,
        abbr: abbr.trim() || abbrFromName(name),
        thhFirst,
        ticketTypes: tickets
          .filter((t) => t.label.trim())
          .map((t) => ({ label: t.label.trim(), code: t.code.trim() || 'R', price: Number(t.price) || 0 })),
      };

      if (isEdit && eventId) {
        await updateEvent(eventId, input);
        navigate(`/dashboard/events/${eventId}`);
      } else {
        const created = await createEvent(user.uid, input);
        navigate(`/dashboard/events/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-text">{isEdit ? 'Edit event' : 'Create event'}</h1>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-text">Details</h2>
          <Field label="Event name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Flyer image">
            <input type="file" accept="image/*" onChange={(e) => setFlyerFile(e.target.files?.[0] ?? null)} className="text-sm text-text-dim" />
            {flyerUrl && !flyerFile && <img src={flyerUrl} alt="" className="mt-2 h-32 rounded-lg object-cover" />}
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-text">Date &amp; time</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></Field>
            <Field label="Start time"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></Field>
            <Field label="End date"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></Field>
            <Field label="End time"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required /></Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-text">Venue</h2>
          <Field label="Venue name">
            <Input value={venueName} onChange={(e) => setVenueName(e.target.value)} required />
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-medium text-text">Ticket types</h2>
          {tickets.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_100px_auto] items-end gap-2">
              <Field label="Label">
                <Input value={t.label} onChange={(e) => updateTicket(i, { label: e.target.value })} placeholder="Regular" />
              </Field>
              <Field label="Code">
                <Input value={t.code} onChange={(e) => updateTicket(i, { code: e.target.value.toUpperCase() })} placeholder="R" />
              </Field>
              <Field label="Price (GHS)">
                <Input type="number" min={0} value={t.price} onChange={(e) => updateTicket(i, { price: e.target.value })} />
              </Field>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTickets((prev) => prev.filter((_, idx) => idx !== i))}
                disabled={tickets.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={() => setTickets((prev) => [...prev, { ...emptyTicket }])}>
            Add ticket type
          </Button>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-medium text-text">Code format</h2>
          <Field label="Event abbreviation (used in generated codes)">
            <Input value={abbr} onChange={(e) => setAbbr(e.target.value.toUpperCase())} placeholder={abbrFromName(name || 'Event')} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-text-dim">
            <input type="checkbox" checked={thhFirst} onChange={(e) => setThhFirst(e.target.checked)} />
            THH-prefixed codes (uncheck to lead with the event abbreviation instead)
          </label>
        </Card>

        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create event'}</Button>
      </form>
    </div>
  );
}
