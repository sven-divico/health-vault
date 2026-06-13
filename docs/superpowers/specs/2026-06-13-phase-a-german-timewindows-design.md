# Phase A — German UI + Time-Window Pills + Insights Sparse-Point Fix

Date: 2026-06-13
Status: Design (approved decisions captured) — for review, implement in a fresh session
Related: `docs/superpowers/specs/2026-06-13-phase-b-nutrition-design.md` (Phase B)

## Goal
Three cohesive, no-schema-change improvements: localize the whole product to German,
add a reusable time-window selector above the Measures and Insights charts (remembered via
cookie), and fix the bug where sparse (single-point) series render invisibly in Insights.

## Decisions (from discussion)
- **German scope:** full — web UI, all Telegram bot replies, and the vision AI returns
  **German dish names**. Single language (no EN/DE toggle — YAGNI).
- **"Today" window = since local midnight (00:00)** in the user's (German) local time.
- DB may be reset freely (no live data) — but Phase A needs no schema change.

---

## 1. German localization

### Approach
A single central strings module — **no i18n framework** (one language, compile-time).
- `lib/i18n/de.ts` exports a typed `t` object grouped by area (nav, common, dashboard,
  measures, insights, media, people, settings, login, bot). Components import `t` and use
  `t.area.key` instead of hardcoded English.
- `app/layout.tsx`: set `<html lang="de">`.
- Dates/numbers: render with the **`de-DE` locale** — replace `toLocaleDateString()` /
  `toLocaleString()` calls with `toLocaleDateString('de-DE', …)` etc. ECharts time-axis
  labels: pass a `de-DE` formatter where labels are shown.

### Scope of replacement (files with user-facing English today)
- `lib/nav.ts` — section labels (see table below).
- `components/Sidebar.tsx`, `components/AppShell.tsx` — brand stays "Health Vault"; aria
  labels ("Open navigation menu" → "Menü öffnen", etc.).
- `app/page.tsx` (Dashboard), `app/measures/page.tsx`, `app/food/page.tsx`,
  `app/insights/page.tsx` + `components/insights/InsightsView.tsx`, `app/media/page.tsx` +
  `components/media/Gallery.tsx`, `app/people/page.tsx` + `app/people/actions.ts` messages,
  `app/settings/page.tsx`, `app/login/page.tsx`, `components/MeasureCharts.tsx` titles.
- **Bot** (`lib/telegram/dispatch.ts`): all reply strings + `/help`, e.g.
  `'✓ photo logged'` → `'✓ Foto gespeichert'`, usage/`/activity` hints, error replies,
  the "not linked" message, login-code confirmations.
- **Vision AI** (`lib/vision/index.ts`): add to the system prompt that `dish_name` must be a
  **German** common name (e.g. "Spaghetti Carbonara" stays, "Apfelkuchen" not "Apple Pie").

### Nav label mapping (proposed)
| EN | DE |
|---|---|
| Dashboard | Übersicht |
| Activity | Aktivität |
| Nutrition | Ernährung |
| Body | Körper |
| Weight | Gewicht |
| Mood | Stimmung |
| Measurements | Messwerte |
| Insights | Auswertung |
| Media | Medien |
| People | Personen |
| Settings | Einstellungen |

(Implementer: complete the strings table during build; the table above fixes the
contentious terms so wording is consistent.)

### Out of scope
Language toggle, locale negotiation, translating stored data (dish names already produced
in German going forward; pre-existing English entries are not retro-translated).

---

## 2 & 3. Time-window pills (Measures + Insights) with cookie memory

### Component
`components/TimeRangePills.tsx` (client, reusable):
- Renders a horizontally **scrollable** row of pills (`overflow-x-auto`, no wrap) so it
  never breaks the mobile layout.
- Options (key → German label): `today`→"Heute", `24h`→"24 Std", `7d`→"7 Tage",
  `month`→"Monat", `all`→"Alle".
- Props: `{ value: RangeKey; onChange: (k: RangeKey) => void }`.
- Active pill highlighted (filled), others outlined — same visual language as the existing
  Insights chips.

### Range semantics (computed in the browser's LOCAL time)
`lib/time-range.ts` (pure, unit-tested) — `rangeBounds(key, now): { from: number }`:
| Key | from |
|---|---|
| `today` | local **midnight** of `now` (00:00 today) |
| `24h` | `now − 24h` (rolling) |
| `7d` | `now − 7 days` |
| `month` | `now − 31 days` |
| `all` | `0` (epoch — everything) |
`to` is always `now`. Series points with `t >= from` are kept.

