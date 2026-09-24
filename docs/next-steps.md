# Next steps: save game progress on the device

Status: planned, not started. Written 2026-09-24.

## Where we are

- The site is live at https://omio-ma.github.io/ts-game/ and deploys from `main`.
- It's an installable offline app (PWA via `vite-plugin-pwa`); on Android the user
  installs it from Chrome with **⋮ → Install app**.
- First game: **Five-a-Side Manager** (`src/games/first-game/`). Pure game logic is in
  `logic.ts` (with Vitest tests in `logic.test.ts`), data in `data.ts`, and the UI in
  `SquadPicker.tsx` and `SeasonView.tsx`.
- **Problem:** all game state lives in React state, so if Android closes the app
  mid-season, the season is lost.

## Plan: use the phone as the database

Follow the approach from the user's Quick Notes app
(https://github.com/omio-ma/quick-notes, public; see `clientApp/src/db.ts`):

- **Storage:** IndexedDB via [Dexie](https://dexie.org) (`dexie`, `dexie-react-hooks`).
  Quick Notes defines a single `Dexie` instance with `db.version(1).stores({...})` and
  reads it in components with `useLiveQuery`.
- **Tests:** Quick Notes uses `fake-indexeddb/auto` in a Vitest setup file with the
  `jsdom` environment. Do the same here.

For the game:

1. Add `src/games/first-game/db.ts` with tables for:
   - `career`: team name and current squad (player ids)
   - `season`: current matchday, tactic, league table and results so far
   - `history`: finished seasons (final position, points, top scorer)
2. Save after squad confirmation, tactic changes and every match. On load, resume
   an in-progress season if one exists.
3. Call `navigator.storage.persist()` once so Android doesn't clear the data when
   storage runs low. Quick Notes doesn't do this yet, so suggest adding it there too.
4. Optional follow-up: a career history screen (seasons played, titles, top scorers).

## Other ideas the user has shown interest in

- More games: management and sports sims, football, word games.
- A real Android APK or Play Store listing later (wrap the same code with
  Capacitor; the Play Store needs a Google developer account).
