import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { watchHostEvents, setEventStatus, deleteEvent } from '../data/queries';
import { describeEventTiming } from '../utils/eventTiming';
import { Button, Card, Tag } from '../components/ui';
import type { EventRecord } from '../data/types';

export function Dashboard() {
  const { user, organizer } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = watchHostEvents(user.uid, (e) => {
      setEvents(e);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handlePublish(e: EventRecord) {
    await setEventStatus(e.id, 'published');
  }
  async function handleEnd(e: EventRecord) {
    if (confirm(`End "${e.name}" now? Ticket sales will close immediately.`)) {
      await setEventStatus(e.id, 'ended');
    }
  }
  async function handleDelete(e: EventRecord) {
    if (confirm(`Delete "${e.name}" and all its codes/batches? This cannot be undone.`)) {
      await deleteEvent(e.id);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{organizer?.name ?? 'Your'} events</h1>
          <p className="text-text-dim">Create, publish, and manage events -- same account as the host app.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/profile"><Button variant="secondary">Payout profile</Button></Link>
          <Link to="/dashboard/new"><Button>New event</Button></Link>
        </div>
      </div>

      {loading ? (
        <p className="text-text-dim">Loading...</p>
      ) : events.length === 0 ? (
        <Card className="py-16 text-center text-text-dim">No events yet. Create your first one.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text">{e.name}</p>
                  <Tag variant={e.status === 'published' ? 'good' : 'outline'}>{e.status}</Tag>
                  <Tag>{describeEventTiming(e)}</Tag>
                </div>
                <p className="text-sm text-text-dim">{e.venueName} · join code {e.id}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/dashboard/events/${e.id}`}><Button variant="secondary">Manage</Button></Link>
                <Link to={`/dashboard/events/${e.id}/edit`}><Button variant="secondary">Edit</Button></Link>
                {e.status === 'draft' && <Button onClick={() => handlePublish(e)}>Publish</Button>}
                {e.status === 'published' && <Button variant="secondary" onClick={() => handleEnd(e)}>End live</Button>}
                <Button variant="danger" onClick={() => handleDelete(e)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
