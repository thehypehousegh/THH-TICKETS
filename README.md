# THH Ticket Codes

Offline mobile app for The Hype House's ticket-code generation system: create an
event, generate reservation codes per ticket type, and export a per-event PDF of
everything issued. No internet connection required — all data lives on-device.

## Get it on your phone

**Android — download and install directly, no computer needed:**

1. Open the [**Releases page**](../../releases/tag/latest) on your phone.
2. Download `THH-Ticket-Codes.apk` and open it.
3. Android will ask permission to install from this source the first time — allow it.
4. It installs like any other app. (It'll show as from an "unknown developer" — that's
   expected for a direct-install build outside the Play Store, not a problem.)

The app rebuilds and updates that same Releases link automatically every time this
repo's `main` branch changes (see `.github/workflows/android-apk.yml`).

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

## Running it yourself

```
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS or Android) — no custom dev client or native
build needed. Every dependency here (SQLite, print/share, fonts, navigation, icons)
ships inside Expo Go; the date/time and ticket-type pickers are custom components
(`src/components/CalendarField.tsx`, `TimeField.tsx`, `SelectField.tsx`) built
without native modules specifically so nothing extra needs installing.

## Stack

- **Expo (React Native) + TypeScript** — one codebase for iOS and Android.
- **expo-sqlite** — an embedded SQLite database on-device (`src/db/schema.ts`,
  `src/db/queries.ts`). All event, ticket-type, reservation-batch and code data lives
  locally.
- **expo-print + expo-sharing** — generates a per-event PDF (No. · Name · Code(s)) and
  hands it to the OS share sheet to save or send.
- **React Navigation** — a bottom-tab (`Events` / `Reservations`) + native-stack root
  navigator (`src/navigation`).

## Where things live

- `src/utils/codes.ts` — code generation + reservation-message formatting, ported
  1:1 from the original design prototype's logic (brand prefix, event salt,
  THH-first/event-first ordering, sign-off copy).
- `src/db/` — SQLite schema, queries, and a `DataProvider` React context that loads
  events/batches into memory and keeps SQLite as the source of truth.
- `src/screens/` — Events list, Create event, Event detail, Generate codes,
  Output (reservation message), Reservations log.
- `src/utils/pdf.ts` — builds the per-event tickets PDF and shares it.
- `.github/workflows/android-apk.yml` — builds the Android APK and publishes it to
  the `latest` GitHub Release on every push to `main`.

## Notes / things to revisit

- Brand prefix (`THH`), sign-off wording (`See you on`), and event-salt length (`7`)
  are constants in `src/utils/codes.ts`, matching the prototype's defaults. There's
  no in-app settings screen for them yet — say the word if you want one.
- No sample/demo data is seeded; the app starts empty.
- The Android build is an unsigned **debug** APK, meant for direct install/testing.
  If you want it on the Play Store eventually, that needs a signed release build and
  a Play Console account — a different setup from what's here.
