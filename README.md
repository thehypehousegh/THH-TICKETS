# THH Tickets

An e-ticketing platform for The Hype House: organizers create an event (with a
flyer, venue, and priced ticket types), get a shareable link people can buy
tickets from online, and door staff verify tickets live as they're scanned —
no export files, no manual merging, everything syncs through one shared
Firebase backend the instant it happens.

This used to be a single offline app with no server at all. It's been rebuilt
around two small apps plus a shared cloud backend, because live syncing
between a host and multiple door phones — and letting anyone buy a ticket
online — both need a server somewhere; there's no way to do either fully
offline. See "Why two apps, and why online now" below for the trade-off.

## The two apps

- **THH Tickets Host** (`/host`) — for the event organizer. Requires an
  account (email + password, created in-app). Creates events, sets ticket
  prices, generates manual/walk-in codes, scans at the door, exports a PDF
  report, and gets each event's shareable purchase link and door-verifier
  event code.
- **THH Tickets Verifier** (`/verifier`) — for anyone helping check tickets
  at the door. No account, no sign-up — just enter the event's code (from the
  host) and it shows that event's tickets live, ready to scan or search.
  Deliberately small: no event creation, no pricing, no PDF export, nothing
  a verifier doesn't need.

Both apps talk to the same Firebase project, so a code generated on the host
phone or bought online shows up on every verifier phone within moments, and a
check-in from any phone shows up everywhere else the same way.

## Get it on your phone

Both apps are Android APKs published as two separate files on this repo's
[**Releases page**](../../releases/tag/latest), rebuilt automatically on every
push to `main`:

1. Open the Releases page on your phone.
2. Download **`THH-Tickets-Host.apk`** (organizer) or **`THH-Tickets-Verifier.apk`**
   (door staff) — whichever role that phone needs.
3. Open the downloaded file and allow installing from this source when
   Android asks (first time only).

Both are signed with the same fixed debug key committed in this repo
(`.github/keystore/debug.keystore`), so re-downloading and reinstalling over
an existing install upgrades it in place. Android will warn they're from an
"unknown developer" — expected for a direct-install build outside the Play
Store, not a problem.

iOS has no equivalent direct-install path without a paid Apple Developer
account ($99/year) — without one, running either app on iPhone means someone
with the code checked out runs `npx expo start` (from inside `host/` or
`verifier/`) and the phone runs it live through the free **Expo Go** app.

## Why two apps, and why online now

The original version of this app was fully offline: no server, no accounts,
everything lived only on each phone, moved between phones by exporting and
importing files by hand. That worked, but couldn't do two things that were
asked for next: **real-time syncing** between a host and several door phones
without anyone manually exporting/importing, and **selling tickets online** to
people who never touch the host's phone at all. Both need a live server
somewhere every device can reach — there's no offline-only way to do either.

Firebase (Firestore + Auth) is that server. Splitting into two apps flows
naturally from that: the organizer needs a real account (their events are
tied to it, recoverable from any phone), while door staff shouldn't need one
at all — they just need whatever event's code the host hands them, and
nothing else the app can do. One combined app would mean either giving door
staff more access than they need or bolting a confusing role-switcher back
on; two small single-purpose apps are simpler for both audiences.

**The trade-off:** every phone now needs a working internet connection at the
venue — Firestore's client caches recently-seen data and queues a check-in
made mid-blip until the connection returns, so brief flakiness is fine, but
if the venue genuinely has no signal or Wi-Fi at all, neither app can do
anything. That's the deliberate cost of getting live sync and online sales.

## Setting up the Firebase backend (one-time, for whoever runs this)

Both apps need the *same* Firebase project's config dropped into
`host/src/firebase/config.ts` and `verifier/src/firebase/config.ts`:

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add
   project**.
2. **Build → Firestore Database** → **Create database** → production mode →
   pick a region.
