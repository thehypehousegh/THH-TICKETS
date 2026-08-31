# THH Tickets

An e-ticketing platform for The Hype House: organizers create an event (with a
flyer, venue, and priced ticket types), get a public listing people can browse
and buy tickets from, and door staff verify tickets live as they're scanned —
no export files, no manual merging, everything syncs through one shared
Firebase backend the instant it happens.

This used to be a single offline app with no server at all. It's been rebuilt
around three apps plus a shared cloud backend, because live syncing between a
host and multiple door phones — and letting anyone buy a ticket online — both
need a server somewhere; there's no way to do either fully offline. See "Why
several apps, and why online now" below for the trade-off.

## The three apps

- **THH Tickets Host** (`/host`, Android/iOS via Expo) — for the event
  organizer. Requires an account (email + password, created in-app). Creates
  events, sets ticket prices, generates manual/walk-in codes, scans at the
  door, exports a PDF report, and gets each event's shareable purchase link
  and door-verifier event code.
- **THH Tickets Verifier** (`/verifier`, Android/iOS via Expo) — for anyone
  helping check tickets at the door. No account, no sign-up — just enter the
  event's code (from the host) and it shows that event's tickets live, ready
  to scan or search. Deliberately small: no event creation, no pricing, no
  PDF export, nothing a verifier doesn't need.
- **THH Events** (`/web`, a browser-based site — see "Deploying THH Events"
  below) — the public face of the platform: browse/search every published
  event, view one and buy tickets, and an organizer dashboard covering
  everything the host app does (create/edit/publish/end/delete events,
  discounts, manual/comp codes, patron list, payout profile) plus a
  **web verifier** at `/verify` that does the same job as the Verifier app
  with nothing to install — the fix for door staff on iPhones, where a
  direct-install APK isn't an option. Sign up/log in here is the *same*
  organizer account as the host app; an event created on either one shows up
  on both and on the public Events page the instant it's published.

All three talk to the same Firebase project, so a code generated on the host
phone, on the web dashboard, or bought online shows up on every verifier
(app or web) within moments, and a check-in from any of them shows up
everywhere else the same way.

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

## Deploying THH Events (`/web`)

The web app is a static Vite/React build talking directly to Firestore/Auth/
Storage from the browser (same `firebaseConfig` as the two mobile apps, in
`web/src/firebase/config.ts`) — no server of its own beyond Firebase itself,
so it deploys as static files to Firebase Hosting:

```
cd web && npm install && npm run build && cd ..
firebase login          # once, interactively
firebase deploy --only hosting,firestore:rules,storage:rules
```

`firebase.json` and `.firebaserc` at the repo root already point Hosting at
`web/dist` and the deploy at the `thh-tickets` project. The default Hosting
URL is `https://thh-tickets.web.app` — that's also what
`host/src/utils/links.ts`'s `PUBLIC_SITE_BASE_URL` is set to, so the host
app's Share Event button and public purchase links resolve correctly once
this is live. Update that constant (and re-deploy the host app) if a custom
domain is attached later.

## Why several apps, and why online now

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

All three apps need the *same* Firebase project's config dropped into
`host/src/firebase/config.ts`, `verifier/src/firebase/config.ts`, and
`web/src/firebase/config.ts`:

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

### Password reset and email verification

Both the host app and the web app use Firebase Auth's own built-in flows for
these -- no custom backend, no third-party email service:
- **Forgot password**: a "Forgot password?" link on both apps' sign-in
  screens calls `sendPasswordResetEmail`, which sends Firebase's own reset
  email and lands the user on Firebase's own hosted reset-password page.
- **Email verification**: `sendEmailVerification` fires automatically right
  after sign-up. A banner shows on every screen (web) or the Events list
  (host app) for any signed-in account that hasn't verified yet, with
  "Resend email" and "I've verified -- refresh" actions. Verification is
  informational only for now -- an unverified account can still use every
  feature -- since gating real functionality behind it wasn't asked for and
  would need a product decision about what, if anything, to block.

