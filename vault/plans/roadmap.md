# Health Vault Roadmap

## Phase 1 — v1 MVP ✅ COMPLETE (2026-06-13)
Branch `feature/v1-design-and-vault`. Spec:
`docs/superpowers/specs/2026-06-13-health-vault-v1-design.md`. Plan:
`docs/superpowers/plans/2026-06-13-health-vault-v1.md`.

Delivered: domain sidebar shell · ECharts visualization · Insights correlation view
(stacked + overlay, shared zoom) · structured activity logging · media gallery ·
demo user + correlated seed data · one-click demo login · People admin gate.

## Phase A — German + time windows + Insights fix (designed, awaiting build)
Spec: `docs/superpowers/specs/2026-06-13-phase-a-german-timewindows-design.md`.
Full German (UI + bot + AI dish names) · reusable time-window pills (Today=local midnight,
24h, 7d, Month, All) on Measures+Insights with cookie memory · fix sparse single-point
series rendering invisibly (`showSymbol` adaptive) + default-select Food. No schema change.
**Implement first.**

## Phase B — Nutrition tracking (designed, awaiting build)
Spec: `docs/superpowers/specs/2026-06-13-phase-b-nutrition-design.md`. Depends on Phase A.
EU Big-7 + fiber stored per-100 g + portion (DB reset OK) · vision AI returns nutrition ·
Nutrition page → table + period summaries + pagination (cookie) · edit/delete with
recalculation (portion = scale, dish = AI re-estimate). Both specs spec-reviewed.

## Phase 2 — next
- **Smart input parsing/normalization engine** — convert free-form Telegram input into
  structured numeric data across activity/food/measures (AI-assisted; the v1 activity
  parser is the seed of this).
- **Richer activity** — distance, intensity, calories (extend the activity model).
- **Goals / targets** — per-metric goals with progress on charts.

## Phase 3 — later
- More domains & metrics (sleep, hydration, etc. — each becomes a new sidebar section).
- Reminders / nudges.
- Chart annotations.
- Export / backup UI.

## Tech debt / follow-ups (from v1)
- **Local-dev env**: `.env.local` uses Docker-absolute `/data` paths; add a committed
  `.env.development` with local paths (or document overrides) so `next dev` + scripts agree.
  See actions-log 2026-06-13.
- Sidebar: hide the **People** link when `ADMIN_SECRET` is unset (currently always shown,
  page shows "Admin disabled").
- Sidebar open/closed **localStorage persistence** (deferred in v1; defaults to open).
- Body sub-nav `#weight`/`#mood` anchors are no-ops (no matching ids on `/measures`).
- Surface created invite token in the People UI (needs `useActionState` client wiring).
- Insights: consider per-day aggregation for activity to match kcal granularity.
