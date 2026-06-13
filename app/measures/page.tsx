import { requireUser } from '@/lib/auth/server';
import { listMeasurements } from '@/lib/measures';
import { MeasureCharts } from '@/components/MeasureCharts';

export const dynamic = 'force-dynamic';

export default async function MeasuresPage() {
  const user = await requireUser();
  const weight = listMeasurements(user.id, 'weight', 365).reverse();
  const mood = listMeasurements(user.id, 'mood', 365).reverse();
  const activity = listMeasurements(user.id, 'activity', 100);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Measures</h1>

      <MeasureCharts
        weight={weight.map((m) => ({ t: m.loggedAt.getTime(), v: m.valueNumeric ?? 0 }))}
        mood={mood.map((m) => ({ t: m.loggedAt.getTime(), v: m.valueNumeric ?? 0 }))}
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold">Activity</h2>
        <ul className="space-y-1">
          {activity.map((a) => (
            <li key={a.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <span className="mr-2 text-xs text-neutral-500">{new Date(a.loggedAt).toLocaleString()}</span>
              <span className="font-medium">{a.category ?? 'activity'}</span>
              {a.valueNumeric != null && <span className="text-neutral-500"> · {a.valueNumeric} min</span>}
              {(a.note ?? a.valueText) && <span className="text-neutral-500"> · {a.note ?? a.valueText}</span>}
            </li>
          ))}
          {activity.length === 0 && <li className="text-sm text-neutral-500">No activity entries.</li>}
        </ul>
      </section>
    </div>
  );
}
