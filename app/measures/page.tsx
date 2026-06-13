import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/server';
import { listMeasurements } from '@/lib/measures';
import { MeasuresView } from '@/components/measures/MeasuresView';
import { TIMERANGE_COOKIE, toRangeKey } from '@/lib/time-range';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

// Effectively "all" — volume is tiny; the time-window pills filter client-side.
const ALL = 100_000;

export default async function MeasuresPage() {
  const user = await requireUser();
  const initialRange = toRangeKey((await cookies()).get(TIMERANGE_COOKIE)?.value);
  const weight = listMeasurements(user.id, 'weight', ALL).reverse();
  const mood = listMeasurements(user.id, 'mood', ALL).reverse();
  const activity = listMeasurements(user.id, 'activity', ALL);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t.measures.title}</h1>

      <MeasuresView
        initialRange={initialRange}
        weight={weight.map((m) => ({ t: m.loggedAt.getTime(), v: m.valueNumeric ?? 0 }))}
        mood={mood.map((m) => ({ t: m.loggedAt.getTime(), v: m.valueNumeric ?? 0 }))}
        activity={activity.map((a) => ({
          id: a.id,
          loggedAt: a.loggedAt.getTime(),
          category: a.category,
          valueNumeric: a.valueNumeric,
          note: a.note,
          valueText: a.valueText,
        }))}
      />
    </div>
  );
}
