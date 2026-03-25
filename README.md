# PF2e Character Builder

A full-featured Pathfinder Second Edition character builder and character sheet as a single-page web application.

## Features

- **Character Builder** — Build characters from level 1–20 with all PF2e rules enforced
- **Ancestry, Background & Class** — Browse and select from all official options with full descriptions
- **Ability Scores** — Track boosts by source (ancestry, background, class, level-up)
- **Skills** — Assign proficiency ranks with class-granted training highlighted
- **Feats** — Dynamic slot schedule per class with prerequisite checking and greyed-out invalid options
- **Spells** — Spellcasting entry management, spell slot tracking, tradition filtering
- **Equipment** — Item browser with bulk tracking and currency management
- **Character Sheet** — Auto-calculated AC, saves, attack bonuses, spell DCs, perception, and all skills
- **Progression Timeline** — Level 1–20 view of all feat slots, class features, and ability boosts
- **Variant Rules** — Free Archetype, Ancestry Paragon, Automatic Bonus Progression toggles
- **URL Sharing** — Compressed character state in URL query param for easy sharing
- **JSON Export/Import** — Full character data portability
- **Print to PDF** — Print-optimized layout via browser print-to-PDF
- **Dark Mode** — System preference detection with manual toggle

## Running Locally

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

## Game Data

Game data is fetched from the [Foundry VTT PF2e repository](https://github.com/foundryvtt/pf2e) at runtime.

### How data loading works

1. **On first load**: The app fetches directory listings from the GitHub Contents API, then downloads each pack file via jsDelivr CDN (no rate limits). This may take 30–60 seconds depending on connection speed.
2. **Caching**: Fetched data is cached in `localStorage` for 24 hours. Subsequent loads are instant.
3. **Fallback**: If a pre-built `public/data/pf2e-data.json` exists (see below), it is used instead of live fetching.

### Pre-building game data (optional)

To bundle game data locally and skip the runtime fetch entirely:

```bash
npm run fetch-data
```

This downloads all pack data and writes it to `public/data/pf2e-data.json`. The file is ~50–80 MB and is excluded from git by default (add to `.gitignore`).

To force re-fetch even if the file already exists:

```bash
npm run fetch-data:force
```

### Refreshing cached data

In the app, open **Settings** (gear icon) and click **Refresh Game Data**. This clears the localStorage cache and re-fetches from the CDN.

Alternatively, clear the cache manually in the browser console:

```javascript
localStorage.removeItem('pf2e_gamedata_v2');
```

## Project Structure

```
src/
  types/          # TypeScript interfaces for PF2e data and character state
  data/           # Data loader (fetching, caching, fallback logic)
  store/          # Zustand stores (character, game data, UI)
  utils/          # Calculations, prerequisite checking, sharing, HTML sanitization
  components/
    builder/      # Character builder sections (ancestry, class, feats, etc.)
    sheet/        # Character sheet view
    progression/  # Level progression timeline
    shared/       # Reusable UI components (modals, tooltips, etc.)
scripts/
  fetch-pf2e-data.mjs   # Node.js script to pre-build game data bundle
```

## Tech Stack

- **React 19** + **TypeScript** + **Vite 8**
- **Zustand v5** — State management
- **Tailwind CSS v4** — Styling
- **lz-string** — Character URL compression

## License

Game data is sourced from the [Foundry VTT PF2e system](https://github.com/foundryvtt/pf2e) and is subject to its respective licenses. This tool is a fan project and is not affiliated with Paizo Inc.
