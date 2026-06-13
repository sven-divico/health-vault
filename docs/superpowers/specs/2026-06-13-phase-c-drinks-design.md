# Phase C — Drink Tracking (logging, table, water gauge, Insights)

Date: 2026-06-13
Status: Design (approved decisions captured) — for review, implement in a fresh session
Depends on: Phase B (`2026-06-13-phase-b-nutrition-design.md`) — reuses its table/summary/
pagination/edit-delete patterns, the AI text-estimate helper, and the `de-DE` German UI from
Phase A. Implement after Phase B.

## Goal
Track drinks (volume, alcohol, sugar) under a Nutrition → Food / Drinks split, with the same
period summaries as food, a drinks category in Insights, and a donut gauge of the day's
hydration against the EU recommendation.

## Decisions (from discussion)
- **Water gauge:** sum of **all** drink volume for **today (local midnight)** vs a flat
  **2.0 L** adult goal (EFSA-based: ~2.0 L women / 2.5 L men total water; flat 2.0 L to
  start). Goal in `DRINK_WATER_GOAL_ML` env (default 2000), refinable per-sex later.
- **Alcohol** stored/displayed as **grams of pure alcohol**.
- **Input:** Telegram `/drink <name> <volume>` (AI estimates alcohol/sugar) + web add/edit/
  delete. Photo recognition for drinks is out of scope (later).
- Own Phase C spec; DB reset is fine.

---

## 1. Nav restructure — Nutrition becomes a group

`lib/nav.ts`: change **Ernährung** (Nutrition) from a leaf into a group with children:
- **Essen** (Food) → `/food`
- **Getränke** (Drinks) → `/drinks`

(Phase A localized it as a leaf; Phase B keeps `/food`; Phase C converts it to the group and
adds `/drinks`. Mirrors the existing "Körper/Body" group pattern in `lib/nav.ts`.)

---

## 2. Data model — new table `drink_entries`

Store concentration **per 100 ml** + the logged **volume** (same recalc principle as food's
per-100 g), so a volume edit rescales linearly and a name edit re-estimates concentration.
```
id              integer pk autoincrement
user_id         integer not null  → users.id
logged_at       timestamp not null
source          text ('text' | 'web')     -- bot text vs web manual
name            text                       -- German drink name, e.g. "Wasser", "Bier"
volume_ml       real not null              -- the amount logged
alcohol_g_per_100ml real                   -- grams pure alcohol / 100 ml (= ABV% × 0.789); 0 for water
sugar_g_per_100ml   real                   -- grams sugar / 100 ml
raw_text        text                       -- original bot text
vision_confidence real                     -- AI estimate confidence
```
Index `(user_id, logged_at)`. Migration adds the table (next number after Phase B's, e.g.
0004). No image column (text/web only).

### Derived absolutes (pure helper)
`lib/drinks/index.ts`:
```
absoluteDrink(entry) -> { volumeMl, alcoholG, sugarG }
  // alcoholG = alcohol_g_per_100ml * volume_ml/100 ; sugarG likewise ; null-safe
```
Used by the table, summaries, the water gauge, and the Insights drink series.

### Usage logging
Extend `vision_usage` with a nullable `drink_entry_id` (→ drink_entries.id) so the AI
text-estimate calls for drinks are cost-tracked like food. `recordVisionUsage` gains an
optional `drinkEntryId` (one of food/drink id set; both nullable). (Schema change on
`vision_usage` — fine under DB reset.)

---

## 3. AI text-estimate for drinks (reuses Phase B's helper)

Add to `lib/vision/text-estimate.ts` (introduced in Phase B):
`estimateDrinkFromText(name: string): Promise<{ alcohol_g_per_100ml, sugar_g_per_100ml, confidence, usage }>`
— a text-only `messages.create` with an `output_config.format` JSON schema (all props in
`properties` AND `required`; nullables via `anyOf`; `additionalProperties:false`). Prompt:
estimate per-100 ml grams of pure alcohol and sugar for the named drink (German names; water
≈ 0/0). The user supplies **volume** (not the AI). Usage logged to `vision_usage` exactly
like the food text estimate — `src_bytes`/`sent_bytes`/`width`/`height` = 0 (NOT NULL
columns) — but with **`drink_entry_id`** set instead of `food_entry_id`. So
`recordVisionUsage` (Phase B) routes the new `drinkEntryId` while still passing 0s for the
byte/dimension columns.

---

## 4. Logging drinks

### Telegram `/drink <name> <volume>`
- `lib/drinks/parse.ts` — pure `parseDrink(text) -> { name, volumeMl } | null` (unit-tested).
  Volume tokens: `500ml`, `0.5l`, `0,5l`, `500` (bare = ml). Everything before the volume is
  the name. No volume → null (usage hint).
- `lib/telegram/dispatch.ts`: add a `/drink` branch → `parseDrink` → on success,
  `estimateDrinkFromText(name)` → insert a `drink_entries` row (source `text`, persisting the
  AI `confidence` → `vision_confidence`) → reply in German, e.g.
  `✓ Getränk gespeichert: <b>Bier</b> · 500 ml · 20 g Alkohol`. Log usage.
  Update `/help` with the `/drink` line. No volume → `Verwendung: /drink Bier 500ml`.

