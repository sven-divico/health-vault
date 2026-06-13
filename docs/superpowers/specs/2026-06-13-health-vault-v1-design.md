# Health Vault v1 — Design Spec

Date: 2026-06-13
Status: Approved (design), pending implementation plan
Related: `vault/brainstorms/2026-06-13-v1-roadmap.md`

## 1. Goal

Deliver a coherent first working version of Health Vault built on the existing codebase
(Next.js 15 App Router, Tailwind, SQLite/Drizzle, Anthropic vision, Telegram bot). v1 must
contain: image upload, Telegram-based activity logging, web views of an activity graph and
uploaded images, new-user invitation/onboarding, a demo user with seed data, an
admin-style expandable left sidebar, and a visualization stack that supports time-series
zoom, multiple chart types, and multi-series correlation.

Most input/auth plumbing already exists; v1 is primarily: redesign the shell (sidebar),
upgrade visualization, make activity structured/graphable, add a media gallery, and add a
demo user + seed data.

## 2. Starting point (already working — do not rebuild)

- Telegram bot: `/start <invite>` binding, `/weight`, `/mood 1-5`, `/activity <text>`,
  plain text → food entry, photo → AI-identified meal, 2-digit web-login codes, `/help`.
- Auth: invite tokens (`/api/admin/invite`), 2-digit login challenge echoed to the bot,
  sessions (`lib/auth`).
- DB tables: `users`, `invite_tokens`, `login_challenges`, `sessions`, `food_entries`,
  `measurements` (kind = weight | mood | activity).
- Images: stored under `./data/`, served via `/api/images/[...path]`.
- Web pages: `/` dashboard, `/food`, `/measures` (Recharts), `/login`. Top-bar nav.

## 3. Scope of v1

### 3.1 App shell — left sidebar
- Replace the top nav in `app/layout.tsx` with a left sidebar: scrollable icon rail +
  labels; top-level sections expand to sub-sections; organized by **data domain**.
- Sections: **Dashboard · Activity · Nutrition · Body** (→ Weight / Mood / Measurements)
  **· Insights · Media · People** (admin) **· Settings**.
- New `components/Sidebar.tsx` (client component) driven by a declarative nav config
  `lib/nav.ts`: `Array<{ label, icon, href?, children?: NavItem[] }>`. Adding a feature =
  add a config entry; the shell does not change.
- Behaviour: collapsible groups persist open/closed state (localStorage); active route is
  highlighted; rail is independently scrollable from main content.
- v1 section status: Dashboard, Activity, Body (Weight/Mood/Measurements), Insights,
  Media, People are functional. **Nutrition** = the existing food log, **label-only**
  change in the nav; the route stays `/food` (no page/link renames) to keep v1 small.
  **Settings** = a thin stub page (placeholder content, present so the nav pattern is
  demonstrated).

### 3.2 Data model — make activity graphable
- Reuse the `measurements` table for `kind = 'activity'`:
  - store duration in the existing `value_numeric` column (minutes),
  - add one **nullable text** column **`category`** on `measurements` (e.g.
    run/walk/gym/yoga),
  - store the free-text remainder in `note`.
  - Activity rows stop using `value_text`. (`value_text` remains in the table for other
    potential uses but new activity writes leave it null.)
- **Migration:** one Drizzle migration adds the nullable `category` column, generated and
  applied with the existing `npm run db:generate` / `npm run db:migrate` scripts.
- **`recordActivity` signature change:** from `recordActivity(userId, description)` to
  `recordActivity(userId, { category, durationMin, note })` in `lib/measures/index.ts`.
  Callers updated: the `/activity` handler in `lib/telegram/dispatch.ts` (passes parsed
  fields), the demo seed script.
- **Existing/legacy activity rows** (which used `value_text`): left in place, no backfill
  (volume is tiny — single real user). Readers must therefore tolerate activity rows where
  `value_numeric`/`category` are null and only `value_text` is set:
  - `app/measures/page.tsx` (and any activity list) renders
    `note ?? value_text ?? '(activity)'` plus `category`/`durationMin` when present.
  - Numeric activity series simply exclude rows with null `value_numeric`.
  - Note: `note` (new regime) and `value_text` (legacy regime) are mutually exclusive for
    activity rows — a reader should never assume both are populated.
- Rationale: matches the agreed "light structure" decision. A dedicated `activities`
  table was considered and rejected as heavier than needed for v1.

