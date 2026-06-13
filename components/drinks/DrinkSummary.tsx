import { DRINK_METRICS, type DrinkPeriodSummary } from '@/lib/drinks/summary';
import { t } from '@/lib/i18n/de';

const TH = 'whitespace-nowrap px-3 py-2 text-left font-medium';
const TD = 'whitespace-nowrap px-3 py-2';

const fmtVal = (v: number | null, unit: 'ml' | 'g') => {
  if (v == null) return '—';
  return unit === 'ml' ? Math.round(v).toLocaleString('de-DE') : v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
};

/** Period × (Volumen/Alkohol/Zucker) summary band — sums over each window. */
export function DrinkSummary({ summary }: { summary: DrinkPeriodSummary[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t.drinks.summaryTitle}</h2>
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className={TH}>{t.drinks.periodCol}</th>
              {DRINK_METRICS.map((m) => (
                <th key={m.key} className={`${TH} text-right`}>{m.label} ({m.unit})</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((p) => (
              <tr key={p.key} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                <td className={`${TD} font-medium`}>{t.drinks.periods[p.key]}</td>
                {DRINK_METRICS.map((m) => (
                  <td key={m.key} className={`${TD} text-right tabular-nums`}>{fmtVal(p.sums[m.key], m.unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
