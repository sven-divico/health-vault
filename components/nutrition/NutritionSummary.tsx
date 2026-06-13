import { NUTRIENTS, formatNutrient } from '@/lib/nutrition';
import type { PeriodSummary } from '@/lib/nutrition/summary';
import { t } from '@/lib/i18n/de';

const TH = 'whitespace-nowrap px-3 py-2 text-left font-medium';
const TD = 'whitespace-nowrap px-3 py-2';

/** Period × nutrient summary band (sums over each window, independent of pagination). */
export function NutritionSummary({ summary }: { summary: PeriodSummary[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t.food.summaryTitle}</h2>
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className={TH}>{t.food.periodCol}</th>
              {NUTRIENTS.map((n) => (
                <th key={n.key} className={`${TH} text-right`}>{n.label}{n.unit === 'g' ? ' (g)' : ' (kcal)'}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((p) => (
              <tr key={p.key} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                <td className={`${TD} font-medium`}>{t.food.periods[p.key]}</td>
                {NUTRIENTS.map((n) => (
                  <td key={n.key} className={`${TD} text-right tabular-nums`}>{formatNutrient(p.sums[n.key], n.unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