### 3.3 Visualization
- Remove Recharts from dependencies and from `components/MoodSparkline.tsx` and
  `components/MeasureCharts.tsx`. Add **Apache ECharts**.
- New thin wrapper `components/charts/EChart.tsx` (client): accepts an ECharts `option`
  object, handles mount/resize/dispose. All charts build on it.
- Per-metric charts (Weight, Mood, Activity): single ECharts time-series with `dataZoom`
  (slider + scroll/drag zoom). Weight/Mood are numeric lines; Activity plots `durationMin`
  per session/day.
- **Insights page** (`/insights`):
  - A **series picker**: chips toggling available metrics (Weight, Mood, Activity minutes,
    Food kcal). Selected metrics drive the view.
  - **Default render: stacked & synced lanes** — one ECharts grid row per metric, all
    sharing a single x (time) axis and a single shared `dataZoom` so zoom/pan affects all
    lanes together. Correlation read by vertical alignment.
  - **Overlay toggle**: render selected metrics on one chart with multiple Y-axes (best for
    2 series). A control switches between Stacked and Overlay modes.
- Data for charts is fetched server-side from `measurements`/`food_entries` and passed to
  client chart components as plain `{ t:number, v:number }[]` series (one array per metric).

### 3.4 Media gallery
- New `/media` page: responsive grid of uploaded images, newest first. Source for v1 =
  `food_entries` rows with a non-null `imagePath`.
- Click a thumbnail → enlarged view. Field mapping (no new columns):
  - **name** = `dish_name` (fallback `raw_text`),
  - **caption** = `raw_text` (for photo entries, the Telegram caption is stored in
    `raw_text` by `createFoodPhotoEntry`),
  - **time** = `logged_at`.
- Images served via the existing `/api/images/[...path]` route (no new image API).

### 3.5 Demo user + seed data
- New script `scripts/seed-demo.ts` (run via an npm script, e.g. `db:seed-demo`):
  - Creates (or resets) a single, isolated **demo user** (fixed username, e.g. `demo`).
  - Generates ~90 days of near-daily `measurements`: weight, mood (1–5), activity
    (category + `durationMin`). Data is engineered to correlate: activity trends up →
    weight trends down → mood trends up, with realistic day-to-day noise.
  - Generates ~15–20 `food_entries`, of which a handful reference **bundled CC0 meal
    images** committed under `scripts/seed-assets/`. The script copies each into the image
    store using the same layout as `saveImage` — i.e. into `IMAGE_DIR/<demoUserId>/<name>`
    — and sets `imagePath = "<demoUserId>/<name>"` so the existing `/api/images/[...path]`
    route serves them unchanged.
  - **Idempotent / isolated**: the script resolves the demo user by its fixed username; if
    it cannot be uniquely resolved it aborts with a clear error. Re-running deletes and
    regenerates ONLY rows belonging to that demo user id (measurements + food_entries) and
    that user's image directory, never touching real users' data.
- **Demo access without Telegram**: a "View demo" entry point (a dedicated route / server
  action) mints an authenticated session **hard-bound to the demo user** — it takes no
  user id parameter and resolves the demo user solely by the fixed demo username, so it can
  never mint a session for a real user. The demo user has no Telegram binding, so bot input
  cannot target it; the web UI exposes no per-user data-mutation actions (only admin invite
  creation and demo login), so no additional write-blocking is implemented in v1. Real-user
  onboarding is unchanged.

### 3.6 Telegram — activity parsing
- Extend the `/activity` handler in `lib/telegram/dispatch.ts`: parse a leading category
  word and a duration token (e.g. `28min`, `28 min`, `28m`) from input like
  `/activity run 28min easy pace` → `{ category: 'run', durationMin: 28, note: 'easy pace' }`.
- If no duration is found, store the entry with `durationMin = null` and the full text in
  `note` (still logged, just not numerically graphable). Reply confirms what was parsed.
- This is a deliberately simple regex/keyword parser. The general AI parsing/normalization
  engine is explicitly out of scope (see Backlog).

### 3.7 Onboarding / invites — surface in UI
- Add a **People** admin page that lists users and lets an admin create an invite,
  replacing the curl-only flow.
