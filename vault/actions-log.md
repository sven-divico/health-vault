# Actions Log

Append-only. Newest entries at the top.

---

## 2026-06-13 — Responsive mobile nav + permanent permission fix (deployed)

**Action:** Implemented responsive navigation and made the data-dir permission fix
permanent; deployed to prod.

**Changes:**
- `components/AppShell.tsx` (new) — off-canvas drawer pattern: persistent sidebar on `md+`,
  hamburger-toggled drawer on phones (backdrop, Escape, scroll-lock, close-on-navigate,
  aria labels). `Sidebar` refactored to fill the drawer + mobile close button;
  `layout.tsx` renders `<AppShell>`.
- `setup-server.sh` — now `chown -R 1001:1001 data` so a fresh server setup can't repeat
  the empty-DB permission issue.

**Verified:** built; visually checked at 375px (drawer) and desktop (persistent sidebar) via
preview; deployed via `./deploy-to-prod.sh`; prod `/login` 200 with hamburger markup present
(responsive UI live); container healthy; DB persisted; `measurements.category` intact;
webhook + bot (@eat_0042_bot) intact.

**Note:** invite `EmYbRxYc8apaWOUh` now shows **consumed = true** → user successfully bound
their Telegram account via `/start`. (Invites are one-time; a new one is needed only to bind
another account.)

---

## 2026-06-13 — Production bot switched to @eat_0042_bot

**Action:** User recreated the bot as **@eat_0042_bot** ("Food and Health Treacker",
id 8069565772 — the token already present in local `.env.local`). Updated production:
- Backed up + swapped `TELEGRAM_BOT_TOKEN` in server `.env`.
- `docker compose up -d --force-recreate` to apply the new env.
- Re-registered the webhook for the new bot (0 errors, 0 pending).
- Confirmed `getMe` → `eat_0042_bot`; invite `EmYbRxYc8apaWOUh` still unconsumed.

