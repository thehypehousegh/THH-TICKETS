# THH Ticket Codes

Offline mobile app for The Hype House's ticket-code generation system: create an
event, generate reservation codes per ticket type, hand out QR codes, and verify
them at the door — scanning or by typing part of a code. No internet connection
required — all data lives on-device.

## Get it on your phone

**Android — download and install directly, no computer needed:**

1. Open the [**Releases page**](../../releases/tag/latest) on your phone.
2. Download `THH-Ticket-Codes.apk` and open it.
3. Android will ask permission to install from this source the first time — allow it.
4. It installs like any other app. (It'll show as from an "unknown developer" — that's
   expected for a direct-install build outside the Play Store, not a problem.)

The app rebuilds and updates that same Releases link automatically every time this
repo's `main` branch changes (see `.github/workflows/android-apk.yml`). Re-downloading
and re-installing over an existing install upgrades it in place — your events, codes
and check-in history stay put — because every build is signed with the same committed
debug key (`.github/keystore/debug.keystore`; see notes below).

**iPhone — live preview via Expo Go (no real installer possible without a paid
Apple Developer account):**

Apple doesn't allow installing an app on an iPhone outside the App Store or
TestFlight unless you're enrolled in the Apple Developer Program ($99/year). Without
that, the closest thing to "install and run it" is:

1. Install the free **Expo Go** app from the App Store.
2. Someone with this code checked out runs `npx expo start` and shares the QR code
   or link it prints (or use `npx expo start --tunnel` if your phone isn't on the
   same Wi-Fi).
3. Scan it in Expo Go.

If you later get an Apple Developer account, this project can be built for TestFlight
with no code changes — just ask.

## Getting other phones ready for door duty

Since there's no server and no live sync between devices, install the app (above) on
each phone that will help scan tickets, then hand each of them the event's data:

1. On the phone that generated the codes, open the event and tap **Share event to
   another phone**. This creates one JSON file with that event's details, ticket
   types, and every code issued so far, and opens the normal share sheet — AirDrop,
   Bluetooth, WhatsApp, email, a USB cable, however you'd normally get a file across.
2. On each other phone, open the app's Events tab and tap the **import** icon (next
   to "New"), then pick the file you just sent over.
3. Everyone can now scan or verify any of those codes independently, offline.

**The trade-off that comes with staying offline:** each phone's check-ins are
local to that phone. If Daniel's Regular code gets scanned on two different phones,
neither one will know the other already checked it in — there's no sync to catch
that. And any codes generated *after* you shared the file only exist on the
generating phone until you export and re-share again (re-importing is safe any
time — it only adds codes it hasn't seen before, and never overwrites a check-in
already recorded locally). For a small door team that's talking to each other, this
is a reasonable trade for not needing a server; if double-scanning becomes a real
problem, splitting ticket types across phones (one phone handles Regular, another
handles VIP) sidesteps it entirely.

## Permissions

Android and iOS only allow asking for camera/photos access at runtime, never during
installation — so the first time you open the app, it asks once, explains why
(scanning tickets, saving/sharing QR codes), and gets out of the way. Every launch
after that skips straight to the Events list.

## Verifying tickets at the door

On an event's page, under **Verify at the door**:

- **Scan QR code** opens the camera. Point it at a ticket's QR code; if it matches
  a code on this event, you'll see who it's for and a **Check in** button (or
  **Undo check-in** if it's already been used — mistakes happen).
- **Type part of a code** works without a camera — useful if a code was texted or
  read aloud rather than shown as an image. Matches show the same check-in card.

Each generated code also has its own downloadable QR (tap the QR icon next to a
code on its Output screen) — **Save to Photos** or **Share** it directly, e.g. to
text or email someone their ticket as an image.

## Running it yourself

```
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS or Android) — no custom dev client or native
build needed. Every dependency here (SQLite, print/share, camera/QR scanning, photo
saving, fonts, navigation, icons) ships inside Expo Go; the date/time and
ticket-type pickers are custom components (`src/components/CalendarField.tsx`,
`TimeField.tsx`, `SelectField.tsx`) built without native modules specifically so
nothing extra needs installing.

## Stack

- **Expo (React Native) + TypeScript** — one codebase for iOS and Android.
- **expo-sqlite** — an embedded SQLite database on-device (`src/db/schema.ts`,
  `src/db/queries.ts`). All event, ticket-type, reservation-batch and code data lives
  locally, including each code's check-in (`used_at`) state.
- **expo-print + expo-sharing** — generates a per-event PDF (No. · Name · Code(s)) and
  hands it to the OS share sheet.
- **react-native-qrcode-svg + expo-file-system + expo-media-library** — renders,
  saves, and shares a QR image per code (`src/components/QrModal.tsx`,
  `src/utils/qrExport.ts`).
- **expo-camera** — QR scanning for door check-in (`src/screens/ScanScreen.tsx`).
- **expo-document-picker** — importing a shared event file (`src/utils/eventTransfer.ts`).
- **React Navigation** — a bottom-tab (`Events` / `Reservations`) + native-stack root
  navigator (`src/navigation`).

## Where things live

- `src/utils/codes.ts` — code generation + reservation-message formatting, ported
  1:1 from the original design prototype's logic (brand prefix, event salt,
  THH-first/event-first ordering, sign-off copy).
- `src/db/` — SQLite schema, queries, and a `DataProvider` React context that loads
  events/batches into memory and keeps SQLite as the source of truth.
- `src/screens/` — Events list, Create event, Event detail, Generate codes,
  Output (reservation message + per-code QR), Scan (camera check-in), Reservations log.
- `src/utils/pdf.ts` — builds the per-event tickets PDF and shares it.
- `src/utils/eventTransfer.ts` — builds/reads the per-event export file used to get
  another phone's local database in sync before an event.
- `src/utils/verify.ts` — code lookup used by both the scan screen and the "type
  part of a code" search on the event page.
- `.github/workflows/android-apk.yml` — builds the Android APK and publishes it to
  the `latest` GitHub Release on every push to `main`.
- `.github/keystore/debug.keystore` — a fixed debug signing key, committed on
  purpose so every CI-built APK has the same signature and can be installed as an
  update rather than forcing an uninstall each time. It's a debug-only key (not a
  Play Store release key) — there's nothing sensitive in it.

## Notes / things to revisit

- Brand prefix (`THH`), sign-off wording (`See you on`), and event-salt length (`7`)
  are constants in `src/utils/codes.ts`, matching the prototype's defaults. There's
  no in-app settings screen for them yet — say the word if you want one.
- No sample/demo data is seeded; the app starts empty.
- The Android build is a **release-type** APK (JS bundle embedded, so it runs
  standalone with no computer nearby) signed with the fixed key above rather than a
  real Play Store release key — that's what makes it directly installable without a
  Play Console account. Publishing to the Play Store for real needs a proper release
  signing key and Play Console account — a different setup from what's here; ask if
  you want that.
- Check-in state never syncs between phones automatically — see "Getting other
  phones ready for door duty" above.