- **Admin gate (minimal, new but small):** there is currently *no* web-side admin auth —
  `ADMIN_SECRET` is only checked as the `x-admin-secret` header on `/api/admin/invite`.
  v1 adds a minimal gate:
  - The People page shows an **admin-secret entry form** when no admin cookie is present.
  - Submitting calls a **server action** that constant-time-compares the value to
    `ADMIN_SECRET`; on success it sets an httpOnly `admin` cookie (signed/derived from the
    secret, not the raw secret).
  - While the cookie is valid, the page renders the user list and an invite-create action;
    that action re-validates the cookie server-side and calls the existing `createInvite`
    (or POSTs the existing endpoint with the header). If `ADMIN_SECRET` is unset, the page
    shows "admin disabled" (mirroring the endpoint's 503).
- The Telegram binding + 2-digit web-login flow is unchanged.

## 4. Out of scope (Backlog / later phases)

- **Phase 2:** AI input-parsing & normalization engine (convert free-form input to
  structured numeric data across activity/food/measures); richer activity fields
  (distance, intensity, calories); goals/targets.
- **Phase 3:** additional domains & metrics; reminders/nudges; chart annotations;
  export/backup UI.

These are recorded so v1 stays focused; none are implemented in v1.

## 5. Components & boundaries

| Unit | Responsibility | Depends on |
|---|---|---|
| `lib/nav.ts` | Declarative nav config (sections → children) | — |
| `components/Sidebar.tsx` | Render sidebar from nav config; expand/collapse; active state | `lib/nav.ts`, route |
| `app/layout.tsx` | App frame: sidebar + scrollable main | `Sidebar` |
| `components/charts/EChart.tsx` | Generic ECharts mount/resize/dispose wrapper | echarts |
| `components/charts/*` | Per-use chart builders (weight, mood, activity, insights) | `EChart` |
| `app/insights/page.tsx` + client | Series picker + stacked/overlay modes + shared zoom | chart components, measures/food libs |
| `app/media/page.tsx` | Image grid + enlarge view | food lib, `/api/images` |
| `lib/measures` | Activity now carries `category` + `durationMin`; read/write | db schema |
| `scripts/seed-demo.ts` | Create/reset demo user + correlated seed data + images | db, seed-assets |
| demo session route/action | Mint demo-user session (no mutation surface) | `lib/auth` |
| `app/(admin)/people` | List users, create invites via existing endpoint | `/api/admin/invite` |

Each unit is independently understandable: the sidebar is config-driven and unaware of
chart internals; chart components consume plain series arrays and are unaware of the DB;
the seed script writes only demo-user rows.

## 6. Error handling & edge cases

- **Activity with no parseable duration:** stored with `durationMin = null`, full text in
  `note`; excluded from numeric activity series but shown in lists. Bot reply states this.
- **Insights with no series selected / empty metric:** show an empty-state message rather
  than a broken chart; a metric with zero points renders an empty lane, not an error.
- **Media with no images:** empty-state message.
- **Seed re-run safety:** seed deletes only rows for the demo user id; aborts with a clear
  error if the demo user cannot be uniquely identified. Bundled images copied idempotently.
- **Demo session is read-only-ish:** demo user can view everything; it is acceptable for
  demo input to be inert or absent in v1 (no Telegram binding for demo).
- **ECharts SSR:** chart components are client-only (`'use client'`), receiving
  server-fetched data as props; no ECharts code runs during SSR.
- **Recharts removal:** confirm no remaining imports before dropping the dependency.

## 7. Testing strategy

- **Parser unit tests:** `/activity` parsing across representative inputs (category +
  duration variants, missing duration, junk) → expected `{category, durationMin, note}`.
- **Seed script check:** running the seed produces the expected counts and a non-empty,
  correlated dataset for the demo user; a second run leaves real users untouched and does
  not duplicate demo rows.
- **Nav config render:** sidebar renders all configured sections and marks the active route.
- **Manual/visual verification:** Insights stacked + overlay modes render with the demo
  data and the shared `dataZoom` zooms all lanes; Media grid shows seeded images.
- **Test runner:** the repo currently has none. Use Node's built-in `node:test` executed
  via the already-present `tsx` devDependency (add an npm `test` script, e.g.
  `tsx --test`), avoiding a new heavy dependency. Parser unit tests are required; the seed
  check may be a script-level assertion.

## 8. Roadmap

- **Phase 1 — v1 MVP (this spec):** sidebar shell · ECharts + Insights · structured
  activity · Media gallery · demo + seed · activity parsing · invite UI.
- **Phase 2:** AI parsing/normalization engine · richer activity · goals/targets.
- **Phase 3:** more domains & metrics · reminders · chart annotations · export/backup UI.
