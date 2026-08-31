import type { ReactNode } from 'react';

export function Privacy() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-sm leading-relaxed text-text-dim">
      <h1 className="mb-1 text-2xl font-semibold text-text">Privacy policy</h1>
      <p className="mb-8 text-xs">Last updated 31 August 2026 -- covers THH Events (this website), and the THH Ticket Codes host and verifier apps.</p>

      <Section title="What we collect">
        <p><strong className="text-text">Account info.</strong> Email and password (handled by Firebase Authentication -- we never see or store your raw password). Organizers also provide a brand name, contact phone/email, and optionally a logo image.</p>
        <p><strong className="text-text">Event content.</strong> Anything an organizer enters to publish an event -- name, description, venue, dates, ticket tiers, discount codes, and an optional flyer image.</p>
        <p><strong className="text-text">Attendee info.</strong> When you request tickets, we collect the buyer name/email and phone number you provide, so an organizer can identify you at the door.</p>
        <p><strong className="text-text">Device permissions (mobile apps only).</strong> Camera (to scan ticket QR codes), photo library (to save/attach QR codes and flyer images), and location (only if an organizer chooses to pin a venue on a map). None of these run in the background -- each is used only while you're actively using that specific feature.</p>
        <p><strong className="text-text">Support &amp; chat messages.</strong> Messages you send to the AI assistant or to an organizer/admin through the in-app support chat.</p>
      </Section>

      <Section title="How we use it">
        <p>To create and secure your account, publish and display events, generate and verify ticket QR codes, let organizers and attendees communicate through support chat, and keep the service reliable and abuse-free (e.g. the login attempt limiter).</p>
      </Section>

      <Section title="Who else sees it">
        <p><strong className="text-text">Firebase (Google Cloud).</strong> All accounts, event data, images, and chat messages are stored on Firebase (Authentication, Firestore, Storage, Cloud Functions), operated by Google.</p>
        <p><strong className="text-text">Groq.</strong> If you use the AI chat assistant, the text of your message (and recent chat history, to keep context) is sent to Groq's API to generate a reply. We don't send your account email or other profile data to Groq.</p>
        <p>We do not sell your data, and we do not use it for advertising.</p>
      </Section>

      <Section title="How long we keep it">
        <p>Account and event data is kept while your account/event exists. An event's flyer image is automatically deleted about two weeks after the event's scheduled end date. You can ask us to delete your account and associated data at any time (see Contact below).</p>
      </Section>

      <Section title="Your choices">
        <p>You can edit or delete your events at any time from your dashboard. You can reset your password or request account deletion from the app, or by contacting us. Camera, photo, and location permissions can be revoked at any time from your device's app settings -- some features (like scanning tickets) won't work without them.</p>
      </Section>

      <Section title="Contact">
        <p>Questions about this policy or your data: reach out through the in-app support chat, or email the organizer account listed on the event you're attending.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-base font-semibold text-text">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
