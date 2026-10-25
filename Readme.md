# Pit Wall — F1 Championship Dashboard

A mobile-first Formula 1 championship dashboard built on the free [OpenF1 API](https://openf1.org). Six pages behind a sidebar with custom D3-generated icons: Dashboard, Results, Standings, Calendar, Circuits and Teams. It covers drivers' and constructors' standings, the title fight round by round, who can still mathematically win, teammate battles, podiums, a timing tower with tyre strategy, lap-by-lap race pace, the season calendar, and a D3 track map for every circuit. Every chart and icon is hand-built in D3 + SVG, with no charting or icon library.

**The unique touch: Season Replay.** Press ▶ and the whole dashboard rewinds to round 1 and replays the season. Standings bars race into their new order, the title-fight marker moves along, and the title math recalculates after every race and sprint. You can also scrub to any round from the strip of round chips.

Built with React 18 + Vite in plain JavaScript, as a single-page app with hash routing (`#/results?season=2025&round=9839`). Every page, season and round is a shareable link, and the build runs on any static host with no server rewrites. There is no backend and no database: the browser calls OpenF1 and MultiViewer directly (both allow CORS `*`), and responses are cached in memory for the session.

---

## Features

| Page / section | What it shows |
| --- | --- |
| Sidebar | Six pages with animated D3 icons. Collapses to an icon rail on desktop (remembered) and becomes a slide-in drawer on phones (Escape or tap outside to close) |
| Top bar | Page title, season picker (2023 → current), Auto/Light/Dark theme toggle |
| Round scrubber (sticky) | Every round as a flag chip (sprints marked), ▶ Season Replay, ‹ › stepping, progress bar |
| Next session | Countdown to the next race or sprint; pulses red inside 24 hours |
| Hero tiles | Championship leader (headshot, points, gain this round), gap to P2, points still in play, constructors' leader |
| Standings | Drivers / Teams × Chart / Table. Chart is a stacked bar per entry: points before the round + points gained, with tap/hover tooltips |
| Title math | Who can still win the drivers' or constructors' title, each contender's deficit as a meter against the points left |
| Title fight | Points-progression lines for the top 5, legend toggles, crosshair tooltip, tap a round to jump to it |
| Round recap | Podium with headshots, championship movers, retirements (DNF/DNS/DSQ), timing tower with tyre stints |
| Teammate battles | Each team's two drivers, points split and margin |
| Race pace | Lap-time chart for any driver in the selected session, fastest / median / timed laps, "clean laps" filter (107% rule) |
| **Pages** | **Dashboard**: next race, hero tiles, standings, title math, title fight · **Results**: round recap + race pace · **Standings**: full drivers and constructors tables · **Calendar**: every weekend with status (Completed / Race weekend / Next up / Upcoming / Cancelled), dates, sprint badge, link to results · **Circuits**: D3 track map with numbered corners, ≈length, corners, circuit type · **Teams**: constructors chart + teammate battles |

Mobile: layouts collapse to one column, tap targets are at least 44px, the sidebar becomes a drawer, the round strip scrolls with snap points, tables hide secondary columns, and charts measure their container before first paint and then with `ResizeObserver` (no fixed `viewBox` scaling, so text stays legible on phones). Checked with headless Chrome screenshots at 390px and 1440px.

Accessibility: every chart has an ARIA label and a table or text equivalent. Team identity is never conveyed by colour alone. Respects `prefers-reduced-motion`. Light and dark palettes are each validated for colour-vision deficiency and contrast.

## Design references

| Idea | Source |
| --- | --- |
| App shell: left sidebar with icon + label nav, highlighted active item, Collapse control at the bottom, top bar with the page title | [formula-timer.com](https://formula-timer.com/circuit) (from a screenshot you shared; the site itself is behind a Cloudflare bot check) |
| Navy-slate dark palette (sidebar `#111827`, page `#182032`, cards `#1e2638`) | formula-timer.com |
| Page header: very large bold title, muted subtitle, short red accent bar | formula-timer.com |
| Card grid: track map on top, red status pill top-left, flag top-right, name + place, Length / Corners stats row | formula-timer.com Circuits page |
| Cards whose border turns red on hover, pulsing red "live" dot, small status pills | [f1analytics.online/dashboard](https://www.f1analytics.online/dashboard) (inferred from its public CSS/JS bundle) |
| Timing tower: position, gap, tyre compounds per stint; purple for fastest lap | General F1 live-timing conventions |
| D3-generated icon set, D3 track maps from real outlines, Season Replay, title math, kerb-stripe markers, start-lights loader | Original to this project |

Content (names, descriptions) is our own or comes from the APIs. formula-timer.com's "First GP" stat isn't in any API we use, so the cards show circuit type and round instead. The app is mobile-first, whereas f1analytics.online describes itself as "best viewed on desktop".

## Architecture

Data flows one way, and each layer has one job:

```text
OpenF1 API
    │
    ▼
src/data/        → rate-limited, caching fetch client + season loader (raw OpenF1 rows)
    │
    ▼
src/transforms/  → PURE functions: raw rows → chart-ready data (Jasmine, 100% covered)
    │
    ▼
src/state/       → useAsync (loading/error/data) + useSeasonView (derives every view per round)
    │
    ▼
src/layout/ + src/pages/ + src/components/ → shell, pages, panels      src/charts/ → D3 charts
```

**Rules that matter:**

1. **Transforms are pure.** They do no fetching, no DOM work and no React. Every function in `src/transforms/` takes plain data and returns plain data.
2. **D3 owns the SVG and React owns everything else.** Each chart renders a single `<svg ref>`; all drawing happens in a `useEffect` through D3's `selection.join()`. Tooltips are HTML siblings rendered by React.
3. **Requests are serialised.** The OpenF1 free tier allows about 3 requests/second. The client queues requests one at a time with a 350ms gap, dedupes identical URLs, retries 429s with backoff, and never caches failures.
4. **Every effect cleans up**: timers, `ResizeObserver`s and D3 transitions (`selection.interrupt()`).
5. **Session keys are not chronological** (rescheduled rounds get new keys). "Latest" always means latest by `date_start`.

## Components

### Charts (`src/charts/`)

| Component | Purpose | Data in |
| --- | --- | --- |
| `StandingsChart.jsx` | Stacked horizontal bars (before + gained), keyed by entry so bars slide to new ranks; tooltips | `StandingRow[]` |
| `ProgressionChart.jsx` | Points-per-round lines, selected-round marker, direct end labels, crosshair tooltip, click to select | series of `{ index, points }` |
| `LapTimeChart.jsx` | Lap-time line + dots for one driver; pit-out laps outlined | `LapTime[]` |
| `useResponsiveSvg.js` | `ResizeObserver` width hook + `prefersReducedMotion()` | — |
| `TrackMap.jsx` | Circuit outline from MultiViewer data: asphalt + racing line, numbered corners, chequered start/finish | `CircuitInfo` |
| `barPath.js` | Bar path with a rounded data-end and square baseline (interpolates cleanly) | — |

### Icons (`src/icons/`)

`geometry.js` builds the icon set as pure path data with `d3-shape` on a 24×24 grid; `Icon.jsx` renders it with `currentColor`. Each icon has named parts that animate on hover or when active (disabled for reduced motion):

| Icon | Built from | Hover / active |
| --- | --- | --- |
| Dashboard: speedometer | `d3.arc` dial and redline, computed tick marks, needle | Needle sweeps up |
| Results: chequered flag | `curveBasis` waving edges with checks that follow the wave | Flag waves |
| Standings: podium | Polygon blocks and a computed 5-point star | Star spins and grows, turns red |
| Calendar | Rounded page, binder rings, `d3.arc` day dots | Race day turns red |
| Circuits: track | Closed `curveCatmullRomClosed` loop and start line | Racing line traces round |
| Teams: steering wheel | `d3.arc` rim and hub, spokes, shift paddles | Wheel turns |
| Collapse/expand, menu, close | Chevrons and bars | — |

### Layout and pages (`src/layout/`, `src/pages/`)

| Component | Purpose | Inspired by |
| --- | --- | --- |
| `AppShell.jsx` | Sidebar (collapsible rail / mobile drawer), top bar, season picker, theme toggle | formula-timer.com |
| `PageHeader.jsx` | Big title, subtitle, red accent bar | formula-timer.com |
| `CalendarPage.jsx` | Weekend cards with status pills, dates, sprint badge, results link | formula-timer.com cards |
| `CircuitsPage.jsx` | Circuit cards with `TrackMap`, ≈length, corners, round, type | formula-timer.com Circuits |

### Components (`src/components/`)

| Component | Purpose | Inspired by |
| --- | --- | --- |
| `Panel.jsx` (+ `Segmented`) | Glass card with kerb-striped kicker; segmented toggle buttons | f1analytics.online cards |
| `RoundScrubber.jsx` | Sticky round strip, Season Replay, prev/next | Original |
| `NextRound.jsx` | Countdown pill with pulsing live dot | f1analytics.online live dot |
| `HeroStats.jsx` | Leader / gap / points in play / constructors tiles | f1analytics.online cards |
| `StandingsPanel.jsx` | Drivers ↔ Teams, Chart ↔ Table | — |
| `StandingsTable.jsx` | Accessible standings table with ▲▼ movement | Timing-screen conventions |
| `TitleMath.jsx` | Who can still win (drivers or constructors) | Original |
| `TitleFight.jsx` | Legend toggles + `ProgressionChart` | — |
| `RoundRecap.jsx` | Podium, movers, retirements, timing tower with tyre stints | Live-timing conventions |
| `TeammateBattles.jsx` | Points split per team | — |
| `RacePace.jsx` | Driver picker, lap stats, clean-lap filter, `LapTimeChart` | Live-timing purple fastest lap |
| `ThemeToggle.jsx` | Auto / Light / Dark, remembered per browser | — |

### Transforms (`src/transforms/`)

| Module | Functions |
| --- | --- |
| `championship.js` | `toRounds`, `toDriverDirectory`, `toTeamColours`, `toDriverStandings`, `toTeamStandings`, `toProgression`, `toTitleMath`, `toTeammateBattles`, `toMovers`, `toClassification` |
| `lapTimes.js` | `toLapTimes`, `medianLap`, `withoutSlowLaps`, `lapSummary` |
| `stints.js` | `toStintsByDriver`, `compoundLetter` |
| `calendar.js` | `toCalendar`, `STATUS_LABEL` |
| `circuits.js` | `toTrackOutline`, `trackLengthKm`, `circuitTypeLabel`, `toCircuitList` |
| `format.js` | `formatLapTime`, `formatPoints`, `formatSigned`, `formatGap`, `formatDuration`, `ordinal`, `teamColourVar` |

## API calls

All calls go to `https://api.openf1.org/v1`. Historical data (2023 onwards) is free without authentication. During a live session OpenF1 restricts all access to paying users, and the app shows an error with a Retry button.

| Endpoint | Parameters | Used for | When |
| --- | --- | --- | --- |
| `/sessions` | `year`, `session_type=Race` | Calendar of races and sprints, cancellations | Once per season |
| `/meetings` | `year` | Grand Prix names, country flags | Once per season |
| `/championship_drivers` (beta) | `session_key>=first`, `session_key<=last` | Drivers' standings after **every** round, in one request | Once per season |
| `/championship_teams` (beta) | same range | Constructors' standings after every round | Once per season |
| `/drivers` | `session_key=<latest round>` | Names, acronyms, team, team colour, headshot | Once per season |
| `/drivers` | range + `driver_number=<missing…>` | Drivers who missed the latest round (injury, mid-season swap) | Only when needed |
| `/session_result` | `session_key` | Podium, gaps, DNF/DNS/DSQ, race time | Per selected round |
| `/stints` | `session_key` | Tyre compounds and stint lengths for the timing tower | Per selected round |
| `/laps` | `session_key`, `driver_number` | Race pace chart | Per selected round + driver |
| MultiViewer `/api/v1/circuits/{circuit_key}/{year}` | — (linked from OpenF1 meetings as `circuit_info_url`) | Track outline (x/y), corners, rotation for track maps, corner counts and ≈length | Circuits page, one per circuit, 150ms apart |

The Calendar page needs no extra requests (it reuses the season's sessions and meetings). Track length is measured from the outline (MultiViewer units are decimetres) and runs 1–2% short of official figures, so it's shown as "≈". A season loads in **5–6 requests**. Selecting a round adds 3. Every response is cached, so scrubbing back to a round, or replaying the season, makes no new requests. Available but unused so far: `/intervals`, `/position`, `/car_data`, `/pit`, `/weather`, `/race_control`, `/team_radio`, `/overtakes`, `/starting_grid`.

Max points used by title math: 25 per race and 8 per sprint for drivers, 43 and 15 for constructors (P1 + P2). There's no fastest-lap point (removed from 2025). Count-back tie-breaks are ignored.

## Folder structure

```text
F1-Dashboard/
├── src/
│   ├── data/          openf1Client.js · championshipSource.js
│   ├── transforms/    championship.js · lapTimes.js · stints.js · format.js
│   ├── state/         useAsync.js · useSeasonView.js · useRoute.js (hash router)
│   ├── layout/        AppShell · PageHeader
│   ├── pages/         CalendarPage · CircuitsPage · CardGrid.module.css
│   ├── icons/         geometry.js (D3 icon paths) · Icon.jsx
│   ├── charts/        StandingsChart · ProgressionChart · LapTimeChart · TrackMap · useResponsiveSvg · barPath
│   ├── components/    see the table above (each with a CSS Module)
│   ├── styles/        tokens.css — colours, series palette, timing & tyre colours, spacing, type, dark mode
│   ├── App.jsx        season loading, replay loop, layout
│   └── main.jsx
├── spec/              Jasmine: unit specs (transforms/, data/) and load specs (load/)
├── tests/             Vitest + Testing Library: chart and App integration tests
├── fixtures/
│   ├── seasons/       2025.json, 2026.json — real recorded OpenF1 data for tests
│   ├── circuits/      61.json (Singapore), 46.json (Suzuka) — real MultiViewer outlines
│   └── sessions/      latest.json — synthetic single-session fixture for the lap-time tests
├── scripts/           record-season · record · smoke-app · smoke-api · load · serve-build
└── .github/workflows/ci.yml
```

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173 — loads the current season live from OpenF1
```

No environment variables or API keys are needed.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `preview` | Vite dev server / production build / serve the build |
| `npm test` | Jasmine unit specs, then Vitest component tests |
| `npm run test:unit` | Jasmine unit specs (transforms, data layer, endpoint contract) |
| `npm run test:unit:coverage` | Same under `c8`, gated at ≥95% lines/functions, ≥85% branches |
| `npm run test:components` / `test:watch` | Vitest component + integration tests (once / watch) |
| `npm run test:ci` | Coverage-gated unit specs + component tests with coverage |
| `npm run test:smoke` | App smoke, then live OpenF1 API smoke |
| `npm run test:smoke:app` | Build, serve, check the page, viewport meta and every asset |
| `npm run test:smoke:api` | ~8 live requests, one per endpoint, checking the fields the app reads |
| `npm run test:load` | Jasmine load specs, then `autocannon` against the served build (`-- --connections 100 --duration 15`) |
| `npm run lint` / `format` | ESLint / Prettier |
| `npm run record:season -- <year>` | Save a season to `fixtures/seasons/<year>.json` |

## Testing

| Layer | Tool | What it covers |
| --- | --- | --- |
| Unit | **Jasmine** (`spec/`) + `c8` | Every transform (incl. calendar status, track-outline fitting and rotation, icon geometry bounds, hash routes), the fetch client (URL building, 404 → empty, 429 backoff, no caching of failures, serialisation), the season loader, and the exact URL of every endpoint. Uses real recorded 2025/2026 seasons and edge cases: cancelled rounds, non-chronological session keys, mid-season driver swaps, half points, lapped cars (`+1 LAP`), DNF/DNS/DSQ, missing lap times. Randomised order. |
| Component / integration | Vitest + React Testing Library (`tests/`) | Charts (row counts, keyed updates, tooltips, ticks, click-to-select) and the full App with mocked data: sidebar navigation, collapse, mobile drawer, URL ↔ season/round, every page, loading, error + retry, empty season, scrubbing, replay with fake timers, toggles, podium, timing tower tyres, race pace, calendar statuses and links, circuit maps. Queries by role and label, never by pixel. |
| Smoke | Node scripts | The production build serves and wires up (`smoke-app`); OpenF1 still returns what we depend on (`smoke-api`, including a MultiViewer circuit outline; scheduled weekly in CI and allowed to fail because these are third parties). |
| Load | Jasmine load specs + `autocannon` | Client under a 500-call burst: dedupes to unique URLs, one in flight, gap respected, survives 429/500s, a season stays ≤6 requests. Transforms on 10× a season's data stay within frame budgets. Static build under 50 concurrent connections: zero errors, p99 ≤ 250ms. |

**Load tests never target OpenF1.** It is a free, rate-limited third-party service. All burst testing uses a fake API in-process.

Latest local run: 175 Jasmine specs and 32 Vitest tests passing; transforms + data at 100% lines and functions; 10/10 app and 9/9 API smoke checks; load test at ~29k req/s for the page with p99 2ms (localhost, so it measures the server, not the network).

## Styling conventions

- All colours, spacing and type sizes come from `styles/tokens.css`. Components never hard-code hex values; team colours come from OpenF1 data.
- Chart series colours (`--series-1…5`) are validated for colour-vision-deficiency separation and contrast on both the light (`#ffffff`) and dark navy (`#1e2638`) card surfaces.
- One CSS Module per component, flat selectors, no `!important` (resets use `:where()` for zero specificity).
- Dark mode follows `prefers-color-scheme`, with a manual Auto/Light/Dark toggle.

## Working on this repo with Claude Code

- Plain JavaScript only, with JSDoc types on transforms.
- New data logic goes in `src/transforms/` as a pure function, with a Jasmine spec in the same change.
- Don't add a charting library, and don't let React render inside a chart's `<svg>`.
- Run `npm run lint && npm run test:ci` before calling a task done. Run `npm run test:smoke` and `npm run test:load` for anything touching data loading or the build.
- Explain any new dependency before adding it.

## Roadmap

- [x] Championship standings (drivers + constructors), chart and table
- [x] Season Replay and round scrubber
- [x] Title fight progression, title math, teammate battles
- [x] Round recap: podium, movers, retirements, timing tower with tyres
- [x] Race pace per driver
- [x] Jasmine unit specs, smoke and load tests, CI
- [x] Sidebar app shell with D3 icons, hash routing, shareable links
- [x] Calendar and Circuits pages with D3 track maps
- [ ] Gap-to-leader chart from `/intervals`
- [ ] Full tyre-strategy timeline chart from `/stints`
- [ ] Qualifying view (sector times, purple/green/yellow)
- [ ] Optional precomputed FastF1 data (telemetry, corner speeds) via a build-time Python export
- [ ] Ember Octane port of one view

## Credits

Data from [OpenF1](https://openf1.org). This is an unofficial fan project and isn't associated with Formula 1 or the FIA.
