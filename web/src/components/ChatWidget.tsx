import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../data/AuthContext';
import { askSupportBot, getOrCreateSupportThread } from '../data/queries';
import { SupportChat } from './SupportChat';
import { Button, Input } from './ui';
import type { ChatBotMessage } from '../data/queries';
import type { SupportThread } from '../data/types';

const GREETING: ChatBotMessage = {
  role: 'assistant',
  content: "Hi! I'm the THH Events assistant. Ask me about creating an event, buying tickets, discounts, verification, or payouts -- or ask to talk to the admin directly.",
};

export function ChatWidget() {
  const { user, organizer } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatBotMessage[]>([GREETING]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestHuman, setSuggestHuman] = useState(false);
  const [humanThread, setHumanThread] = useState<SupportThread | null>(null);
  const [startingHuman, setStartingHuman] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ block: 'nearest' }), [messages.length, humanThread]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    const next = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(next);
    setText('');
    setSending(true);
    try {
      const { reply, escalate } = await askSupportBot(next);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (escalate) setSuggestHuman(true);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: "Something went wrong reaching the assistant -- try again, or talk to the admin directly." }]);
      setSuggestHuman(true);
    } finally {
      setSending(false);
    }
  }

  async function talkToHuman() {
    if (!user || !organizer) return;
    setStartingHuman(true);
    try {
      const thread = await getOrCreateSupportThread(user.uid, organizer.name, null, null);
      setHumanThread(thread);
    } finally {
      setStartingHuman(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-20">
      {open && (
        <div className="mb-3 flex h-[28rem] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-divider bg-surface shadow-2xl shadow-black/40">
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundImage: 'var(--gradient-brand)' }}
          >
            <span className="font-semibold">{humanThread ? 'Chat with admin' : 'THH Events assistant'}</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white" aria-label="Close chat">✕</button>
          </div>

          {humanThread ? (
            <div className="flex-1 overflow-y-auto p-3">
              <SupportChat threadId={humanThread.id} myUid={user!.uid} myRole="organizer" myName={organizer!.name} />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-2">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'text-white' : 'bg-surface-hi text-text'}`}
                        style={m.role === 'user' ? { backgroundImage: 'var(--gradient-brand)' } : undefined}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && <p className="text-xs text-text-dim">Thinking...</p>}
                  <div ref={bottomRef} />
                </div>
              </div>

              {suggestHuman && (
                <div className="border-t border-divider px-3 py-2">
                  {user && organizer ? (
                    <Button variant="secondary" onClick={talkToHuman} disabled={startingHuman} className="w-full text-xs">
                      {startingHuman ? 'Starting...' : 'Talk to the admin instead'}
                    </Button>
                  ) : (
                    <p className="text-xs text-text-dim">
                      <Link to="/login" className="text-accent2 hover:underline">Sign in</Link> or{' '}
                      <Link to="/signup" className="text-accent2 hover:underline">create an account</Link> to message the admin directly.
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={send} className="flex gap-2 border-t border-divider p-3">
                <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question..." />
                <Button type="submit" disabled={sending || !text.trim()}>Send</Button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white shadow-lg shadow-accent/40 transition hover:scale-105"
        style={{ backgroundImage: 'var(--gradient-brand)' }}
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
