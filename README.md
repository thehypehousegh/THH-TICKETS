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

## Device roles: host vs. verifier

It's one app either way — the same download works for every phone. The first time
it opens, it asks what this phone is:

- **Main host** — the only role that can create events, generate ticket codes, and
  produce the final PDF report. Can also scan/verify, same as a verifier phone.
- **Door verifier** — imports an event from the host, then scans or types codes to
  check people in. No "New event" or "Generate codes" — just verification.

You can change a phone's role later from the Reservations tab (tap "Change" next to
"Device role" near the bottom) if you need to repurpose one.

## Getting other phones ready for door duty

Since there's no server and no live sync between devices, install the app (above) on
each phone that will help scan tickets — set it to **Door verifier** — then hand
each of them the event's data from the **host** phone:

1. On the host phone, open the event and tap **Export event data**. This creates one
   JSON file with that event's details, ticket types, and every code issued so far,
   and opens the normal share sheet — AirDrop, Bluetooth, WhatsApp, email, a USB
   cable, however you'd normally get a file across.
2. On each verifier phone, open the app's Events tab and tap the **import** icon
   (next to "New" — verifier phones won't have a "New" button, that's host-only),
   then pick the file you just sent over.
3. Everyone can now scan or verify any of those codes independently, offline.

Any codes generated *after* you shared the file only exist on the host phone until
you export and re-share again — re-importing is always safe, it just adds whatever's
new.

## After the event: one combined report

Each phone only knows about the check-ins it personally recorded — there's no live
sync while doors are open. To find out who actually got in overall:

1. On each verifier phone, open the event and tap **Export event data** again (same
   button as before) — this time it carries that phone's check-in results. Send it
   back to the host phone.
2. On the host phone, import each file the same way (Events tab → import icon).
   Importing an event you already have **merges** check-ins rather than replacing
   anything: for any code, whichever phone checked it in *first* is what sticks, so
   feeding in results from three door phones just combines them, and nothing you
   already knew gets erased. If Daniel's Regular code was accidentally scanned on
   two phones, only the earlier of the two timestamps survives — no double-counting.
3. Tap **Export PDF** on the host phone. The report now shows, per code, whether and
   when it was checked in, plus a summary line up top: total generated, checked in,
   and not checked in — the full picture from every phone combined.

**The trade-off that comes with staying offline:** between steps 1 and 3, two
phones scanning the exact same ticket won't warn each other — there's no live sync
to catch that in the moment, only the after-the-fact merge above. For a small door
team that's talking to each other, this is a reasonable trade for not needing a
server; if double-scanning is a real worry, splitting ticket types across phones
(one phone handles Regular, another handles VIP) sidesteps it entirely.

## Permissions

Android and iOS only allow asking for camera/photos access at runtime, never during
installation — so the first time you open the app (right after picking a device
role), it asks once, explains why (scanning tickets, saving/sharing QR codes), and
gets out of the way. Every launch after that skips straight to the Events list.

## Verifying tickets at the door

On an event's page, under **Verify at the door**:

- **Scan QR code** opens the camera. Point it at a ticket's QR code; if it matches
  a code on this event, you'll see who it's for and a **Check in** button (or
  **Undo check-in** if it's already been used — mistakes happen).
- **Type part of a code** works without a camera — useful if a code was texted or
  read aloud rather than shown as an image. Matches show the same check-in card.

Each generated code also has its own downloadable QR (tap the QR icon next to a
code on its Output screen) — **Save to Photos** or **Share** it directly, e.g. to
text or email someone their ticket as an image. When a name has more than one code
(Daniel's 2 Regular + 3 Double + 1 VIP), a **Save all N QR codes to Photos** button
saves every one of them in a single tap instead of one at a time.

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
- **expo-print + expo-sharing** — generates a per-event PDF (No. · Name · Code(s),
  each with its checked-in status, plus generated/checked-in/not-checked-in totals)
  and hands it to the OS share sheet.
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
- `src/db/role.ts`, `src/components/RoleGate.tsx`, `src/components/RoleChoice.tsx` —
  the host/verifier device role, stored in SQLite (`app_settings` table) and gating
  which screens/buttons show up.
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
- Check-in state never syncs between phones live — only when you export from one
  and import into another, which merges (earliest check-in wins) rather than
  overwrites. See "After the event: one combined report" above.
