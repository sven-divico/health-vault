# Actions Log

Append-only. Newest entries at the top.

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
