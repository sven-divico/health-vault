'use client';
import { MeasureCharts } from '@/components/MeasureCharts';
import { TimeRangePills } from '@/components/TimeRangePills';
import { useTimeRange } from '@/components/useTimeRange';
import { filterByRange, rangeBounds, type RangeKey } from '@/lib/time-range';
import { t, fmt } from '@/lib/i18n/de';

interface Point { t: number; v: number }
interface ActivityItem {
  id: number;
  loggedAt: number;
  category: string | null;
  valueNumeric: number | null;
  note: string | null;
  valueText: string | null;
}

/**
 * Client wrapper: owns the selected time range (+ cookie persistence), filters the
 * full series/activity list client-side, and renders the pills above the charts.
 */
export function MeasuresView({ weight, mood, activity, initialRange }: {
  weight: Point[];
  mood: Point[];
  activity: ActivityItem[];
  initialRange: RangeKey;
}) {
  const [range, setRange] = useTimeRange(initialRange);
  const now = Date.now();
  const { from } = rangeBounds(range, now);

  const fWeight = filterByRange(weight, range, now);
  const fMood = filterByRange(mood, range, now);
  const fActivity = activity.filter((a) => a.loggedAt >= from);

  return (
    <div className="space-y-6">
      <TimeRangePills value={range} onChange={setRange} />

      <MeasureCharts weight={fWeight} mood={fMood} />

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t.measures.activity}</h2>
        <ul className="space-y-1">
          {fActivity.map((a) => (
            <li key={a.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <span className="mr-2 text-xs text-neutral-500">{fmt.dateTime(a.loggedAt)}</span>
              <span className="font-medium">{a.category ?? t.measures.activityFallback}</span>
              {a.valueNumeric != null && <span className="text-neutral-500">{t.measures.minSuffix(a.valueNumeric)}</span>}
              {(a.note ?? a.valueText) && <span className="text-neutral-500"> · {a.note ?? a.valueText}</span>}
            </li>
          ))}
          {fActivity.length === 0 && <li className="text-sm text-neutral-500">{t.measures.noActivity}</li>}
        </ul>
      </section>
    </div>
  );
}
