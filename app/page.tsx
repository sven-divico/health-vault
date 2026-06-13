import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { listFoodEntriesSince } from '@/lib/food';
import { latestMeasurement, listMeasurements } from '@/lib/measures';
import { MoodSparkline } from '@/components/MoodSparkline';
import { absoluteNutrition } from '@/lib/nutrition';
import { t, fmt } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireUser();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const food = listFoodEntriesSince(user.id, since);
  const weight = latestMeasurement(user.id, 'weight');
  const moodSeries = listMeasurements(user.id, 'mood', 30).reverse();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">{t.dashboard.greeting(user.username)}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.dashboard.subtitle}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title={t.dashboard.latestWeight}>
          {weight ? `${weight.valueNumeric?.toFixed(1)} kg` : '—'}
          {weight && (
            <p className="mt-1 text-xs text-neutral-500">
              {fmt.dateTime(weight.loggedAt)}
            </p>
          )}
        </Card>
        <Card title={t.dashboard.foodEntries7d}>{food.length}</Card>
        <Card title={t.dashboard.moodTrend}>
          <MoodSparkline data={moodSeries.map((m) => ({ t: m.loggedAt.getTime(), v: m.valueNumeric ?? 0 }))} />
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.dashboard.recentFood}</h2>
          <Link className="text-sm underline" href="/food">{t.common.all}</Link>
        </div>
        <ul className="space-y-2">
          {food.slice(0, 10).map((f) => {
            const kcal = absoluteNutrition(f).kcal;
            return (
            <li key={f.id} className="flex items-start gap-3 rounded border border-neutral-200 p-3 dark:border-neutral-800">
              {f.imagePath && (
                <img src={`/api/images/${f.imagePath}`} alt="" className="h-16 w-16 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium">{f.dishName ?? f.rawText ?? t.dashboard.noLabel}</div>
                <div className="text-xs text-neutral-500">
                  {fmt.dateTime(f.loggedAt)}
                  {kcal != null ? t.dashboard.kcalSuffix(Math.round(kcal)) : ''}
                </div>
              </div>
            </li>
            );
          })}
          {food.length === 0 && <li className="text-sm text-neutral-500">{t.dashboard.noFood}</li>}
        </ul>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{title}</div>
      <div className="mt-2 text-xl">{children}</div>
    </div>
  );
}