No code/README changes needed (bot username isn't hardcoded). Local `.env.local` already
held this token, so local dev is consistent. The previous bot (@sven_health_vault_bot)
is now unused.

---

## 2026-06-13 — v1 deployed to production

**Action:** Deployed v1 to https://health-vault.biztechbridge.com via `./deploy-to-prod.sh`
(rsync → `docker compose up --build -d`). Registered Telegram webhook; created first invite.

**Verified:** image rebuilt & container running; app created a fresh DB with the correct
schema (`measurements.category` present, `__drizzle_migrations` recorded → clean migrate,
no skip); webhook set (no errors); public `/login` → 200; bot = **@eat_0042_bot**
(initially deployed against @sven_health_vault_bot; switched — see entry above).

**Login "bug" (local) was environmental, not code:** dev server had been started before
`.env.development.local` existed, so `/api/auth/demo` 500'd on the `/data` path. Buttons
hydrate and fire correctly (verified in-browser). Fix = restart dev server.

### ⚠️ Prod deployment gotcha (FIXED manually, needs permanent fix)
The container runs as **uid 1001 (nextjs)** but the bind-mounted `./data` was owned by
`btbadmin` (775) → uid 1001 had no write permission → the app could NOT create
`/data/vault.sqlite` (data dir had been empty for 2 weeks, unnoticed due to no traffic).
**Fixed by:** `sudo chown -R 1001:1001 /home/btbadmin/health-vault/data`. Persists across
deploys (rsync excludes `data`). **Follow-up:** make permanent — either `setup-server.sh`
should `chown 1001:1001 data`, or add a root entrypoint that chowns `/data` then drops to
nextjs. Otherwise a fresh server setup repeats this.

**Next:** user to test Telegram flow (/start invite → log data → web login via 2-digit code).

---

## 2026-06-13 — v1 Chunks 4 & 5 + end-to-end smoke test (v1 COMPLETE)

**Action:** Implemented Chunk 4 (media) + Chunk 5 (demo/seed/admin) via subagent-driven
development, then ran a full end-to-end smoke test. Final holistic review: **ready to merge.**

**Shipped:**
- Media gallery (`/media`) — grid + enlarge, from `food_entries` images.
- `createAuthenticatedSession` (TDD); demo seed script (idempotent, correlated 90-day data,
  cycles 4 CC0 placeholder meal images); one-click "View demo" login bound to the demo user;
  People admin page with a minimal admin gate (HMAC-derived cookie, constant-time compare).

**Bugs caught & fixed during build/review/smoke:**
- Seed images all used meal-1 (counter bug) → cycle through all 4.
- **Runtime-only bug the smoke test caught:** inline `<form action>` wrappers in the People
  Server Component needed a `'use server'` directive — build+tsc passed but the page 500'd
  until fixed. Lesson: build/tsc ≠ runtime for RSC/server-action boundaries.

**Smoke test result (dev server, demo login):** all routes 200 (/, /measures, /insights,
/media, /food, /people, /settings), images serve (image/jpeg), unauth → 307 redirect,
structured activity categories + charts + correlation chips all render with seeded data.

**Tests:** 11/11 passing. `npm run build` succeeds.

### ⚠️ Local-dev setup gotcha (discovered)
`.env.local` sets `DATABASE_URL=file:/data/vault.sqlite` and `IMAGE_DIR=/data/images`
(absolute — for the Docker container). Two consequences locally:
1. `next dev` reads `.env.local` → tries `/data` → ENOENT. Run dev with overrides:
   `DATABASE_URL=file:./data/vault.sqlite IMAGE_DIR=./data/images npm run dev`.
2. Standalone scripts (`migrate.ts`, `seed-demo.ts`) load `.env` (dotenv default), NOT
   `.env.local` — so they already use the local `./data` default. This means dev server
   and scripts can disagree about the DB location unless dev is given matching overrides.
**Follow-up candidate:** add a committed `.env.development` (local paths) or document this,
so local dev "just works" without manual overrides.

**Next:** finish/merge the branch.

---

## 2026-06-13 — v1 Chunk 3 implemented (visualization + Insights)

**Action:** Executed Chunk 3 via subagent-driven development (implement + spec/quality
review per task). Branch `feature/v1-design-and-vault`. **Build is green again.**

**Shipped:**
- `components/charts/EChart.tsx` — generic ECharts wrapper (init/resize/dispose).
- Rebuilt `MeasureCharts` + `MoodSparkline` on ECharts with `dataZoom` (cleared the
  recharts build errors). Prop shapes unchanged → callers untouched.
- `lib/insights/index.ts` — metric defs + series builders incl. pure `sumKcalByDay`
  (per-UTC-day kcal aggregation). 1 test.
- `app/insights/page.tsx` + `components/insights/InsightsView.tsx` — the correlation view:
  chip series-picker, **stacked-&-synced** lanes (one shared `dataZoom` across all lanes,
  `axisPointer.link`), and an **overlay** (multi-Y-axis) toggle.

**Tests:** 10/10 passing. `npm run build` succeeds; `/insights` route live.
**Next:** Chunk 4 — media gallery.

---

## 2026-06-13 — v1 Chunk 2 implemented (app shell / sidebar)

**Action:** Executed Chunk 2 via subagent-driven development (implement + spec/quality
review). Branch `feature/v1-design-and-vault`.

**Shipped:**
- `lib/nav.ts` — declarative nav config (8 domain sections, Body group with sub-items).
- `components/Sidebar.tsx` — recursive, config-driven left sidebar (collapsible groups,
  active-route highlight, scrollable icon rail).
- `app/layout.tsx` — replaced top-nav bar with sidebar + scrollable main.
- `app/settings/page.tsx` + `app/people/page.tsx` stubs (People replaced in Chunk 5).

**Note:** localStorage open/closed persistence intentionally deferred. Build still fails
only on the known recharts imports in the two chart components → fixed in Chunk 3.
**Next:** Chunk 3 — ECharts visualization + Insights correlation view.

---

## 2026-06-13 — v1 Chunk 1 implemented (data foundations)

**Action:** Executed Chunk 1 of the v1 plan via subagent-driven development (implementer +
spec/quality review per task). Branch `feature/v1-design-and-vault`.

**Shipped:**
- Replaced Recharts with Apache ECharts (`echarts@5.6.0`); added `npm test` (`tsx --test`).
- Added nullable `category` column to `measurements` (migration `0001_lazy_solo`).
- DB client supports in-memory SQLite (`DATABASE_URL=file::memory:`) for tests.
- Activity parser `lib/measures/activity-parse.ts` (`parseActivity`) — 8 tests.
- `recordActivity` now structured `{category, durationMin, note}`; wired into bot `/activity`
  + `/help`; measures page renders new + legacy activity rows.
- **Fixes found in review:** added missing `dotenv` devDependency (broke `db:migrate`);
  fixed parser bug where bare `m` misread metre distances as minutes.

**Tests:** 9/9 passing (8 parser + 1 recordActivity).
**Next:** Chunk 2 — app shell (sidebar).

---

## 2026-06-13 — v1 brainstorm complete, spec written

**Action:** Ran the brainstorming workflow (with browser companion) for v1. Reached
decisions on all open questions, wrote and review-approved the v1 design spec.

**Decisions:** sidebar IA by data domain · activity = light structure
(category + durationMin) · Apache ECharts (remove Recharts) · Insights stacked-&-synced
default + overlay toggle · rich correlated demo seed data. Backlog: AI input-parsing engine.

**Artifacts:** `vault/brainstorms/2026-06-13-v1-roadmap.md`,
`docs/superpowers/specs/2026-06-13-health-vault-v1-design.md`. Spec passed
spec-document-reviewer on 2nd pass (2 codebase contradictions fixed: activity storage
signature/migration, People-page admin gate).

**Next:** implementation plan (writing-plans) → code.

---

## 2026-06-13 — Project review + vault setup

**Action:** Created `vault/` structure. Reviewed current state of the codebase before planning v1.

**State of the project (as found):**
- **Stack:** Next.js 15 (App Router) + Tailwind + Recharts; SQLite via Drizzle; Anthropic vision for meal photos. Deployed as a single Docker container behind host Caddy.
- **Telegram bot (working):** `/start <token>` binding, `/weight`, `/mood 1-5`, `/activity <free text>`, plain text → food entry, photo → vision-identified food, 2-digit web-login codes, `/help`.
- **Auth (working):** invite tokens (`/api/admin/invite`), login challenge via 2-digit code echoed to the bot, sessions.
- **DB tables:** `users`, `invite_tokens`, `login_challenges`, `sessions`, `food_entries`, `measurements` (kind = weight | mood | activity).
- **Web pages:** `/` dashboard, `/food` log, `/measures` (basic Recharts line charts for weight & mood), `/login`. Navigation is a simple **top bar**, not a sidebar.
- **Images:** stored under `./data/`, served via `/api/images/[...path]`.

**Gaps vs. v1 mission goals:**
1. No **demo user + seed data** for visualization testing.
2. Visualization is basic — **no time-series zoom**, no **multi-series correlation overlay**, only line charts.
3. Navigation is a top bar, not the desired **left scrollable icon sidebar with expandable sections → subsections**.
4. Activity is stored as free text only (`value_text`) — limits graphing of activity as a series.

**Next:** Brainstorm v1 scope + feature roadmap (see `brainstorms/2026-06-13-v1-roadmap.md`).
