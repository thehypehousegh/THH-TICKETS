import { useEffect, useRef, useState } from 'react';
import { watchThreadMessages, sendSupportMessage } from '../data/queries';
import { Button, Input } from './ui';
import type { SupportMessage } from '../data/types';

interface Props {
  threadId: string;
  myUid: string;
  myRole: 'organizer' | 'admin';
  myName: string;
}

export function SupportChat({ threadId, myUid, myRole, myName }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return watchThreadMessages(
      threadId,
      (msgs) => setMessages(msgs),
      (err) => {
        console.error('[SupportChat] watchThreadMessages failed:', err);
        setError('Could not load messages.');
      }
    );
  }, [threadId]);
  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'nearest' }), [messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendSupportMessage(threadId, myUid, myRole, myName, text);
      setText('');
    } catch (err) {
      console.error('[SupportChat] sendSupportMessage failed:', err);
      setError('Could not send that message -- try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border border-divider bg-surface-hi/50 p-3">
        {messages.length === 0 && <p className="text-sm text-text-dim">No messages yet -- say hello.</p>}
        {messages.map((m) => {
          const mine = m.senderUid === myUid;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  mine ? 'text-white' : 'bg-surface text-text'
                }`}
                style={mine ? { backgroundImage: 'var(--gradient-brand)' } : undefined}
              >
                {String(m.text ?? '')}
              </div>
              <span className="mt-0.5 text-[10px] text-text-dim">
                {m.senderRole === 'admin' ? 'Admin' : m.senderName} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <Button type="submit" disabled={sending || !text.trim()}>Send</Button>
      </form>
    </div>
  );
}
