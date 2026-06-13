import Link from 'next/link';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/server';
import { listFoodEntriesPaged, countFoodEntries } from '@/lib/food';
import { FOOD_PAGE_SIZE_COOKIE, FOOD_PAGE_SIZES, toPageSize } from '@/lib/food/paging';
import { summaryForUser } from '@/lib/nutrition/summary';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { NutritionTable, type FoodRow } from '@/components/nutrition/NutritionTable';
import { PageSizeSelect } from '@/components/PageSizeSelect';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const pageSize = toPageSize((await cookies()).get(FOOD_PAGE_SIZE_COOKIE)?.value);
  const total = countFoodEntries(user.id);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number((await searchParams).page ?? '1');
  const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), totalPages);
  const offset = (page - 1) * pageSize;

  const rows: FoodRow[] = listFoodEntriesPaged(user.id, { limit: pageSize, offset }).map((f) => ({
    id: f.id,
    loggedAt: f.loggedAt.getTime(),
    imagePath: f.imagePath,
    dishName: f.dishName,
    rawText: f.rawText,
    source: f.source,
    portionG: f.portionG,
    kcalPer100g: f.kcalPer100g,
    carbsGPer100g: f.carbsGPer100g,
    sugarGPer100g: f.sugarGPer100g,
    fatGPer100g: f.fatGPer100g,
    saturatedFatGPer100g: f.saturatedFatGPer100g,
    proteinGPer100g: f.proteinGPer100g,
    fiberGPer100g: f.fiberGPer100g,
    saltGPer100g: f.saltGPer100g,
  }));

  const summary = summaryForUser(user.id, Date.now());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.food.title}</h1>

      <NutritionSummary summary={summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-neutral-500">{t.food.totalEntries(total)}</span>
        <PageSizeSelect value={pageSize} cookieName={FOOD_PAGE_SIZE_COOKIE} basePath="/food" sizes={FOOD_PAGE_SIZES} />
      </div>

      <NutritionTable rows={rows} />

      {totalPages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <PageLink page={page - 1} disabled={page <= 1}>{t.food.prev}</PageLink>
          <span className="text-neutral-500">{t.food.pageInfo(page, totalPages)}</span>
          <PageLink page={page + 1} disabled={page >= totalPages}>{t.food.next}</PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  if (disabled) return <span className="text-neutral-300 dark:text-neutral-700">{children}</span>;
  return <Link href={`/food?page=${page}`} className="rounded border border-neutral-300 px-3 py-1 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">{children}</Link>;
}
