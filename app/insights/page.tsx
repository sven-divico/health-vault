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
