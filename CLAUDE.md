# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js, http://localhost:3000)
npm run build    # Production build (runs TypeScript compiler)
npm run start    # Serve production build
```

There is no test suite and no linter configured. TypeScript errors surface only at build time via `npm run build`.

## Architecture

**whatsmyedge** is a client-only Next.js 15 app (App Router) for analyzing MNQ futures trades. All state is in-memory — there is no backend, database, or auth.

### Data flow

1. **Import** — The user uploads a Sierra Chart XLSX export via `/import`. `lib/parser.ts:parseXLSX` reads it with the `xlsx` library, strips whitespace from column headers, and maps each row into a `Trade` object. Each `Trade` embeds a nested `MarketBar` object containing the 50+ market-context columns (waves, volume pressure, EMA distances, DSS, VWAP bands) that were present in the normalized export.

2. **Global store** — `lib/store.tsx` exposes a single React context (`StoreProvider` wraps the entire app in `layout.tsx`). It holds the raw `Trade[]`, computes `FilterRanges` from the loaded data, and exposes two filter states: `globalFilters` (persists across pages) and `localFilters` (resets when scope switches). The active set is `activeFilters = scope === 'global' ? globalFilters : localFilters`.

3. **Filtering** — `lib/filters.ts:applyFilters` runs the active `FilterState` against the full trade list on every filter change (memoized via `useMemo`). The filter panel (`components/FilterPanel.tsx`) is a slide-in drawer controlled by `filterOpen` in the store.

4. **Stats computation** — `lib/parser.ts:computeStats` receives the *filtered* trades and computes the full `DashboardStats` object in one pass. All analytics (equity curve, drawdown, rolling expectancy, wave stats, setup stats, time buckets, weekday breakdown, etc.) derive from this single computation.

### Pages

| Route | Purpose |
|---|---|
| `/` | Dashboard — core metrics, equity curve, trade log, market context panel |
| `/analytics` | Deep analytics — drawdown, rolling expectancy, MFE/MAE scatter, wave alignment, E8 buckets, Delta%, weekday |
| `/journal` | Filterable trade-by-trade log with full market context |
| `/playbook` | Setup-by-setup breakdown |
| `/calendar` | Calendar heatmap of daily PnL |
| `/import` | XLSX file upload |
| `/settings` | Theme / display settings |

All pages are `'use client'` and pull data via `useStore()`.

### Types

- `types/index.ts` — `Trade`, `MarketBar`, and all `*Stats` shapes returned by `computeStats`
- `types/filters.ts` — `FilterState`, `FilterRanges`, `FilterScope`, and `DEFAULT_FILTERS`

### Design system

Styling is inline CSS using CSS variables defined in `app/globals.css`. Utility classes from that file:
- `.card` / `.card-title` — standard card container
- `.pos` / `.neg` — green/red text color
- `.badge`, `.badge-green`, `.badge-red`, `.badge-amber`, etc.
- `.btn`, `.btn-primary`, `.btn-ghost`
- `.table-base` — base table styles
- `.insight` — amber-bordered insight callout block

Color tokens: `--bg0` through `--bg4` (dark backgrounds), `--t1/t2/t3` (text hierarchy), `--green`, `--red`, `--blue`, `--amber`, `--purple`.

Tailwind is present but almost unused — prefer inline styles with CSS variables to match the existing pattern.

### Charts

All charts live in `components/Charts.tsx` and are built with **Recharts**. Each is a thin wrapper that receives pre-computed data from `stats`. Adding a new chart means adding a new export to that file and rendering it in the relevant page.

### Key constraints

- `Setup` is derived from the first comma-separated segment of the `Note` field in the XLSX (`note.split(',')[0].trim()`). Setup-based filtering and stats depend on this convention.
- Duration and Time fields from Sierra Chart can arrive as fractional days (e.g. `0.3965625`) or as `"HH:MM:SS.ffffff"` strings — `parseTime` and `fmtDuration` in `lib/parser.ts` handle both forms.
- `FilterRanges` are computed from the actual data after load and used to set slider bounds — numeric filter defaults are data-driven, not hardcoded.