### Data flow (client-side filtering — no refetch)
- Server pages load the **full** series (replace the Insights page's `120 days` with all
  data; Measures already loads a year — bump to all). Volume is tiny now; revisit if it
  grows.
- The page passes full series + an `initialRange` (read from the cookie server-side, to
  avoid a hydration flash) into a small client wrapper that holds the selected range,
  renders `<TimeRangePills>`, filters each series by `rangeBounds(range)`, and passes the
  filtered series to the existing `MeasureCharts` / `InsightsView`.
- **Measures**: new `components/measures/MeasuresView.tsx` (client) wraps pills +
  `MeasureCharts` (+ the activity list, also filterable). **Insights**: lift the range state
  into `InsightsView` (it's already client) — add the pills above the metric chips and
  filter `metrics[].points` by range before building chart options.

### Cookie
- Single shared cookie `hv_timerange` (value = RangeKey), default `7d`.
- Read **server-side** (`cookies()`) in each page to seed `initialRange` (no flash); written
  **client-side** (`document.cookie`, ~1yr maxAge, path `/`, SameSite=Lax) on change.
- Shared across Measures & Insights for consistent behavior (acceptable; can split into two
  cookies later if desired).

---

## 4. Insights sparse-point fix (the "no food data" bug)

### Root cause (confirmed against prod)
Series with a **single point** render nothing because chart series use `showSymbol: false`
(a line needs ≥2 points; symbols are hidden). On a fresh account (food on 1 day, weight 1
point, activity 1 point) only mood (2 points) draws — so food/weight/activity look empty.

### Fix
- In `InsightsView` (`stackedOption` + `overlayOption`) and `components/MeasureCharts.tsx`,
  set `showSymbol` **per series adaptively**: `showSymbol: points.length <= 60` with a small
  `symbolSize` (~4). Dense series (90-day demo) stay clean; sparse series show visible dots.
- **Default metric selection** in `InsightsView`: include **all metrics that have data**
  (so Food is shown by default when present), instead of `.slice(0, 3)`.
- Interaction with §2: after range filtering, a series may drop to a single point inside the
  window — the symbol fix guarantees it's still visible.

### Known limitation for the "Heute" range on the Food/Energy series (resolved in Phase B)
The Insights Energy/Food series is built by `sumKcalByDay` in `lib/insights/index.ts`, which
buckets by **UTC** day (`dayStartUtc`). The new pills compute "Heute" at **local** midnight.
For German time (UTC+1/+2) the two can disagree by 1–2h at day boundaries, so a "Heute"
filter on the *Food* lane can occasionally include/exclude the wrong day's point. The 24h /
7d / Month / All ranges are unaffected. Phase A does **not** change the kcal aggregation;
**Phase B** moves Food/Energy aggregation to **local-day** bucketing, fully resolving this.
(Acceptable for Phase A: food still renders correctly for all non-"Heute" ranges.)

---

## Components & boundaries (Phase A)
| Unit | Responsibility |
|---|---|
| `lib/i18n/de.ts` | All German UI/bot strings (grouped, typed) |
| `lib/time-range.ts` | Pure `rangeBounds(key, now)` (unit-tested) |
| `components/TimeRangePills.tsx` | Reusable scrollable range selector (presentational) |
| `components/measures/MeasuresView.tsx` | Client wrapper: pills + cookie + filter → MeasureCharts/activity |
| `components/insights/InsightsView.tsx` | + pills/range state + adaptive symbols + default-select-all-with-data |
| `components/MeasureCharts.tsx` | adaptive `showSymbol`; de-DE date labels |
| `lib/telegram/dispatch.ts`, `lib/vision/index.ts` | German bot replies; German `dish_name` |

## Error handling / edge cases
- Empty window (no points in range) → existing "no data" empty-state (German text).
- Cookie absent/invalid → default `7d`.
- `all` with large future data → fine (epoch lower bound).

## Testing
- Unit-test `rangeBounds` for each key (today=local-midnight boundary, rolling windows, all).
- Build + visual check: pills filter both charts; a single-point series shows a dot; German
  strings render; cookie persists selection across reload.

## Roadmap note
Phase A has **no schema change** and can ship independently. The German vision-prompt change
(dish names) is the only overlap with Phase B (which extends the same vision schema with
nutrition) — implement Phase A first; Phase B builds on the German prompt.
