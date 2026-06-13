# Health Vault v1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a coherent first version of Health Vault: a domain-organized expandable left sidebar, an ECharts-based visualization stack with a zoomable multi-series correlation view, structured (graphable) activity logging, a media gallery, and a demo user with correlated seed data.

**Architecture:** Build on the existing Next.js 16 (App Router) + Tailwind + SQLite/Drizzle + Telegram codebase. Replace Recharts with Apache ECharts behind a thin client wrapper. Make activity numeric by adding a `category` column to `measurements` and parsing duration in the bot. Drive the sidebar from a declarative nav config so features expand without shell changes. Add an idempotent seed script and a demo-only login.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, Drizzle ORM, better-sqlite3, Apache ECharts, `node:test` via `tsx`. (Async `cookies()` and server actions per Next 16.)

**Spec:** `docs/superpowers/specs/2026-06-13-health-vault-v1-design.md`

**Branch:** continue on `feature/v1-design-and-vault` (already created).

---

## Conventions for the implementer
- This repo has **no test runner yet**. We use Node's built-in test runner via `tsx`. Run a test file with: `npx tsx --test <path-to-file>`.
- Pure logic (parsers, series builders, isolation/resolve helpers) is built **test-first**. UI/chart components are verified by `npm run build` + manual visual check (noted per task).
- After a schema change, regenerate + apply migrations: `npm run db:generate` then `npm run db:migrate`.
- Commit after every task. Keep commits small.

---

## Chunk 1: Data foundations (deps, schema, activity model)

### Task 1: Swap charting dependency and add a test script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove Recharts, add ECharts**

Run:
```bash
npm uninstall recharts
npm install echarts@^5.5.0
```

- [ ] **Step 2: Add a `test` script**

In `package.json` `"scripts"`, add:
```json
"test": "tsx --test"
```

- [ ] **Step 3: Verify install**

