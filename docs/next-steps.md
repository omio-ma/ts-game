# Next steps

Status: Stranded B1 and B2 done (2026-10-02). Written 2026-09-24, updated 2026-10-02.

There are two tracks, and we are doing both:

- **Track A: save game progress on the device.** Already planned. Small, and it
  fixes a real problem in Five-a-Side Manager.
- **Track B: a new game, "Stranded".** The new main focus. A small sci-fi RPG where
  you control a pilot walking around the alien planet she crashed on.

They meet at one point: **saving is built once, as shared code, so both games use
it.** Stranded only needs saving once it has progress worth keeping (step B4), so
Track A can happen any time before that.

## Where we are

- The site is live at https://omio-ma.github.io/ts-game/ and deploys from `main`.
- It's an installable offline app (PWA via `vite-plugin-pwa`); on Android the user
  installs it from Chrome with **⋮ → Install app**.
- First game: **Five-a-Side Manager** (`src/games/first-game/`). Pure game logic is in
  `logic.ts` (with Vitest tests in `logic.test.ts`), data in `data.ts`, and the UI in
  `SquadPicker.tsx` and `SeasonView.tsx`.
- **Problem:** all game state lives in React state, so if Android closes the app
  mid-season, the season is lost.

## Order of work

1. **B1–B3: Stranded, walking around the map.** No saving needed yet. B1 and B2
   are done; B3 is next.
2. **A1: shared storage layer** (small), before Stranded gets progress to save.
3. **B4: Stranded's first "grind" loop**, saved with A1.
4. **A2: Five-a-Side saves**, on top of A1. Whenever it suits us.

---

## Track A: use the phone as the database

