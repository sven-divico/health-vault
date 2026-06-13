import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/server';
import { listDrinkEntriesPaged, countDrinkEntries, sumVolumeSince } from '@/lib/drinks/queries';
import { drinkSummaryForUser } from '@/lib/drinks/summary';
import { DRINK_PAGE_SIZE_COOKIE, DRINK_PAGE_SIZES, toDrinkPageSize } from '@/lib/drinks/paging';
import { rangeBounds } from '@/lib/time-range';
import { WaterGauge } from '@/components/drinks/WaterGauge';
import { AddDrinkForm } from '@/components/drinks/AddDrinkForm';
import { DrinkSummary } from '@/components/drinks/DrinkSummary';
import { DrinksTable, type DrinkRow } from '@/components/drinks/DrinksTable';
import { PageSizeSelect } from '@/components/PageSizeSelect';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

const WATER_GOAL_ML = Number(process.env.DRINK_WATER_GOAL_ML ?? 2000);

export default async function DrinksPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const now = Date.now();
  const pageSize = toDrinkPageSize((await cookies()).get(DRINK_PAGE_SIZE_COOKIE)?.value);
  const total = countDrinkEntries(user.id);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number((await searchParams).page ?? '1');
  const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), totalPages);
  const offset = (page - 1) * pageSize;

  const todayMl = sumVolumeSince(user.id, new Date(rangeBounds('today', now).from));
  const summary = drinkSummaryForUser(user.id, now);

  const rows: DrinkRow[] = listDrinkEntriesPaged(user.id, { limit: pageSize, offset }).map((d) => ({
    id: d.id,
    loggedAt: d.loggedAt.getTime(),
    name: d.name,
    rawText: d.rawText,
    volumeMl: d.volumeMl,
    alcoholGPer100ml: d.alcoholGPer100ml,
    sugarGPer100ml: d.sugarGPer100ml,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.drinks.title}</h1>

      <WaterGauge consumedMl={todayMl} goalMl={WATER_GOAL_ML} />

      <AddDrinkForm />

      <DrinkSummary summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-neutral-500">{t.drinks.totalEntries(total)}</span>
        <PageSizeSelect value={pageSize} cookieName={DRINK_PAGE_SIZE_COOKIE} basePath="/drinks" sizes={DRINK_PAGE_SIZES} />
      </div>

      <DrinksTable rows={rows} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>{t.drinks.prev}</PageLink>
          <span className="text-neutral-500">{t.drinks.pageInfo(page, totalPages)}</span>
          <PageLink page={page + 1} disabled={page >= totalPages}>{t.drinks.next}</PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="text-neutral-300 dark:text-neutral-700">{children}</span>;
  return <Link href={`/drinks?page=${page}`} className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">{children}</Link>;
}
