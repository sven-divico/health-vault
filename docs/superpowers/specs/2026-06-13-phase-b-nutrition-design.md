# Phase B — Nutrition Tracking (schema, AI, table, edit/delete)

Date: 2026-06-13
Status: Design (approved decisions captured) — for review, implement in a fresh session
Depends on: Phase A (`2026-06-13-phase-a-german-timewindows-design.md`) — German vision
prompt + de-DE formatting + table strings. Implement Phase A first.

## Goal
Track key nutrition values per food entry, surface them as a German table on the Nutrition
page with per-period summaries and pagination, and let the user correct entries (dish /
portion) with automatic recalculation.

## Decisions (from discussion)
- **Nutrition set (EU-label "Big 7" + fiber):** Energy (kcal), Carbohydrates, of which
  Sugar, Fat, of which Saturated fat, Protein, Fiber, Salt.
- **DB may be reset** — destructive schema change is fine, no data migration.
- **Periods** use Phase A semantics: Today = since local midnight, plus 24h / 7d / Month(31d).

---

## 5.1 Data model

### Principle: store **per-100 g** + **portion**, derive absolutes
This is what makes recalculation clean: a portion change scales linearly with no AI; a dish
change re-estimates only the per-100 g values.

### Schema change — extend `food_entries` (reset DB, no migration of old rows)
Replace the single `estimated_kcal` with portion + per-100 g columns (all `real`, nullable):
```
portion_g                real   -- estimated/edited grams of the (visible) portion
kcal_per_100g            real
carbs_g_per_100g         real
sugar_g_per_100g         real
fat_g_per_100g           real
saturated_fat_g_per_100g real
protein_g_per_100g       real
fiber_g_per_100g         real
salt_g_per_100g          real
```
Keep: `id, userId, loggedAt, source, rawText, imagePath, dishName, ingredientsJson,
visionConfidence`. Drop `estimated_kcal` (superseded).

### ⚠️ Dropping `estimated_kcal` is compile-breaking — every consumer MUST be updated
`MealInterpretation.estimatedKcal` and the column are referenced in these files; all must be
updated in the same change (verified by grep):
- `lib/vision/index.ts` — `MealInterpretation`, `MEAL_SCHEMA`, parser → return per-100 g + `portion_g`.
- `lib/food/index.ts` — `createFoodPhotoEntry`/`createFoodTextEntry` persist new columns.
- `lib/insights/index.ts` — `sumKcalByDay`/`kcalPoints` rebuilt (see §5.1 + below).
- `app/food/page.tsx` — fully rewritten as the table (§5.3).
- **`app/page.tsx` (Dashboard "Recent food" kcal badge, ~line 53)** — render
  `absoluteNutrition(entry).kcal` (or drop the badge). *(Type error if missed.)*
- **`lib/telegram/dispatch.ts` (photo-logged reply, ~line 151 uses `interpretation.estimatedKcal`)** —
  derive kcal from `kcal_per_100g × portion_g/100` for the reply, or drop the kcal in the reply.
  *(Type error if missed.)*
- **`lib/insights/index.test.ts`** — the `sumKcalByDay` test must be replaced by the
  `absoluteNutrition` test (§Testing).
- **`scripts/seed-demo.ts` (~line 73 sets `estimatedKcal`)** — seed the new per-100 g +
  `portion_g` columns instead so the demo Food/Energy series still has data.

### Derived absolutes (pure helper)
`lib/nutrition/index.ts`:
```
NUTRIENTS = [kcal, carbs, sugar, fat, saturatedFat, protein, fiber, salt]  // keys + de label + unit
absoluteNutrition(entry) -> { kcal, carbs_g, ... }   // per100g * portion_g/100 (null if either null)
```
Used by the table, the summaries, and the Insights "Food/Energy" series. Rebuild
`lib/insights` so `kcalPoints` selects the new per-100 g + `portion_g` columns and sums
`absoluteNutrition(entry).kcal` per day. **Bucket by LOCAL day** (not the current UTC
`dayStartUtc`) so the "Heute" pill (local midnight, Phase A) is consistent with the Energy
lane — this also closes the Phase A "Heute" limitation.

---

## 5.2 Vision AI extension (per-100 g nutrition + portion)

Extend the `output_config.format` JSON schema in `lib/vision/index.ts` to return, in addition
to the existing `dish_name` (German, per Phase A), `ingredients`, `confidence`:
```
portion_g                 number|null   -- estimated grams of the visible portion
kcal_per_100g             number|null
carbs_g_per_100g          number|null
sugar_g_per_100g          number|null
fat_g_per_100g            number|null
saturated_fat_g_per_100g  number|null
protein_g_per_100g        number|null
fiber_g_per_100g          number|null
salt_g_per_100g           number|null
```
- System prompt updated to ask for per-100 g values + an estimated portion in grams.
- **Structured-outputs contract:** add all 9 new keys to BOTH `properties` AND `required`,
  with nullables expressed as `anyOf: [{type:...}, {type:'null'}]` (matching the existing
  `dish_name`/`estimated_kcal` pattern); keep `additionalProperties: false`. Omitting a key
  from `required`, or using a bare `number|null`, fails schema validation at runtime.
- `MealInterpretation` + `createFoodPhotoEntry` extended to persist these.
- `vision_usage` logging unchanged (still captures tokens/cost; now slightly larger output).
- **Text food entries** (`createFoodTextEntry`) get null nutrition for now (shown as "—").
  They can be populated later via Edit (which triggers a text estimate — see §5.4). A
  blanket "estimate text entries too" is out of scope for Phase B.