Firebase sends both emails using its own default templates and sender
address out of the box; **Authentication → Templates** in the console lets
you customize the sender name/from-address and email copy later if wanted,
but nothing further is required for either to work today.

## Online ticket sales (Paystack)

THH Events (`/web`) has the public purchase page: flyer, event summary,
ticket picker, a discount code field, and a form for the buyer's name,
contact, and email. What happens on "Checkout" depends on whether Paystack
is configured for this deployment:

- **Paystack configured** (see setup below): the button reads "Pay with
  Paystack" and opens Paystack's popup (cards + Mobile Money, in Paystack
  Ghana's own checkout). On success, the browser calls the
  `verifyPaystackPayment` Cloud Function (`functions/src/paystack.ts`) with
  the transaction reference — nothing about the price or "it succeeded" is
  ever trusted from the browser. That function independently re-verifies the
  transaction with Paystack's own API using the secret key, **recomputes the
  order total itself** from the event's own ticket types and discount (so a
  tampered client can't pay less than the real price), and only then issues
  the ticket codes — tagged `source: 'online'`, same shape the manual
  Generate flow produces. The codes are shown on-screen immediately; sending
  them by email too is a possible future addition (no email-delivery
  pipeline exists yet beyond Firebase Auth's own account emails). Re-sending
  the same reference (e.g. a flaky connection retries the call) returns the
  original codes instead of issuing a second set — see the `paidOrders`
  collection, keyed by reference, in that function.
- **Not configured**: the button reads "Checkout" and writes a
  `purchaseRequests` document instead (see `submitPurchaseRequest` in
  `web/src/data/queries.ts`) — no code is issued yet. The organizer sees it
  under "Pending orders" on that event's Manage page, confirms payment with
  the buyer directly, and clicks "Confirm & issue codes". This remains a
  useful fallback even once Paystack is live (e.g. a cash-at-the-door
  arrangement made outside the app).

### Setting it up

1. In the [Paystack dashboard](https://dashboard.paystack.com/#/settings/developers),
   grab your **public key** (`pk_test_...` or `pk_live_...`) and **secret
   key** (`sk_test_...` or `sk_live_...`).
2. Public key, client-side, safe to expose by design: copy `web/.env.example`
   to `web/.env` and set `VITE_PAYSTACK_PUBLIC_KEY` to it. Rebuild
   (`npm run build`) and redeploy hosting for it to take effect.
3. Secret key, server-side only, must never reach the browser:
   ```
   echo "<paste your Paystack secret key here>" | firebase functions:secrets:set PAYSTACK_SECRET_KEY --data-file -
   firebase deploy --only functions
   ```
4. Start with your **test** keys end-to-end (Paystack's test cards are in
   their docs) before switching `web/.env` and the secret to your live keys.

**USSD** (`*XXX#` style purchase) is a further step beyond that, and isn't
something any app or Firebase project can provision on its own — it requires
a real relationship with a telecom/USSD aggregator (e.g. Hubtel, Nsano,
Wigal in Ghana), usually a shared short code with a menu path, and typically
some paperwork/fees. There's a `ussdShortCode` field already reserved on the
event record for whenever that's set up.

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
organizer's payout details. It can also **open, edit, or delete any
organizer's event directly** (`/dashboard/events/:id` and `.../edit`, from
links on the web app's `/admin` page) — the same access that event's own
organizer has, not just read access. This is **not** a role you can grant
yourself from inside either app, on purpose — it's a single `isAdmin: true`
field on your own `organizers/{uid}` document, toggled by hand in the
Firestore console (Firestore Database → Data → `organizers` → your document
→ add field `isAdmin` = `true`, boolean). Once set, a "Super admin" row
appears at the bottom of the Reservations tab (mobile) and an "Admin" link
appears in the web app's nav. Firestore's rules (`/firestore.rules`) check
this same field server-side, so it can't be spoofed from a modified client.

### Support chat (organizer ↔ admin)

The web app has a lightweight help-desk built on Firestore (`supportThreads`
+ a `messages` subcollection, no third-party service): any signed-in
organizer can message the admin from `/support` (a general question, with a
short static FAQ above it) or from a specific event's Manage page ("Message
admin about this event"), and the admin sees every conversation in one inbox
on `/admin`, replying inline — including on events they don't own, since
they can already open and edit them.

### AI chat widget (Groq)

A floating chat bubble on every page (`web/src/components/ChatWidget.tsx`)
answers common questions -- creating an event, buying tickets, discounts,
verification, payouts -- using Groq's free-tier API (`llama-3.3-70b-versatile`,
same choice and reasoning as the sibling Next.js site's own chat widget).
The model returns `{"reply", "escalate"}`; when `escalate` is true, or the
visitor just wants a person, the widget offers "Talk to the admin instead",
which hands off into the same `supportThreads` system above (signed-in
organizers only -- a signed-out visitor is prompted to sign in/sign up
first, since there's no anonymous-visitor identity on this site to attach a
thread to).

**Why a Cloud Function is involved**: this site is a static SPA with no
server of its own, so the Groq API key can't live in browser code -- anyone
could open dev tools and read it out of the bundle. `functions/` is a small
Firebase Cloud Function (`chatSupport`, a `onCall` v2 function) that holds
the key server-side via Firebase's Secret Manager and proxies the request;
the browser calls it through the Firebase Functions SDK, never Groq
directly. This is the same pattern as the sibling site's `/api/chat` route,
just on Cloud Functions instead of a Next.js API route, since this project
doesn't have one.

**One-time setup** (needs a [Groq API key](https://console.groq.com), free
tier):
```
firebase functions:secrets:set GROQ_API_KEY
```
(pastes/stores it securely -- never put it in a file in this repo). Then
deploy functions along with everything else:
```
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```
Cloud Functions requires the project to be on the **Blaze (pay-as-you-go)
plan** -- already true here since Storage needed it too. Groq's free tier
covers this widget's low-volume traffic; there's no per-request billing
surprise from Groq itself, only Firebase Functions' own free-tier invocation
allowance (generous for this scale).

### Automatic flyer cleanup

A scheduled Cloud Function (`cleanupExpiredFlyers` in `functions/src/cleanupFlyers.ts`,
runs daily at 03:00) deletes an event's flyer image from Storage -- and clears
`flyerUrl` on the event doc -- once **14 days** have passed since that
event's scheduled end date/time, to keep Storage usage from growing
unbounded with old flyers nobody needs anymore. It uses the Admin SDK, so it
bypasses Firestore/Storage rules entirely (same trust level as any other
Cloud Function). One caveat: an event ended early (`status` flipped to
`'ended'` before its scheduled end) has no separate "ended at" timestamp
recorded, so its *originally scheduled* end date/time is still what the
14-day countdown is measured from, not the moment it was actually ended --
a precise `endedAt` field would be needed to close that gap, and wasn't
added since it's a minor edge case. Deploys with everything else via
`firebase deploy --only ...,functions` -- no extra setup needed beyond that.

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
  `verifier/`), plus **Vite + React + TypeScript + Tailwind** for the web app
  (`web/`) — all three sharing one Firebase project.
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
- `host/src/utils/links.ts` — builds an event's public purchase URL, pointed
  at `PUBLIC_SITE_BASE_URL` (THH Events, see "Deploying THH Events" above).
- `host/src/utils/stats.ts` — the event dashboard's paid/self-generated/
  verified breakdown, computed from live batches+codes (a batch's `source`
  field is `'online'` for a purchase or `'manual'` for anything the host
  typed in on the Generate screen).
- `web/src/pages/` — Home (public browse), EventDetail (public + checkout),
  Login/Signup, Dashboard (organizer's own events), EventForm (create/edit,
  shared), EventManage (stats, pending orders, generate codes, discounts,
  patrons), Verify (web verifier — join by code, scan or search, check
  in/undo), Admin, Profile. `web/src/data/` and `web/src/utils/` mirror
  `host/src/data` and `host/src/utils` 1:1 so all three apps agree on the
  data model and formatting logic.
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
