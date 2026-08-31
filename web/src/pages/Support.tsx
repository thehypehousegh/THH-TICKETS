import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { getOrCreateSupportThread, watchMyThreads } from '../data/queries';
import { SupportChat } from '../components/SupportChat';
import { Card, Tag } from '../components/ui';
import type { SupportThread } from '../data/types';

const TIPS: { q: string; a: string }[] = [
  {
    q: 'How do I create an event?',
    a: 'Go to Dashboard -> New event. Fill in details, date/time, venue, and at least one ticket type, then Create event. It starts as a Draft -- click Publish on the Dashboard when you\'re ready for it to show on the public Events page.',
  },
  {
    q: 'How do I generate complimentary or guest codes?',
    a: 'Open the event from your Dashboard -> Manage, then use "Generate complimentary / guest codes" -- these are marked Self-generated everywhere, including the verifier.',
  },
  {
    q: 'How do discounts work?',
    a: 'On an event\'s Manage page, create a discount with a code (or leave blank to auto-generate), a percent or flat value, and it applies at checkout when a buyer enters that code.',
  },
  {
    q: 'How does ticket verification work?',
    a: 'Door staff go to /verify (no app install, no login), enter your event\'s join code, then scan or search a ticket code to check someone in.',
  },
  {
    q: 'How do I get paid?',
    a: 'Set your payout method (mobile money or bank) under Payout profile from your Dashboard, so the platform owner knows where to send payouts once a payment flow is confirmed.',
  },
];

export function Support() {
  const { user, organizer } = useAuth();
  const [generalThread, setGeneralThread] = useState<SupportThread | null>(null);
  const [eventThreads, setEventThreads] = useState<SupportThread[]>([]);

  useEffect(() => {
    if (!user || !organizer) return;
    getOrCreateSupportThread(user.uid, organizer.name, null, null).then(setGeneralThread);
    const unsub = watchMyThreads(user.uid, (threads) => setEventThreads(threads.filter((t) => t.eventId)));
    return unsub;
  }, [user, organizer]);

  if (!user || !organizer) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold text-text">Support</h1>
      <p className="mb-6 text-text-dim">Quick answers below, or message the admin directly -- for anything, or about a specific event.</p>

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="font-medium text-text">Common questions</h2>
        <div className="flex flex-col divide-y divide-divider">
          {TIPS.map((t) => (
            <details key={t.q} className="group py-2">
              <summary className="cursor-pointer list-none font-medium text-text marker:content-none">
                <span className="gradient-brand-text">?</span> {t.q}
              </summary>
              <p className="mt-2 text-sm text-text-dim">{t.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <Card className="mb-6 flex flex-col gap-3">
        <h2 className="font-medium text-text">Message the admin</h2>
        {generalThread ? (
          <SupportChat threadId={generalThread.id} myUid={user.uid} myRole="organizer" myName={organizer.name} />
        ) : (
          <p className="text-sm text-text-dim">Loading...</p>
        )}
      </Card>

      {eventThreads.length > 0 && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-medium text-text">Conversations about your events</h2>
          {eventThreads.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-divider p-3">
              <div>
                <p className="text-sm font-medium text-text">{t.eventName}</p>
                <p className="line-clamp-1 text-xs text-text-dim">{t.lastMessagePreview || 'No messages yet'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Tag variant={t.status === 'open' ? 'accent' : 'outline'}>{t.status}</Tag>
                <Link to={`/dashboard/events/${t.eventId}`} className="text-sm font-medium text-accent2 hover:underline">
                  Open event
                </Link>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
