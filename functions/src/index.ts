import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

export { cleanupExpiredFlyers } from './cleanupFlyers';
export { deleteAccount } from './deleteAccount';
export { verifyPaystackPayment } from './paystack';
export { onBatchCreatedSendSms } from './sms';

const groqApiKey = defineSecret('GROQ_API_KEY');

const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_SENT_TO_MODEL = 10;

const SYSTEM_PROMPT = `You are the support assistant for THH Events (thh-tickets.web.app), an
event publicity and ticketing platform run by The Hype House. You help visitors and event
organizers with common questions:

- Buying tickets: browse the Events page, open an event, pick ticket types and quantities,
  enter a discount code if they have one, then checkout with name/contact/email. Online
  payment isn't wired up yet -- checkout reserves the order and the organizer follows up
  directly to confirm payment and issue the ticket code.
- Creating an account / becoming an organizer: sign up from the nav's "Create Event" button
  (organizer name, contact, email, password). The same account works on the mobile host app.
- Creating an event: Dashboard -> New event. Fill in details, date/time, venue, and at least
  one ticket type. New events start as a Draft and must be explicitly Published from the
  Dashboard before they show on the public Events page or allow ticket purchases.
- Managing an event: from Dashboard -> Manage on an event, organizers can see stats
  (paid vs self-generated tickets, verified/unverified), review and confirm pending orders,
  generate complimentary/guest codes, set up discounts, and see the patron list.
- Discounts: created per event on its Manage page -- a code (or auto-generated), a kind
  (early bird, special, group, combo, other), and a percent or flat value.
- Verifying tickets at the door: go to /verify (no login, no app install needed), enter the
  event's join code, then scan or search a ticket code to check someone in.
- Payouts: organizers set a mobile money or bank payout method under Payout profile from
  the Dashboard.

Be concise and friendly. If a question is about someone's specific account, a specific
order/payment, a bug, or anything you are not confident answering correctly, do not guess --
say you'll connect them with the admin instead.

Respond with ONLY a JSON object, no other text: {"reply": "<your reply>", "escalate": <true
if this needs a human, false otherwise>}.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const chatSupport = onCall({ secrets: [groqApiKey] }, async (request) => {
  const messages = request.data?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new HttpsError('invalid-argument', 'messages must be a non-empty array (max 20).');
  }
  for (const m of messages) {
    if (
      !m ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      typeof m.content !== 'string' ||
      m.content.length === 0 ||
      m.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new HttpsError('invalid-argument', 'Each message needs a valid role and content (max 2000 chars).');
    }
  }

  const recent: ChatMessage[] = messages.slice(-HISTORY_SENT_TO_MODEL);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqApiKey.value()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...recent],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    throw new HttpsError('internal', `Groq request failed with status ${res.status}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content ?? '{}';

  let parsed: { reply?: string; escalate?: boolean };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { reply: raw, escalate: false };
  }

  return {
    reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply : "Sorry, I couldn't process that -- try rephrasing, or talk to the admin.",
    escalate: Boolean(parsed.escalate),
  };
});