### New: text-based nutrition estimate (reused by Edit)
`lib/vision/text-estimate.ts` — `estimateNutritionFromText(dish: string): Promise<{ perCent..., portion_g, usage }>`:
a text-only `messages.create` with the **same nutrition schema** (no image). Returns per-100 g
values + a default portion, plus the usage object → logged to `vision_usage`
(`food_entry_id` set, `src_bytes`/`sent_bytes`/dimensions = 0 to denote a text call).

---

## 5.3 Nutrition page → table + summaries + pagination

Replace `app/food/page.tsx` (route stays `/food`) with a table view.

### Table
Columns (German headers): Zeit · Bild · Gericht · Portion (g) · Energie (kcal) ·
Kohlenhydrate (g) · Zucker (g) · Fett (g) · ges. Fettsäuren (g) · Eiweiß (g) ·
Ballaststoffe (g) · Salz (g) · Aktionen (edit/delete). Values are **absolute**
(`absoluteNutrition`), `—` when null.
- Responsive: wrap in `overflow-x-auto`; the first column(s) (Zeit/Gericht) sticky-left so
  the row stays identifiable while scrolling nutrients on mobile.
- `components/nutrition/NutritionTable.tsx` (client — needs row actions).

### Summary band (above the table)
`components/nutrition/NutritionSummary.tsx`: rows = **Heute (seit Mitternacht) · 24 Std ·
7 Tage · Monat (31 Tage)**, columns aligned to each nutrient = **sum** of absolutes over that
window. Computed **server-side** over the full window (independent of pagination).
- `lib/nutrition/summary.ts` — `summaryForUser(userId, periods)` runs the windowed sums.

### Pagination
- Server-side via `searchParams` `?page=N`; `pageSize` from cookie `hv_food_page_size`
  (default **25**, allowed **25/50/100/150**). A page-size selector writes the cookie and
  reloads. Newest-first. Page controls show total/“Seite x von y”.
- `lib/food/index.ts`: add `listFoodEntriesPaged(userId, { limit, offset })` + a count.
- Summaries are over windows, NOT the current page.

---

## 5.4 Edit / delete

### Server actions (`app/food/actions.ts`, `'use server'`, auth + ownership check)
- `deleteFoodEntry(id)` — verify the row belongs to `requireUser()`; delete the row and its
  image file (via the images lib); revalidate `/food`. Client shows a confirm dialog first.
- `updateFoodEntry(id, { dishName, portionG })`:
  - Verify ownership.
  - **Portion changed only** → update `portion_g`; absolutes recompute on read. No AI.
  - **Dish changed** → call `estimateNutritionFromText(dishName)` → overwrite the per-100 g
    columns + `dishName` (+ `portion_g` if the user didn't set one); persist. Log
    `vision_usage` for the text call. (Editing a previously text/empty entry's dish is how a
    user gets nutrition onto a text entry.)

### UI
- Each row: edit (✏️) and delete (🗑️). Edit opens an inline row form / small modal with
  **Gericht** (text) + **Portion (g)** (number). Save calls `updateFoodEntry`.
- Client components call the server actions (Next 16 pattern — wrap with `'use server'` as in
  the People page; mind the form-action typing fix used there).

---

## Components & boundaries (Phase B)
| Unit | Responsibility |
|---|---|
| `lib/db/schema.ts` | `food_entries` per-100 g + `portion_g` columns; migration 0003 (reset OK) |
| `lib/nutrition/index.ts` | `NUTRIENTS` defs + `absoluteNutrition(entry)` (pure, tested) |
| `lib/nutrition/summary.ts` | windowed per-nutrient sums per user |
| `lib/vision/index.ts` | photo schema returns per-100 g + portion (German dish name) |
| `lib/vision/text-estimate.ts` | text-only nutrition estimate (reused by Edit) |
| `lib/food/index.ts` | paged list + count; create* persist nutrition |
| `lib/insights/index.ts` | Energy series from `absoluteNutrition().kcal` |
| `app/food/page.tsx` | server: load page + summaries; render table |
| `components/nutrition/NutritionTable.tsx` | table + row edit/delete |
| `components/nutrition/NutritionSummary.tsx` | period × nutrient summary band |
| `app/food/actions.ts` | `deleteFoodEntry`, `updateFoodEntry` (auth + recalc) |

## Error handling / edge cases
- Null nutrient (text entry, or AI returned null) → "—"; excluded from sums.
- Edit with empty dish → reject (German validation message).
- Delete confirm required; missing image file → ignore (still delete row).
- AI text-estimate failure → keep the dish change, leave nutrients null, inform the user.
- Negative or zero portion → reject.
- Pagination out of range → clamp to last page.

## Testing
- `absoluteNutrition` (per-100 g × portion, null handling) — unit.
- `rangeBounds`/summary windows reuse Phase A `lib/time-range.ts`; test `summaryForUser`
  sums per window (incl. the local-midnight "today").
- Parser/AI text-estimate: a unit test asserting the schema-shaped result maps to columns
  (mock or small live check).
- Manual: photo logs full nutrition; table + summaries render German; pagination + size
  cookie; edit portion rescales; edit dish re-estimates + logs `vision_usage`; delete removes
  row + image.

## Out of scope (later)
- Auto-estimating nutrition for all text entries on creation.
- A food/nutrition database lookup (we use AI estimates).
- Goals/targets per nutrient; per-nutrient charts in Insights (Energy series is included).
