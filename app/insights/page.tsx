import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/server';
import { METRICS, seriesFor } from '@/lib/insights';
import { InsightsView } from '@/components/insights/InsightsView';
import { TIMERANGE_COOKIE, toRangeKey } from '@/lib/time-range';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

export default async function InsightsPage() {
  const user = await requireUser();
  const initialRange = toRangeKey((await cookies()).get(TIMERANGE_COOKIE)?.value);
  // Load the full series; the time-window pills filter client-side. Volume is tiny.
  const since = new Date(0);
  const data = METRICS.map((m) => ({ ...m, points: seriesFor(user.id, m.key, since) }));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.insights.title}</h1>
      <p className="text-sm text-neutral-500">{t.insights.subtitle}</p>
      <InsightsView metrics={data} initialRange={initialRange} />
    </div>
  );
}