Follow the approach from the user's Quick Notes app
(https://github.com/omio-ma/quick-notes, public; see `clientApp/src/db.ts`):

- **Storage:** IndexedDB via [Dexie](https://dexie.org) (`dexie`, `dexie-react-hooks`).
  Quick Notes defines a single `Dexie` instance with `db.version(1).stores({...})` and
  reads it in components with `useLiveQuery`.
- **Tests:** Quick Notes uses `fake-indexeddb/auto` in a Vitest setup file with the
  `jsdom` environment. Do the same here.

### A1: shared storage (`src/storage/`)

- One Dexie database for the whole site, with a table per game (Dexie handles
  schema versions, so adding the RTS tables later is just `db.version(2)`).
- Call `navigator.storage.persist()` once at startup so Android doesn't clear the
  data when storage runs low. Quick Notes doesn't do this yet, so suggest adding it
  there too.
- Keep the game logic independent of Dexie: games keep pure state and pass it to
  small `save` / `load` helpers. That keeps `logic.ts`-style tests free of IndexedDB.

### A2: Five-a-Side Manager saves

1. Tables:
   - `career`: team name and current squad (player ids)
   - `season`: current matchday, tactic, league table and results so far
   - `history`: finished seasons (final position, points, top scorer)
2. Save after squad confirmation, tactic changes and every match. On load, resume
   an in-progress season if one exists.
3. Optional follow-up: a career history screen (seasons played, titles, top scorers).

---

## Track B: Stranded (sci-fi RPG)

**The idea:** a pilot has crash-landed on a deserted alien planet. You control her
directly and roam around. At first the world is empty on purpose: just her, the
wreck of her ship, and a warm, dusty alien landscape. Later there is a relaxing
"grind": gather things, get stronger, fix the ship.

We build it in small steps. Each step is playable on its own and gets deployed
before the next one starts.

### Keep it simple

- **Plain Canvas 2D**, no game engine. A single character and a tile map don't need
  one. If it gets slow later, we can move the drawing to PixiJS without changing the
  game rules.
- **React** only for the screen around the game (title, buttons, a small HUD). The
  map is one `<canvas>` inside a React component, updated with
  `requestAnimationFrame`, not by React rerendering.
- **Code layout** like the first game: `src/games/stranded/`, with pure logic
  (movement, collision, the map) tested with Vitest, separate from the drawing code.
- **Phone first:** it has to work by touch in the installed app on Android. Keyboard
  (WASD / arrow keys) on desktop too.
- **Art:** start with simple shapes and colours drawn in code, so art never blocks
  progress. Swap in sprites later from CC0 packs (for example
  [Kenney](https://kenney.nl/assets)) or our own, with the source listed in
  `CREDITS.md`, because the repo is public.

### View

Three-quarter view (like Stardew Valley or Zelda: A Link to the Past), chosen over
straight top-down and over true isometric: square tiles, but rocks, crystals and the
ship have height and are drawn sorted by where they touch the ground, so she can walk
behind them. The pilot is drawn from the front, back or side depending on where she
faces (`pilot.ts`). Only the drawing knows about the view; the map, movement and
collision still work in flat tile coordinates. True isometric is still possible later
without touching the game logic.

### Steps

**B1: the planet.** *(Done.)* A map on screen that already feels like a warm alien desert.
- A tile grid (for example 60×60) with a few ground types: orange sand, rust-red
  rock, pale dunes, and odd purple/teal crystal rocks as the "alien" touch.
- A warm palette: ochre, terracotta, dusty pink, with a hazy peach sky tint.
- The map is generated from a fixed seed so it's the same every time, with rocks
  and crystal outcrops scattered around. The crashed ship sits in the middle.
- Done when: the game opens from the home page and shows the planet.

**B2: the pilot walks.** *(Done.)* A character you can roam around with.
- The pilot is a simple figure (a circle and a helmet visor is fine at first).
- Controls: WASD or the arrow keys on desktop (chosen over point-and-click for more
  direct control). On a phone, a virtual joystick: press and drag anywhere on the
  screen, and how far you drag sets the speed.
- The camera follows her. She can't walk through rocks, the ship or off the map.
- Done when: you can walk around the whole map smoothly on the phone.

**B3: make roaming feel nice.** Small touches, pick whichever are fun:
- *(Done.)* A walking animation and facing the direction she walks: she's drawn
  as a person seen from above (head with ponytail, shoulders, swinging arms,
  stepping boots), steps in time with the distance walked, and turns smoothly.
- *(Done.)* Running: hold Shift to run (1.75× speed) using stamina. A full bar lasts
  4 s; it recharges while walking (10 s to full) and faster standing still (3 s).
  Running out leaves her tired until it's back to 30%. A small bar above her head
  shows stamina when it isn't full (red when tired). There's no way to run on a
  phone yet: needs a run button or similar.
- Footprints or little dust puffs that fade behind her.
- Drifting dust particles, and a slow day-to-dusk colour shift.
- Map bigger than the screen with a few landmarks to find (a strange monolith,
  a dry crater, bones of something large).

**B4: the first grind (optional, the "fun" step).** "Fix the ship."
- Scrap and crystals lie scattered around the map. Walk over them to pick them up;
  they slowly respawn.
- She can only carry a few at a time, so she walks back to the ship to drop them off.
- Dropping off fills a **ship repair** bar. Parts of the ship visibly get fixed as
  it fills.
- Spend crystals on small upgrades: walk faster, carry more, a scanner that points
  to the nearest scrap. This is the loop: gather, return, upgrade, gather faster.
- Progress is saved on the phone (uses A1), so you can close the app and continue.

### Ideas for later (not planned yet)

- A night cycle with glowing plants and creatures that come out.
- Creatures to avoid, then to fight: this is where it becomes a proper RPG.
- Crafting, a base camp next to the wreck, more areas to unlock.
- A goal: repair the ship fully and fly off (or call for rescue).

---

## Other ideas the user has shown interest in

- More games: management and sports sims, football, word games.
- A real Android APK or Play Store listing later (wrap the same code with
  Capacitor; the Play Store needs a Google developer account).