### Web add
A small "Getränk hinzufügen" form on `/drinks` (name + volume, optional alcohol/sugar
override) posting a server action that estimates (if not overridden) and inserts (source
`web`). Any manual alcohol/sugar override is entered and stored as **per-100 ml**
concentration (consistent with the storage model), not absolute grams.

---

## 5. Drinks page `/drinks`

### Water donut (top)
`components/drinks/WaterGauge.tsx` (client, ECharts) — today's **total drink volume** (local
day) vs `DRINK_WATER_GOAL_ML`. Center label German, e.g. `1,2 / 2,0 L · 60 %`. Visual fill
caps at 100 % but the label shows the real value (e.g. `2,4 / 2,0 L · 120 %`). Server passes
today's sum + goal.

### Table (mirrors Phase B's NutritionTable)
`components/drinks/DrinksTable.tsx`: columns **Zeit · Getränk · Menge (ml) · Alkohol (g) ·
Zucker (g) · Aktionen** (absolute values via `absoluteDrink`, `—` when null). Horizontal
scroll on mobile, sticky first column. Pagination server-side, default **25**, options
**25/50/100/150**, page size in cookie `hv_drink_page_size`.

### Summary band (above the table)
`components/drinks/DrinkSummary.tsx`: rows **Heute (seit Mitternacht) · 24 Std · 7 Tage ·
Monat (31 Tage)**, columns = sums of **Volumen / Alkohol / Zucker** over each window
(server-side, local-day "Heute", independent of pagination). `lib/drinks/summary.ts`.

### Edit / delete (server actions, `app/drinks/actions.ts`, auth + ownership)
- `deleteDrinkEntry(id)` — confirm dialog → delete row.
- `updateDrinkEntry(id, { name, volumeMl })`:
  - **Volume only** → update `volume_ml`; absolutes recompute on read (no AI).
  - **Name changed** → `estimateDrinkFromText(name)` → overwrite per-100 ml concentrations +
    name; log usage.
- Reuses the Next 16 `'use server'` form-action pattern from `app/people` / Phase B.

---

## 6. Insights — drinks as its own category

Extend `lib/insights` `METRICS` + `seriesFor` with two drink metrics (querying
`drink_entries`, summed per **local day** — consistent with Phase B):
- **`drink_volume`** → "Getränke (ml)" (daily total volume), color e.g. cyan `#06b6d4`.
- **`alcohol`** → "Alkohol (g)" (daily total `absoluteDrink().alcoholG`), color e.g. `#b91c1c`.

`InsightsView` picks them up automatically as chips (no view change). (Sugar-from-drinks
could be added later or merged with food sugar; kept out for now to avoid metric sprawl.)

---

## Components & boundaries (Phase C)
| Unit | Responsibility |
|---|---|
| `lib/nav.ts` | Ernährung → group (Essen `/food`, Getränke `/drinks`) |
| `lib/db/schema.ts` | `drink_entries` table + `vision_usage.drink_entry_id`; migration (next #) |
| `lib/drinks/index.ts` | `absoluteDrink(entry)` (pure, tested) + read helpers |
| `lib/drinks/parse.ts` | `parseDrink(text)` (pure, tested) |
| `lib/drinks/summary.ts` | windowed Volumen/Alkohol/Zucker sums per user |
| `lib/vision/text-estimate.ts` | + `estimateDrinkFromText(name)` |
| `lib/vision/usage.ts` | `recordVisionUsage` accepts optional `drinkEntryId` |
| `lib/telegram/dispatch.ts` | `/drink` branch + `/help` |
| `lib/insights/index.ts` | + `drink_volume`, `alcohol` metrics (local-day) |
| `app/drinks/page.tsx` | server: gauge data + summaries + paged list |
| `components/drinks/WaterGauge.tsx` | ECharts donut vs goal |
| `components/drinks/DrinksTable.tsx` | table + row edit/delete |
| `components/drinks/DrinkSummary.tsx` | period × (Volumen/Alkohol/Zucker) band |
| `app/drinks/actions.ts` | `deleteDrinkEntry`, `updateDrinkEntry` (auth + recalc) |

## Config
`DRINK_WATER_GOAL_ML` (default 2000). Optional later: per-sex goal needs a profile `sex`
field (out of scope now).

## Error handling / edge cases
- `/drink` without a volume → reject with German usage hint.
- Water / known non-alcoholic → AI returns ~0 alcohol; still counts toward the gauge volume.
- Null alcohol/sugar (AI failure) → "—", excluded from sums; drink still logged with volume.
- Edit name empty / volume ≤ 0 → reject (German validation).
- Gauge > 100 % → cap the fill, show real % in the label.
- Delete requires confirm.

## Testing
- `parseDrink` — name/volume across `500ml`, `0.5l`, `0,5l`, `500`, missing volume.
- `absoluteDrink` — per-100 ml × volume, null handling.
- `summaryForUser` (drinks) — windowed sums incl. local-day "Heute".
- Manual: `/drink Bier 500ml` logs + German reply + `vision_usage` row with `drink_entry_id`;
  `/drinks` shows gauge (today vs 2 L) + table + summaries; pagination + size cookie; edit
  volume rescales; edit name re-estimates; delete removes; Insights shows Getränke + Alkohol.

## Out of scope (later)
Drink photo recognition; per-sex/weight water goal; discounting alcohol from hydration;
sugar-from-drinks Insights metric; merging drink sugar into a combined sugar series.