Run: `npm ls echarts` → Expected: shows `echarts@5.x`. Run `npm ls recharts` → Expected: `(empty)` / not found.
Note: the app will not build yet because `MoodSparkline`/`MeasureCharts` still import recharts — that is fixed in Chunk 3. Do not run `npm run build` here.

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: replace recharts with echarts, add test script"
```

---

### Task 2: Add `category` column to `measurements`

**Files:**
- Modify: `lib/db/schema.ts:67-81`
- Generated: `drizzle/*.sql` (via db:generate)

- [ ] **Step 1: Add the column to the schema**

In `lib/db/schema.ts`, inside the `measurements` table definition, add a nullable `category` column after `kind`:
```ts
    kind: text('kind', { enum: ['weight', 'mood', 'activity'] }).notNull(),
    category: text('category'),
    valueNumeric: real('value_numeric'),
```

- [ ] **Step 2: Generate the migration**

Run: `npm run db:generate`
Expected: a new file under `drizzle/` containing `ALTER TABLE \`measurements\` ADD \`category\` text;`

- [ ] **Step 3: Apply the migration**

Run: `npm run db:migrate`
Expected: prints `migrations applied` with no error.

- [ ] **Step 4: Commit**
```bash
git add lib/db/schema.ts drizzle/
git commit -m "feat: add category column to measurements for structured activity"
```

---

### Task 2b: Make the DB client support an in-memory database for tests

The unit tests need an isolated DB. The current `dbPath()` strips the `file:` prefix and `resolve()`s the rest, so `DATABASE_URL=file::memory:` would resolve to a real on-disk file literally named `:memory:` (not better-sqlite3's in-memory mode), breaking test isolation. This task makes `:memory:` pass through unmodified. All later test tasks depend on it.

**Files:**
- Modify: `lib/db/client.ts:8-12` (`dbPath`)

- [ ] **Step 1: Special-case the in-memory path**

Replace `dbPath()`:
```ts
function dbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./data/vault.sqlite';
  const path = url.startsWith('file:') ? url.slice('file:'.length) : url;
  if (path === ':memory:' || path === '') return ':memory:';
  return resolve(path);
}
```
This leaves production behavior unchanged (a `file:./…` URL still resolves to disk) but makes `DATABASE_URL=file::memory:` (or `:memory:`) use better-sqlite3's in-memory DB. The existing `migrate()` call then builds all tables in memory; `mkdirSync(dirname(':memory:'))` is a harmless no-op on `.`.

Note on isolation: `node:test` runs each test **file** in its own process, and `db()` memoizes one connection per process, so each test file gets a fresh in-memory DB shared across that file's tests. Tests within a file must insert their own fixtures and avoid colliding on unique columns.

- [ ] **Step 2: Verify production path is unchanged**

Run: `npx tsc --noEmit` (scope: `lib/db/client.ts` clean).
Expected: no errors. (Behavioral check happens via the tests in Task 3+.)

- [ ] **Step 3: Commit**
```bash
git add lib/db/client.ts
git commit -m "feat: support in-memory sqlite for tests"
```

---

### Task 3: Activity input parser (TDD)

**Files:**
- Create: `lib/measures/activity-parse.ts`
- Test: `lib/measures/activity-parse.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseActivity } from './activity-parse';

test('parses category + minutes + note', () => {
  assert.deepEqual(parseActivity('run 28min easy pace'),
    { category: 'run', durationMin: 28, note: 'easy pace' });
});
test('parses hours to minutes', () => {
  assert.deepEqual(parseActivity('gym 1h'), { category: 'gym', durationMin: 60, note: null });
});
test('ignores non-duration tokens (km) but keeps them as note', () => {
  assert.deepEqual(parseActivity('ran 5km 28min'),
    { category: 'ran', durationMin: 28, note: '5km' });
});
test('category only, no duration', () => {
  assert.deepEqual(parseActivity('yoga'), { category: 'yoga', durationMin: null, note: null });
});
test('duration only, no category', () => {
  assert.deepEqual(parseActivity('45 minutes'), { category: null, durationMin: 45, note: null });
});
test('empty input', () => {
  assert.deepEqual(parseActivity('   '), { category: null, durationMin: null, note: null });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test lib/measures/activity-parse.test.ts`
Expected: FAIL — cannot find module `./activity-parse`.

- [ ] **Step 3: Write the implementation**
```ts
export interface ParsedActivity {
  category: string | null;
  durationMin: number | null;
  note: string | null;
}

const DURATION_RE = /(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/i;

export function parseActivity(input: string): ParsedActivity {
  const text = input.trim();
  if (!text) return { category: null, durationMin: null, note: null };

  let durationMin: number | null = null;
  let working = text;

  const dm = working.match(DURATION_RE);
  if (dm && dm.index != null) {
    const value = parseFloat(dm[1].replace(',', '.'));
    const isHour = dm[2].toLowerCase().startsWith('h');
    durationMin = Math.round(isHour ? value * 60 : value);
    working = (working.slice(0, dm.index) + working.slice(dm.index + dm[0].length)).trim();
  }

  let category: string | null = null;
  const words = working.split(/\s+/).filter(Boolean);
  if (words.length && /^[a-zA-Z]+$/.test(words[0])) {
    category = words[0].toLowerCase();
    words.shift();
  }
  const note = words.join(' ').trim() || null;
  return { category, durationMin, note };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test lib/measures/activity-parse.test.ts`
Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Commit**
```bash
git add lib/measures/activity-parse.ts lib/measures/activity-parse.test.ts
git commit -m "feat: add activity input parser with tests"
```

---

### Task 4: Update `recordActivity` and wire parser into the bot

**Files:**
- Modify: `lib/measures/index.ts:19-23`
- Modify: `lib/telegram/dispatch.ts:84-93` (the `/activity` branch) and `:95-109` (`/help`)
- Modify: `app/measures/page.tsx:11,24-31` (activity rendering)
- Test: `lib/measures/index.test.ts`

- [ ] **Step 1: Write a failing test for the new `recordActivity` shape**

`lib/measures/index.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'file::memory:';   // in-memory DB (see Task 2b)
const { recordActivity } = await import('./index');
const { db } = await import('@/lib/db/client');
const { users } = await import('@/lib/db/schema');

test('recordActivity stores category, durationMin, note', () => {
  // FK enforcement is ON, so insert a real user first and use its id.
  const u = db().insert(users).values({ username: 'act-test', createdAt: new Date() }).returning().get();
  const row = recordActivity(u.id, { category: 'run', durationMin: 28, note: '5km' });
  assert.equal(row.kind, 'activity');
  assert.equal(row.category, 'run');
  assert.equal(row.valueNumeric, 28);
  assert.equal(row.note, '5km');
});
```
> This depends on Task 2b (in-memory DB) and inserts a user to satisfy the `foreign_keys = ON` constraint. The `@/` alias resolves under `tsx --test` (tsx honors tsconfig `paths`).

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test lib/measures/index.test.ts`
Expected: FAIL — `recordActivity` signature mismatch / `category` undefined.

- [ ] **Step 3: Update `recordActivity`**

In `lib/measures/index.ts`, replace the existing `recordActivity`:
```ts
export interface RecordActivityInput {
  category: string | null;
  durationMin: number | null;
  note: string | null;
}

export function recordActivity(userId: number, input: RecordActivityInput) {
  return db().insert(measurements).values({
    userId,
    loggedAt: new Date(),
    kind: 'activity',
    category: input.category,
    valueNumeric: input.durationMin,
    note: input.note,
  }).returning().get();
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test lib/measures/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the parser into the bot**

In `lib/telegram/dispatch.ts`, add the import at top:
```ts
import { parseActivity } from '@/lib/measures/activity-parse';
```
Replace the `/activity` branch body:
```ts
  if (text.startsWith('/activity')) {
    const rest = text.slice('/activity'.length).trim();
    if (!rest) {
      await sendMessage(chatId, 'Usage: /activity run 28min [optional note]');
      return;
    }
    const parsed = parseActivity(rest);
    recordActivity(user.id, parsed);
    const label = parsed.category ?? 'activity';
    const dur = parsed.durationMin != null ? ` · ${parsed.durationMin} min` : '';
    const hint = parsed.durationMin == null ? ' (no duration parsed — not graphable)' : '';
    await sendMessage(chatId, `✓ activity logged: <b>${escapeHtml(label)}</b>${dur}${hint}`);
    return;
  }
```
Update the `/help` activity line to: `'/activity run 28min [note] — log activity (duration is graphed)',`.

- [ ] **Step 6: Update the measures page activity rendering**

In `app/measures/page.tsx`, change the activity `<li>` to tolerate the new + legacy shapes:
```tsx
          {activity.map((a) => (
            <li key={a.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <span className="mr-2 text-xs text-neutral-500">{new Date(a.loggedAt).toLocaleString()}</span>
              <span className="font-medium">{a.category ?? 'activity'}</span>
              {a.valueNumeric != null && <span className="text-neutral-500"> · {a.valueNumeric} min</span>}
              {(a.note ?? a.valueText) && <span className="text-neutral-500"> · {a.note ?? a.valueText}</span>}
            </li>
          ))}
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to these files. (Chart files may still error if Chunk 3 not done — scope your check: these four files must be clean.)

- [ ] **Step 8: Commit**
```bash
git add lib/measures/index.ts lib/measures/index.test.ts lib/telegram/dispatch.ts app/measures/page.tsx
git commit -m "feat: structured activity logging via bot parser"
```

---

## Chunk 2: App shell (left sidebar)

### Task 5: Declarative nav config

**Files:**
- Create: `lib/nav.ts`

- [ ] **Step 1: Create the config**
```ts
export interface NavItem {
  label: string;
  icon: string;       // short emoji/glyph placeholder for v1
  href?: string;      // leaf links
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { label: 'Dashboard', icon: '🏠', href: '/' },
  { label: 'Activity', icon: '🏃', href: '/measures' }, // activity lives under measures for v1
  { label: 'Nutrition', icon: '🍽️', href: '/food' },
  {
    label: 'Body', icon: '⚖️', children: [
      { label: 'Weight', icon: '•', href: '/measures#weight' },
      { label: 'Mood', icon: '•', href: '/measures#mood' },
      { label: 'Measurements', icon: '•', href: '/measures' },
    ],
  },
  { label: 'Insights', icon: '📈', href: '/insights' },
  { label: 'Media', icon: '🖼️', href: '/media' },
  { label: 'People', icon: '👥', href: '/people' },
  { label: 'Settings', icon: '⚙️', href: '/settings' },
];
```
> Note: Body sub-items point at `/measures` anchors for v1 (single measures page). This keeps v1 small while demonstrating the expandable pattern. Refine routes in a later phase.

- [ ] **Step 2: Commit**
```bash
git add lib/nav.ts
git commit -m "feat: declarative sidebar nav config"
```

---

### Task 6: Sidebar component

**Files:**
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Implement the sidebar (client component)**
```tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type NavItem } from '@/lib/nav';

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col overflow-y-auto border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="px-4 py-4 font-semibold">🩺 Health Vault</div>
      <nav className="flex-1 px-2 pb-6 text-sm">
        {NAV.map((item) => <NavNode key={item.label} item={item} />)}
      </nav>
    </aside>
  );
}

function NavNode({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const active = item.href && (item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href.split('#')[0])));

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
        >
          <span className="w-5 text-center">{item.icon}</span>
          <span>{item.label}</span>
          <span className="ml-auto text-xs opacity-50">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-800">
            {item.children.map((c) => <NavNode key={c.label} item={c} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href ?? '#'}
      className={`flex items-center gap-2 rounded px-2 py-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 ${active ? 'bg-neutral-200 font-medium dark:bg-neutral-800' : ''}`}
    >
      <span className="w-5 text-center">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}
```
> Open/closed state defaults to open in v1. (Spec mentions localStorage persistence; if time allows, persist `open` per-label in localStorage. Acceptable to defer the persistence detail to a follow-up — note it but do not block.)

- [ ] **Step 2: Commit**
```bash
git add components/Sidebar.tsx
git commit -m "feat: sidebar component driven by nav config"
```

---

### Task 7: Integrate sidebar into layout + Settings stub

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/settings/page.tsx`
- Create: `app/people/page.tsx` (temporary stub; replaced in Task 16)

- [ ] **Step 1: Replace the top-nav layout with a sidebar layout**

Rewrite `app/layout.tsx` body:
```tsx
import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Health Vault',
  description: 'Personal health tracking vault',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="h-screen flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Create the Settings stub**

`app/settings/page.tsx`:
```tsx
export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-neutral-500">Settings will live here. (Placeholder for v1.)</p>
    </div>
  );
}
```

- [ ] **Step 3: Create a temporary People stub** (replaced in Task 16 so the nav link resolves now)

`app/people/page.tsx`:
```tsx
export default function PeoplePage() {
  return <div className="text-sm text-neutral-500">People admin — coming in this release.</div>;
}
```

- [ ] **Step 4: Build to verify the shell compiles**

Run: `npm run build`
Expected: build succeeds **only if Chunk 3 chart files are already migrated**. If not yet done, instead run `npx tsc --noEmit` and confirm `layout.tsx`, `Sidebar.tsx`, `settings`, `people` have no type errors. Full `npm run build` is validated at the end of Chunk 3.

- [ ] **Step 5: Commit**
```bash
git add app/layout.tsx app/settings/page.tsx app/people/page.tsx
git commit -m "feat: left sidebar shell with settings/people stubs"
```

---

## Chunk 3: Visualization (ECharts) + Insights

### Task 8: Generic ECharts wrapper

**Files:**
- Create: `components/charts/EChart.tsx`

- [ ] **Step 1: Implement the wrapper**
```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export function EChart({ option, className }: { option: echarts.EChartsOption; className?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current);
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => { ro.disconnect(); chart.dispose(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={elRef} className={className ?? 'h-64 w-full'} />;
}
```

- [ ] **Step 2: Commit**
```bash
git add components/charts/EChart.tsx
git commit -m "feat: generic echarts wrapper component"
```

---

### Task 9: Rebuild MeasureCharts + MoodSparkline on ECharts

**Files:**
- Modify (rewrite): `components/MeasureCharts.tsx`
- Modify (rewrite): `components/MoodSparkline.tsx`

- [ ] **Step 1: Rewrite `MeasureCharts.tsx`** (single-metric zoomable charts)
```tsx
'use client';
import type { EChartsOption } from 'echarts';
import { EChart } from './charts/EChart';

interface Series { t: number; v: number }

function lineOption(name: string, data: Series[], min?: number, max?: number): EChartsOption {
  return {
    grid: { top: 24, right: 16, bottom: 48, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name, min: min ?? 'dataMin', max: max ?? 'dataMax', scale: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }],
    series: [{ type: 'line', name, showSymbol: false, data: data.map((d) => [d.t, d.v]) }],
  };
}

export function MeasureCharts({ weight, mood }: { weight: Series[]; mood: Series[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Weight (kg)" data={weight} />
      <ChartCard title="Mood (1-5)" data={mood} min={1} max={5} />
    </div>
  );
}

function ChartCard({ title, data, min, max }: { title: string; data: Series[]; min?: number; max?: number }) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {data.length === 0
        ? <div className="flex h-64 items-center justify-center text-sm text-neutral-500">No data yet.</div>
        : <EChart option={lineOption(title, data, min, max)} className="h-64 w-full" />}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `MoodSparkline.tsx`**
```tsx
'use client';
import type { EChartsOption } from 'echarts';
import { EChart } from './charts/EChart';

export function MoodSparkline({ data }: { data: { t: number; v: number }[] }) {
  if (data.length === 0) return <span className="text-sm text-neutral-500">no data</span>;
  const option: EChartsOption = {
    grid: { top: 4, right: 4, bottom: 4, left: 4 },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', min: 1, max: 5, show: false },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'line', showSymbol: false, smooth: true, data: data.map((d) => [d.t, d.v]) }],
  };
  return <EChart option={option} className="h-16 w-full" />;
}
```

- [ ] **Step 3: Build the whole app** (now no recharts imports remain)

Run: `npm run build`
Expected: build succeeds. If it fails on a stray recharts import, run `grep -rn "recharts" app components` and fix.

- [ ] **Step 4: Commit**
```bash
git add components/MeasureCharts.tsx components/MoodSparkline.tsx
git commit -m "feat: rebuild charts on echarts with dataZoom"
```

---

### Task 10: Insight series builders (TDD)

**Files:**
- Create: `lib/insights/index.ts`
- Test: `lib/insights/index.test.ts`

Defines the available metrics and how to turn DB rows into `{t,v}[]` series. Food kcal is aggregated per day.

- [ ] **Step 1: Write the failing test** (pure aggregation helper)
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sumKcalByDay } from './index';

test('sums kcal per UTC day', () => {
  const rows = [
    { loggedAt: new Date('2026-01-01T08:00:00Z'), estimatedKcal: 200 },
    { loggedAt: new Date('2026-01-01T20:00:00Z'), estimatedKcal: 300 },
    { loggedAt: new Date('2026-01-02T12:00:00Z'), estimatedKcal: 500 },
    { loggedAt: new Date('2026-01-02T13:00:00Z'), estimatedKcal: null },
  ];
  const series = sumKcalByDay(rows);
  assert.deepEqual(series, [
    { t: Date.parse('2026-01-01T00:00:00Z'), v: 500 },
    { t: Date.parse('2026-01-02T00:00:00Z'), v: 500 },
  ]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test lib/insights/index.test.ts`
Expected: FAIL — module/function missing.

- [ ] **Step 3: Implement**
```ts
import { and, eq, gte } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { measurements, foodEntries } from '@/lib/db/schema';

export interface Point { t: number; v: number }

export interface MetricDef {
  key: 'weight' | 'mood' | 'activity' | 'kcal';
  label: string;
  unit: string;
  color: string;
}

export const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#2563eb' },
  { key: 'mood', label: 'Mood', unit: '1-5', color: '#16a34a' },
  { key: 'activity', label: 'Activity', unit: 'min', color: '#ea580c' },
  { key: 'kcal', label: 'Food', unit: 'kcal', color: '#a855f7' },
];

function dayStartUtc(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function sumKcalByDay(rows: { loggedAt: Date; estimatedKcal: number | null }[]): Point[] {
  const byDay = new Map<number, number>();
  for (const r of rows) {
    if (r.estimatedKcal == null) continue;
    const t = dayStartUtc(r.loggedAt);
    byDay.set(t, (byDay.get(t) ?? 0) + r.estimatedKcal);
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([t, v]) => ({ t, v }));
}

export function measurementPoints(userId: number, kind: 'weight' | 'mood' | 'activity', since: Date): Point[] {
  const rows = db().select().from(measurements)
    .where(and(eq(measurements.userId, userId), eq(measurements.kind, kind), gte(measurements.loggedAt, since)))
    .all();
  return rows
    .filter((r) => r.valueNumeric != null)
    .map((r) => ({ t: r.loggedAt.getTime(), v: r.valueNumeric as number }))
    .sort((a, b) => a.t - b.t);
}

export function kcalPoints(userId: number, since: Date): Point[] {
  const rows = db().select().from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), gte(foodEntries.loggedAt, since)))
    .all();
  return sumKcalByDay(rows.map((r) => ({ loggedAt: r.loggedAt, estimatedKcal: r.estimatedKcal })));
}

export function seriesFor(userId: number, key: MetricDef['key'], since: Date): Point[] {
  return key === 'kcal' ? kcalPoints(userId, since) : measurementPoints(userId, key, since);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test lib/insights/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/insights/index.ts lib/insights/index.test.ts
git commit -m "feat: insight metric series builders with kcal aggregation"
```

---

### Task 11: Insights page (series picker, stacked default, overlay toggle, shared zoom)

**Files:**
- Create: `app/insights/page.tsx` (server component — loads data)
- Create: `components/insights/InsightsView.tsx` (client — picker + chart modes)

- [ ] **Step 1: Server page loads all metric series**

`app/insights/page.tsx`:
```tsx
import { requireUser } from '@/lib/auth/server';
import { METRICS, seriesFor } from '@/lib/insights';
import { InsightsView } from '@/components/insights/InsightsView';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const user = await requireUser();
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  const data = METRICS.map((m) => ({ ...m, points: seriesFor(user.id, m.key, since) }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Insights</h1>
      <p className="text-sm text-neutral-500">Pick metrics to compare. Zoom with the slider or scroll on the chart.</p>
      <InsightsView metrics={data} />
    </div>
  );
}
```

- [ ] **Step 2: Client view — picker + stacked/overlay modes + shared zoom**

`components/insights/InsightsView.tsx`:
```tsx
'use client';
import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/charts/EChart';

interface Metric { key: string; label: string; unit: string; color: string; points: { t: number; v: number }[] }

export function InsightsView({ metrics }: { metrics: Metric[] }) {
  const [selected, setSelected] = useState<string[]>(metrics.filter((m) => m.points.length).map((m) => m.key).slice(0, 3));
  const [mode, setMode] = useState<'stacked' | 'overlay'>('stacked');
  const active = metrics.filter((m) => selected.includes(m.key));

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  const option = useMemo<EChartsOption>(
    () => (mode === 'stacked' ? stackedOption(active) : overlayOption(active)),
    [active, mode],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {metrics.map((m) => (
          <button key={m.key} onClick={() => toggle(m.key)}
            disabled={!m.points.length}
            className={`rounded-full border px-3 py-1 text-xs ${selected.includes(m.key) ? 'border-transparent text-white' : 'border-neutral-300 text-neutral-500 dark:border-neutral-700'} disabled:opacity-40`}
            style={selected.includes(m.key) ? { backgroundColor: m.color } : undefined}>
            {m.label}{m.points.length ? '' : ' (no data)'}
          </button>
        ))}
        <span className="ml-auto" />
        <div className="flex rounded border border-neutral-300 text-xs dark:border-neutral-700">
          {(['stacked', 'overlay'] as const).map((mo) => (
            <button key={mo} onClick={() => setMode(mo)}
              className={`px-3 py-1 ${mode === mo ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>
              {mo === 'stacked' ? 'Stacked' : 'Overlay'}
            </button>
          ))}
        </div>
      </div>
      {active.length === 0
        ? <div className="flex h-64 items-center justify-center text-sm text-neutral-500">Select at least one metric.</div>
        : <EChart key={mode} option={option} className="w-full" />}
    </div>
  );
}

function overlayOption(active: Metric[]): EChartsOption {
  return {
    grid: { top: 30, right: 50, bottom: 60, left: 50 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'time' },
    yAxis: active.map((m, i) => ({
      type: 'value', name: m.unit, position: i % 2 ? 'right' : 'left',
      offset: Math.floor(i / 2) * 40, scale: true, axisLine: { lineStyle: { color: m.color } },
    })),
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 16 }],
    series: active.map((m, i) => ({
      type: 'line', name: m.label, yAxisIndex: i, showSymbol: false,
      itemStyle: { color: m.color }, data: m.points.map((p) => [p.t, p.v]),
    })),
  };
}

function stackedOption(active: Metric[]): EChartsOption {
  const rows = active.length;
  const laneH = 120;
  const top = 20, gap = 30;
  return {
    // Force a tall enough container via height on each grid; EChart wrapper div must grow.
    tooltip: { trigger: 'axis' },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: active.map((_, i) => ({ left: 56, right: 24, top: top + i * (laneH + gap), height: laneH })),
    xAxis: active.map((_, i) => ({ type: 'time', gridIndex: i, axisLabel: { show: i === rows - 1 } })),
    yAxis: active.map((m, i) => ({ type: 'value', gridIndex: i, name: `${m.label} (${m.unit})`, scale: true })),
    dataZoom: [
      { type: 'inside', xAxisIndex: active.map((_, i) => i) },
      { type: 'slider', xAxisIndex: active.map((_, i) => i), height: 18, bottom: 8 },
    ],
    series: active.map((m, i) => ({
      type: 'line', name: m.label, xAxisIndex: i, yAxisIndex: i, showSymbol: false,
      itemStyle: { color: m.color }, data: m.points.map((p) => [p.t, p.v]),
    })),
  };
}
```
> The stacked container must be tall enough: in `EChart`, the default `h-64` is too short for multiple lanes. Pass an explicit height. Update the `<EChart>` call for stacked mode to compute height: replace the render line with:
```tsx
        : <EChart key={mode} option={option}
            className="w-full"
            />}
```
and set the div height by giving `InsightsView` a wrapper with an inline min-height when stacked: wrap the chart in
```tsx
<div style={{ height: mode === 'stacked' ? active.length * 150 + 60 : 360 }}>
  <EChart key={mode} option={option} className="h-full w-full" />
</div>
```
(Use this wrapper instead of the bare `<EChart>` in the `active.length === 0 ? ... : ...` branch.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. Then manual check after seed (Task 14): `/insights` shows chips; stacked lanes share one zoom slider; Overlay toggle switches to multi-Y-axis.

- [ ] **Step 4: Commit**
```bash
git add app/insights/page.tsx components/insights/InsightsView.tsx
git commit -m "feat: insights correlation view (stacked + overlay, shared zoom)"
```

---

## Chunk 4: Media gallery

### Task 12: Media gallery page

**Files:**
- Create: `lib/media/index.ts`
- Create: `app/media/page.tsx`
- Create: `components/media/Gallery.tsx`

- [ ] **Step 1: Data accessor**

`lib/media/index.ts`:
```ts
import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodEntries } from '@/lib/db/schema';

export interface MediaItem { id: number; imagePath: string; name: string; caption: string | null; loggedAt: number }

export function listMedia(userId: number, limit = 200): MediaItem[] {
  const rows = db().select().from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), isNotNull(foodEntries.imagePath)))
    .orderBy(desc(foodEntries.loggedAt)).limit(limit).all();
  return rows.map((r) => ({
    id: r.id,
    imagePath: r.imagePath as string,
    name: r.dishName ?? r.rawText ?? 'Image',
    caption: r.rawText ?? null,
    loggedAt: r.loggedAt.getTime(),
  }));
}
```

- [ ] **Step 2: Server page**

`app/media/page.tsx`:
```tsx
import { requireUser } from '@/lib/auth/server';
import { listMedia } from '@/lib/media';
import { Gallery } from '@/components/media/Gallery';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const user = await requireUser();
  const items = listMedia(user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Media</h1>
      {items.length === 0
        ? <p className="text-sm text-neutral-500">No images yet. Send a photo to the bot.</p>
        : <Gallery items={items} />}
    </div>
  );
}
```

- [ ] **Step 3: Client gallery with enlarge**

`components/media/Gallery.tsx`:
```tsx
'use client';
import { useState } from 'react';

interface Item { id: number; imagePath: string; name: string; caption: string | null; loggedAt: number }

export function Gallery({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<Item | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it) => (
          <button key={it.id} onClick={() => setOpen(it)} className="group overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
            <img src={`/api/images/${it.imagePath}`} alt={it.name} className="aspect-square w-full object-cover transition group-hover:opacity-90" />
          </button>
        ))}
      </div>
      {open && (
        <div onClick={() => setOpen(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-2xl overflow-auto rounded bg-white p-3 dark:bg-neutral-900">
            <img src={`/api/images/${open.imagePath}`} alt={open.name} className="mb-2 w-full rounded object-contain" />
            <div className="font-medium">{open.name}</div>
            {open.caption && <div className="text-sm text-neutral-500">“{open.caption}”</div>}
            <div className="text-xs text-neutral-400">{new Date(open.loggedAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` → Expected: succeeds.
```bash
git add lib/media/index.ts app/media/page.tsx components/media/Gallery.tsx
git commit -m "feat: media gallery page with enlarge view"
```

---

## Chunk 5: Demo user, seed data, demo login, People admin

### Task 13: Auth helper — mint an authenticated session (TDD)

**Files:**
- Modify: `lib/auth/index.ts` (add `createAuthenticatedSession`)
- Test: `lib/auth/session.test.ts`

- [ ] **Step 1: Write the failing test**
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.DATABASE_URL = 'file::memory:';
const auth = await import('./index');
const { db } = await import('@/lib/db/client');
const { users } = await import('@/lib/db/schema');

test('createAuthenticatedSession returns an authenticated session for a user', () => {
  const u = db().insert(users).values({ username: 'demo', createdAt: new Date() }).returning().get();
  const sid = auth.createAuthenticatedSession(u.id);
  assert.equal(typeof sid, 'string');
  assert.equal(auth.isSessionAuthenticated(sid), true);
  assert.equal(auth.getAuthenticatedUser(sid)?.id, u.id);
});
```
> The `@/` alias resolves under `tsx --test` (tsx honors tsconfig `paths`). Depends on Task 2b (in-memory DB). The test inserts its own user, satisfying the FK constraint.

- [ ] **Step 2: Run to verify it fails**

Run: `npx tsx --test lib/auth/session.test.ts`
Expected: FAIL — `createAuthenticatedSession` is not a function.

- [ ] **Step 3: Implement the helper** (append to `lib/auth/index.ts`)
```ts
export function createAuthenticatedSession(userId: number): string {
  const sessionId = token(24);
  const now = new Date();
  db().insert(sessions).values({
    id: sessionId,
    userId,
    authenticated: true,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  }).run();
  return sessionId;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx tsx --test lib/auth/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/auth/index.ts lib/auth/session.test.ts
git commit -m "feat: createAuthenticatedSession helper"
```

---

### Task 14: Demo seed script (idempotent, correlated, with images)

**Files:**
- Create: `scripts/seed-demo.ts`
- Create: `scripts/seed-assets/` (commit 3–4 CC0 meal jpgs — see step 1)
- Modify: `package.json` (add `db:seed-demo` script)
- Create: `lib/demo.ts` (shared constant)

- [ ] **Step 1: Add the demo username constant + obtain CC0 images**

`lib/demo.ts`:
```ts
export const DEMO_USERNAME = 'demo';
```
Place 3–4 small CC0/public-domain meal JPEGs in `scripts/seed-assets/` named `meal-1.jpg` … `meal-4.jpg`. Source from a CC0 provider (e.g. Pexels/Unsplash with CC0/public-domain license). If none are available at implementation time, generate simple solid-color placeholder JPEGs so the pipeline is exercised; note this in the commit message.

- [ ] **Step 2: Write the seed script**

`scripts/seed-demo.ts`:
```ts
import 'dotenv/config';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { users, measurements, foodEntries } from '../lib/db/schema';
import { DEMO_USERNAME } from '../lib/demo';

const DAYS = 90;
const IMG_ROOT = resolve(process.env.IMAGE_DIR ?? './data/images');

function ensureDemoUser(): number {
  const d = db();
  const existing = d.select().from(users).where(eq(users.username, DEMO_USERNAME)).all();
  if (existing.length > 1) throw new Error(`Multiple users named ${DEMO_USERNAME}; aborting to stay safe.`);
  if (existing.length === 1) return existing[0].id;
  return d.insert(users).values({ username: DEMO_USERNAME, createdAt: new Date() }).returning().get().id;
}

function wipeDemo(userId: number) {
  const d = db();
  d.delete(measurements).where(eq(measurements.userId, userId)).run();
  d.delete(foodEntries).where(eq(foodEntries.userId, userId)).run();
}

function noise(scale: number) { return (Math.random() - 0.5) * scale; }

function seed(userId: number) {
  const d = db();
  const now = Date.now();
  const dayMs = 86_400_000;
  const cats = ['run', 'walk', 'gym', 'yoga'];

  for (let i = DAYS; i >= 0; i--) {
    const t = new Date(now - i * dayMs);
    const progress = (DAYS - i) / DAYS; // 0 → 1 over time
    // Engineered correlation: activity ↑ → weight ↓ → mood ↑
    const activityMin = Math.max(0, Math.round(15 + progress * 35 + noise(20)));
    const weight = +(85 - progress * 6 + noise(0.6)).toFixed(1);
    const mood = Math.min(5, Math.max(1, Math.round(2.5 + progress * 2 + noise(1))));

    d.insert(measurements).values({ userId, loggedAt: t, kind: 'weight', valueNumeric: weight }).run();
    d.insert(measurements).values({ userId, loggedAt: t, kind: 'mood', valueNumeric: mood }).run();
    if (activityMin > 0) {
      d.insert(measurements).values({
        userId, loggedAt: t, kind: 'activity',
        category: cats[i % cats.length], valueNumeric: activityMin,
      }).run();
    }
  }

  // Food entries: ~18 across the window, some with images.
  const userImgDir = join(IMG_ROOT, String(userId));
  mkdirSync(userImgDir, { recursive: true });
  const dishes = ['Oatmeal & berries', 'Chicken salad', 'Salmon & rice', 'Veggie stir-fry', 'Greek yogurt'];
  for (let n = 0; n < 18; n++) {
    const t = new Date(now - Math.floor((n / 18) * DAYS) * dayMs - 3_600_000 * (n % 6));
    const withImage = n % 4 === 0;
    let imagePath: string | null = null;
    if (withImage) {
      const srcIdx = (n % 4) + 1;
      const src = resolve('scripts/seed-assets', `meal-${srcIdx}.jpg`);
      const name = `seed-${n}.jpg`;
      if (existsSync(src)) { copyFileSync(src, join(userImgDir, name)); imagePath = `${userId}/${name}`; }
    }
    d.insert(foodEntries).values({
      userId, loggedAt: t,
      source: withImage ? 'photo' : 'text',
      rawText: dishes[n % dishes.length],
      dishName: dishes[n % dishes.length],
      imagePath,
      estimatedKcal: 300 + (n % 5) * 120,
    }).run();
  }
}

const userId = ensureDemoUser();
wipeDemo(userId);
seed(userId);
console.log(`Seeded demo user (id=${userId}) with ${DAYS} days of correlated data.`);
```

- [ ] **Step 3: Add npm script**

In `package.json` `"scripts"`: `"db:seed-demo": "tsx scripts/seed-demo.ts"`.

- [ ] **Step 4: Run the seed and verify isolation**

Run: `npm run db:seed-demo`
Expected: prints "Seeded demo user (id=…)". Run it again → Expected: same, no duplicate users (re-running wipes only demo rows). Confirm a real user (if any) is untouched: `sqlite3 ./data/vault.sqlite "select username,count(*) from users group by username"` (demo appears once).

- [ ] **Step 5: Commit**
```bash
git add scripts/seed-demo.ts scripts/seed-assets lib/demo.ts package.json
git commit -m "feat: idempotent demo seed with correlated data and images"
```

---

### Task 15: "View demo" entry point

**Files:**
- Create: `app/api/auth/demo/route.ts`
- Modify: `app/login/page.tsx` (add a "View demo" button)

- [ ] **Step 1: Demo login route (hard-bound to demo user)**

`app/api/auth/demo/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, createAuthenticatedSession, getUserByUsername } from '@/lib/auth';
import { DEMO_USERNAME } from '@/lib/demo';

export const runtime = 'nodejs';

export async function POST() {
  const demo = getUserByUsername(DEMO_USERNAME); // resolves ONLY the demo user; no input accepted
  if (!demo) return NextResponse.json({ error: 'demo not seeded' }, { status: 404 });
  const sessionId = createAuthenticatedSession(demo.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

- [ ] **Step 2: Add the button to the login page**

In `app/login/page.tsx`, inside the `!code` branch under the form, add:
```tsx
          <button
            type="button"
            onClick={async () => {
              const r = await fetch('/api/auth/demo', { method: 'POST' });
              if (r.ok) router.push('/'); else setError('Demo not available — run `npm run db:seed-demo`.');
            }}
            className="mt-2 block text-sm underline"
          >
            View demo (no Telegram needed)
          </button>
```

- [ ] **Step 3: Build + manual check**

Run: `npm run build` → succeeds. Manual: visit `/login`, click "View demo", land on dashboard as the demo user with seeded data; `/insights` and `/media` populated.

- [ ] **Step 4: Commit**
```bash
git add app/api/auth/demo/route.ts app/login/page.tsx
git commit -m "feat: one-click demo login bound to demo user"
```

---

### Task 16: People admin page with minimal admin gate

**Files:**
- Modify (replace stub): `app/people/page.tsx`
- Create: `lib/admin.ts` (cookie name + verify/derive helpers)
- Create: `app/people/actions.ts` (server actions: unlock, create invite, list users)

- [ ] **Step 1: Admin gate helpers**

`lib/admin.ts`:
```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'hv_admin';

function expectedToken(secret: string): string {
  // derived token (not the raw secret) stored in the cookie
  return createHmac('sha256', secret).update('admin-gate-v1').digest('hex');
}

export function adminEnabled(): boolean { return !!process.env.ADMIN_SECRET; }

export function checkSecret(input: string): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  const a = Buffer.from(input); const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return expectedToken(secret);
}

export function isAdminCookieValid(cookieVal: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !cookieVal) return false;
  const exp = expectedToken(secret);
  const a = Buffer.from(cookieVal); const b = Buffer.from(exp);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

- [ ] **Step 2: Server actions**

`app/people/actions.ts`:
```ts
'use server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { createInvite } from '@/lib/auth';
import { ADMIN_COOKIE, checkSecret, isAdminCookieValid } from '@/lib/admin';

export async function unlockAdmin(formData: FormData) {
  const secret = String(formData.get('secret') ?? '');
  const tokenVal = checkSecret(secret);
  if (!tokenVal) return { ok: false as const, error: 'Invalid secret' };
  (await cookies()).set(ADMIN_COOKIE, tokenVal, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 8,
  });
  return { ok: true as const };
}

async function requireAdmin() {
  const c = await cookies();
  if (!isAdminCookieValid(c.get(ADMIN_COOKIE)?.value)) throw new Error('forbidden');
}

export async function listUsers() {
  await requireAdmin();
  return db().select().from(users).all().map((u) => ({ id: u.id, username: u.username, linked: u.telegramUserId != null }));
}

export async function createInviteAction(formData: FormData) {
  await requireAdmin();
  const username = String(formData.get('username') ?? '').trim();
  if (!username) return { ok: false as const, error: 'username required' };
  const token = createInvite(username);
  return { ok: true as const, token, startCommand: `/start ${token}` };
}
```

- [ ] **Step 3: People page (gate → list + invite)**

Replace `app/people/page.tsx` with a server component that branches on the admin cookie. Render the unlock form (posts to `unlockAdmin`) when locked; otherwise render the user list (from `listUsers()`) and an invite form (posts to `createInviteAction`). Show "admin disabled" when `adminEnabled()` is false.
```tsx
import { cookies } from 'next/headers';
import { adminEnabled, ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { listUsers, unlockAdmin, createInviteAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  if (!adminEnabled()) {
    return <p className="text-sm text-neutral-500">Admin disabled (no ADMIN_SECRET set).</p>;
  }
  const unlocked = isAdminCookieValid((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!unlocked) {
    return (
      <form action={unlockAdmin} className="max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">People</h1>
        <input name="secret" type="password" placeholder="Admin secret"
          className="w-full rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">Unlock</button>
      </form>
    );
  }
  const people = await listUsers();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>
      <ul className="space-y-1">
        {people.map((p) => (
          <li key={p.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
            {p.username} {p.linked ? <span className="text-green-600">· linked</span> : <span className="text-neutral-400">· not linked</span>}
          </li>
        ))}
      </ul>
      <form action={createInviteAction} className="flex max-w-sm gap-2">
        <input name="username" placeholder="new username"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">Invite</button>
      </form>
      <p className="text-xs text-neutral-500">After inviting, the new invite token is created server-side; share the matching <code>/start &lt;token&gt;</code> from your records or the API.</p>
    </div>
  );
}
```
> The form action returning a token cannot easily surface it via the basic `action={}` pattern without state. For v1 it's acceptable that the invite is created and the token retrievable via the existing `/api/admin/invite` flow or logs. If surfacing the token in the UI is desired, convert the invite form to a client component using `useActionState` to display the returned `startCommand`. Note this as an optional enhancement; do not block v1.

- [ ] **Step 4: Build + manual check**

Run: `npm run build` → succeeds. Manual: `/people` shows unlock form; wrong secret rejected; correct secret unlocks; user list shows; invite form creates an invite (verify a row in `invite_tokens`).

- [ ] **Step 5: Commit**
```bash
git add app/people/page.tsx app/people/actions.ts lib/admin.ts
git commit -m "feat: people admin page with minimal admin gate"
```

---

## Final verification

### Task 17: Full build, tests, and vault update

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all test files pass (activity-parse, measures, insights, auth session).
> If `npm test` (`tsx --test` with no path) does not auto-discover, run each explicitly:
> `npx tsx --test lib/measures/activity-parse.test.ts lib/measures/index.test.ts lib/insights/index.test.ts lib/auth/session.test.ts`

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: succeeds with no type errors and no recharts references (`grep -rn recharts app components lib` → empty).

- [ ] **Step 3: Smoke test the demo**

Run: `npm run dev`, open `/login`, click "View demo", verify: dashboard renders; `/measures` shows zoomable weight/mood; `/insights` shows stacked lanes with one shared zoom + working Overlay toggle + chips; `/media` shows seeded images with enlarge; sidebar sections expand/collapse and highlight the active route.

- [ ] **Step 4: Update the vault**

Append an entry to `vault/actions-log.md` summarizing v1 implementation (what shipped, branch, any deferred notes: sidebar localStorage persistence, invite-token UI surfacing). Add a `vault/plans/roadmap.md` pointing at this plan and the Phase 2/3 backlog from the spec.

- [ ] **Step 5: Final commit**
```bash
git add vault
git commit -m "docs: record v1 implementation in vault"
```

---

## Deferred (explicitly NOT in v1 — from spec Backlog)
- AI input-parsing/normalization engine (general structured extraction across inputs).
- Richer activity fields (distance, intensity, calories).
- Goals/targets, reminders/nudges, chart annotations, export/backup UI.
- Sidebar open/closed **localStorage persistence** (nice-to-have; defaults to open in v1).
- Surfacing the created invite token directly in the People UI (optional enhancement noted in Task 16).
