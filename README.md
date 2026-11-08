# Last Light — Tower Defense

A browser-based tower defense game built with React and Vite. Defend the house from waves of rakshasa using six turret types, upgrades, home reinforcements, and support buildings. The game runs locally in the browser; it does not require a game server, account, database, or API.

## Features

- **Campaign:** 10 levels with five rounds each (50 rounds total). Enemy waves grow in size and durability; boss rounds appear in levels 5–10.
- **Six weapons:** Sentinel, Gatling, Cryo, Railgun, Mortar, and Cataclysm. Unlock weapons and build turrets between rounds.
- **Build and upgrade:** Place turrets beside the road, improve their damage and range, or sell them for a partial refund.
- **Protect the objective:** Reinforce the house and build Watch Houses for repairs or Supply Houses for extra level-clear credits.
- **Guided demo:** A first-launch welcome card offers a click-by-click tutorial or direct play. The best level reached is saved in this browser.
- **Performance stress test:** Load a stress scene with 5,000 enemies, 100 towers, and up to 1,000 active projectiles. Use the in-game telemetry to observe performance on your device.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and preview a production build:

```bash
npm run build
npm run preview
```

The static production files are written to `dist/`.

## How to play

1. Select **Take the guided demo** or **Start playing** on the welcome card. You begin with 330 credits and the Sentinel available.
2. Select a gun card in **Defense Systems**, then click a clear spot beside the road to place it. Turrets aim and fire automatically.
3. Click **BEGIN DEFENSE** to launch the first round. Earn credits by defeating enemies and clearing levels.
4. Between rounds, open **Weapon Shop** to unlock weapons, reinforce the house, or build support houses. Select a placed turret to upgrade or sell it.
5. Keep the house standing through all 50 rounds to win. Enemies that reach it damage its integrity.

Pause/resume with the on-screen control or **Space**. The speed control cycles through 1×, 1.5×, and 2×. See [HOW_TO_PLAY.md](HOW_TO_PLAY.md) for weapon prices, enemy details, controls, and strategy.

## Weapons

| Weapon | Unlock | Build | Specialty |
|---|---:|---:|---|
| Sentinel | Available at start | 90 CR | Balanced starter turret |
| Gatling | 120 CR | 175 CR | Rapid fire at close range |
| Cryo | 175 CR | 250 CR | Slows enemies |
| Railgun | 350 CR | 480 CR | Heavy hits and long range |
| Mortar | 500 CR | 650 CR | Splash damage |
| Cataclysm | 720 CR | 880 CR | Highest damage and widest range |

Unlocking a weapon and buying its first turret are separate costs. The shop displays their combined price for the first purchase; additional turrets cost the build price.

## Project structure

- `src/App.jsx` — React interface, canvas rendering, controls, tutorial, and telemetry.
- `src/game.js` — Campaign state, waves, enemies, targeting, weapons, and shop actions.
- `src/scene3d.js` — Three.js scene module.
- `src/style.css`, `src/guide.css` — Application and tutorial styles.
- `HOW_TO_PLAY.md` — Detailed player guide.
- `NUMBERS.md` — Recorded local performance sample and measurement notes.

The current `App.jsx` renders the battlefield with a 2D canvas. Performance depends on browser, device, and viewport; the stress test is an observation tool, not a guarantee of a particular frame rate. The measurements in `NUMBERS.md` are local samples and should not be treated as deployment benchmarks.

## Build and deployment

The Vite build produces a static site in `dist/`, which can be hosted by any static web host. For Firebase Hosting, configure Hosting for this project and set the public directory to `dist`; use a single-page-app rewrite to `/index.html` if required by your hosting setup. Do not commit `node_modules/` or generated `dist/` files. Keep `package-lock.json` in the repository for reproducible installs.