3. **Build → Authentication** → **Get started** → enable **Email/Password**
   (for the host app's sign-up) — anonymous sign-in is not required, the
   verifier app uses it automatically once enabled, but email/password is the
   one you must turn on yourself.
4. **Build → Authentication** → also enable **Anonymous** (verifier phones use
   this silently, no UI, just so Firestore's rules can tell "some app" wrote a
   check-in from "literally anyone with no token at all").
5. **Project settings** → **Your apps** → the `</>` (Web) icon → register an
   app → copy the `firebaseConfig` object it shows you into both
   `config.ts` files above.
6. **Firestore Database → Rules** → paste in `/firestore.rules` from this
   repo's root. **Storage → Rules** → paste in `/storage.rules`. These are
   what actually enforce "an organizer can only touch their own events" and
   "a verifier can only flip a code's checked-in state, never its content" —
   without them Firestore's defaults are far more permissive.
7. **Build → Storage** → enable it (used for event flyers and organizer
   logos).

The `firebaseConfig` values are safe to commit even in this **public** repo —
Firebase's security model is enforced by the rules in step 6, not by keeping
the config secret.

## Online ticket sales (not wired up yet)

The data model already has a place for this — ticket prices are set per type
when an event is created, `EventDetailScreen` shows a purchase link, and a
draft/published/ended status plus discount codes are ready for a checkout
flow to use — but two pieces still need real-world setup before anyone can
actually pay for a ticket:

- **Payment**: a real Paystack account (cards + Mobile Money) under the
  organizer's business, with API keys handed over so a server-side function
  can verify each payment before a ticket is issued. Payment status is never
  trusted from the buyer's browser alone — that's how someone would get a
  free ticket.
- **The public purchase page itself**: a small web page (flyer, event
  summary, organizer info, ticket picker, an optional discount code field,
  and a form for the buyer's name, contact, and optional email before
  Paystack checkout) hosted via Firebase Hosting, plus a Cloud Function to
  verify Paystack's webhook, apply any discount, and create the ticket.
  Neither exists yet. The buyer's name/contact/email are meant to land on
  the resulting batch exactly like the host app's manual Generate screen
  already captures them today, so the PDF report and patron follow-up work
  the same regardless of how a code was issued.

**USSD** (`*XXX#` style purchase) is a further step beyond that, and isn't
something any app or Firebase project can provision on its own — it requires
a real relationship with a telecom/USSD aggregator (e.g. Hubtel, Nsano,
Wigal in Ghana), usually a shared short code with a menu path, and typically
some paperwork/fees. There's a `ussdShortCode` field already reserved on the
event record for whenever that's set up.

## Setting up an event (host app)

1. Sign up with an email, password, organizer name, contact, and (optional)
   logo — see "Organizer profile & payouts" below for the rest of the
   profile.
2. **New** → fill in the event: name, description, a **start** date/time and
   an **end** date/time (the end can't be before the start — the form checks),
   venue name, optionally "Use my current location" for a map pin, an
   optional flyer image, and one or more ticket types each with its own
   price. An event starts as a **draft**.
3. Every event created after this update carries a **status** —
   **Draft → Published → Ended** — plus a plain-language **timing badge**
   computed from its dates: `Today`, `3 days more`, `2 weeks more`,
   `Ongoing`, `Completed` (once the end date/time has passed, automatically,
   no action needed), or `Ended` (you stopped it early). A draft event's
   purchase link doesn't sell anything yet — tap **Publish event** on its
   page when you're ready to open sales. **End event now** stops sales
   immediately without waiting for the scheduled end time; already-issued
   codes keep working for door check-in either way. **Edit event** on the
   same page changes any of the details from step 2, any time.
4. **Share event** opens the native share sheet with a ready-made message
   (name, date, venue, description, and the purchase link) — send it
   wherever you'd normally promote the event. The event's page also shows
   its **online purchase link** (copy it directly) and its **door verifier
   event code** — a short code (e.g. `K7RN2QX`) door staff type into the
   Verifier app. Both are generated automatically; there's nothing to
   configure.
5. **Discounts** on the event's page manages percent-off or flat-amount-off
   codes buyers will enter at checkout once online sales are wired up —
   see "Discounts" below.
6. **Generate ticket codes** on that page is for walk-ins, complimentary, or
   guest codes the host issues by hand (a name, optional contact/email, a
   ticket type, and quantity) — free, and completely separate from whatever
   codes online purchases eventually create. Every issued code still gets
   its own QR to copy/share, the same as before.
7. **Event dashboard** on that page breaks down **paid tickets** (from online
   purchases, once wired up) and **self-generated tickets** (from step 6),
   each by ticket type, plus a total-expected/verified/unverified summary —
   all live, updating the instant anything changes anywhere. During
   verification (scan or search, in either app), each match is tagged
   **Paid** or **Self-generated** so door staff can tell at a glance how a
   ticket was obtained.
8. **Export PDF report** any time for a No. / Name / Contact / Code(s) /
   checked-in breakdown — the contact column carries whatever phone/email
   was captured when the code was issued, specifically so organizers can
   reach their own patrons afterward. It reflects live data, including
   check-ins from every verifier phone, since everything already synced
   through Firestore.
9. **Delete event** removes it and everything under it — for everyone,
   including anyone still holding the purchase link or event code — since
   there's no per-device copy left to fall back on once it's gone from the
   shared backend.

## Organizer profile & payouts

Tap your name at the bottom of the Reservations tab to edit your organizer
profile: name, contact, logo, and a **payout method** — Mobile Money
(network + number) or bank (bank name, account name, account number). This
is where proceeds from paid ticket sales are meant to be sent once online
payments exist; it's visible to you and to the platform's super-admin (see
below), nobody else.

## Discounts

From an event's page → **Discounts** → **New discount**: pick a category
(Early bird / Special sale / Group / Combo / Other — these are just labels
for your own reference, every discount works the same way underneath), a
code (or leave it blank to auto-generate one), whether it's a **percentage**
or a **flat GHS amount** off, and which ticket type(s) it applies to (leave
none selected to apply it to every type on the event). Buyers will enter this
code at checkout once the public purchase page exists (see below) to get the
discount applied. Pause (without deleting) or delete a discount any time —
changes apply immediately since discounts are read live at checkout.

## Super-admin access

One account — yours — can see every organizer and every event on the
platform: total events, paid vs. self-generated ticket counts, an estimated
payout amount per organizer (paid tickets × their price — an estimate, not a
reconciled Paystack settlement, until online payments are wired up), and each
organizer's payout details. This is **not** a role you can grant yourself
from inside either app, on purpose — it's a single `isAdmin: true` field on
your own `organizers/{uid}` document, toggled by hand in the Firestore
console (Firestore Database → Data → `organizers` → your document → add
field `isAdmin` = `true`, boolean). Once set, a "Super admin" row appears at
the bottom of the Reservations tab. Firestore's rules (`/firestore.rules`)
check this same field server-side, so it can't be spoofed from a modified
client.

## Verifying tickets at the door (verifier app)

1. Open the app, enter the event's code from the host, tap **Join event**.
   It remembers the event across restarts, so this is a one-time thing per
   phone per event.
2. **Scan QR code** opens the camera; point it at a ticket's QR code. A match
   shows who it's for and a **Check in** button (or **Undo check-in** if
   already used).
3. **Or type part of a code** works without a camera — useful if a code was
   texted or read aloud.
4. **Leave this event** to switch to a different one later.

Every check-in from every phone (host or verifier) shows up on every other
phone within moments — there's no export/import step anymore, and no
after-the-event merge to do.

## Stack

- **Expo (React Native) + TypeScript**, two independent apps (`host/`,
  `verifier/`) sharing one Firebase project.
- **Firebase Auth** — email/password for the host app; silent anonymous
  sign-in for the verifier app (no UI, just enough for Firestore's rules to
  require *some* token on writes).
- **Firestore** — the shared live database: `organizers/{uid}`,
  `events/{eventId}`, and `events/{eventId}/batches|codes/{id}` subcollections.
  Real-time listeners (`onSnapshot`) mean every screen updates itself the
  moment anything changes anywhere, no polling or manual refresh.
- **Firebase Storage** — event flyers and organizer logos
  (`host/src/firebase/upload.ts`).
- **expo-camera** — QR scanning in both apps.
- **expo-image-picker / expo-location** (host only) — flyer/logo picking and
  "use my current location" for a venue map pin.
- **expo-print + expo-sharing** (host only) — the PDF report.
- **react-native-qrcode-svg** (host only) — per-code QR rendering,
  save-to-Photos, and share-as-zip for a whole reservation's codes.

## Where things live

- `firestore.rules`, `storage.rules` — the actual access control (see
  "Setting up the Firebase backend" above for why these matter).
- `host/src/data/` — Firestore-backed data layer (`AuthContext.tsx`,
  `DataContext.tsx`, `queries.ts`, `types.ts`, `joinCode.ts`).
- `host/src/screens/` — Login, Profile (organizer + payout), Events list,
  Create/Edit event (both share `components/EventForm.tsx`), Event detail,
  Generate codes, Output (reservation message + QR), Scan, Discounts,
  Admin (super-admin only), Reservations.
- `host/src/utils/codes.ts` — code generation + reservation-message
  formatting, unchanged from the original design prototype's logic, plus
  `isEventEnded`/date-formatting helpers used across the app.
- `host/src/utils/eventTiming.ts` — the plain-language timing badge
  (`Today`, `3 days more`, `Ongoing`, `Completed`, `Ended`, …) shown on
  event cards and the event detail page.
- `host/src/utils/links.ts` — builds an event's public purchase URL; update
  `PUBLIC_SITE_BASE_URL` once the purchase site (see "Online ticket sales
  (not wired up yet)") is deployed.
- `host/src/utils/stats.ts` — the event dashboard's paid/self-generated/
  verified breakdown, computed from live batches+codes (a batch's `source`
  field is `'online'` for a purchase or `'manual'` for anything the host
  typed in on the Generate screen).
- `verifier/src/` — deliberately small: `data/eventSync.ts` (join +
  live batches/codes + check-in write), `screens/JoinScreen.tsx`,
  `VerifyScreen.tsx`, `ScanScreen.tsx`. No custom fonts, no navigation
  library, no local database — kept as light as the job allows.
- `.github/workflows/host-apk.yml`, `verifier-apk.yml` — build and publish
  each app's APK to the same `latest` GitHub Release, independently
  (path-filtered so an unrelated change to one app doesn't rebuild the other).
- `.github/keystore/debug.keystore` — shared fixed signing key for both apps
  (a debug-only key, not a Play Store release key, safe to commit).

## Notes / things to revisit

- The old fully-offline version of this app (local SQLite, per-event
  export/import, host-code and per-device master-key promotion system,
  whole-device backup/restore) has been entirely replaced by Firebase Auth +
  Firestore's own sync. None of that code or those files still exist in
  `host/` or `verifier/` — a real login plus a shared live database
  supersedes what all of it was working around.
- No Play Store listing — same reasoning as before: a real release signing
  key and Play Console account are a separate, later step if ever wanted.
- The verifier app currently uses Expo's default placeholder icon —
  swap `verifier/assets/*.png` for real branded icons whenever convenient.
- Deleting an event is immediate and total (see "Setting up an event" above)
  — there's deliberately no "restore" since the whole point of moving to a
  shared backend was to stop needing per-device backups.
