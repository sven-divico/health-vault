'use client';
import { RANGE_KEYS, type RangeKey } from '@/lib/time-range';
import { t } from '@/lib/i18n/de';

const LABELS: Record<RangeKey, string> = {
  today: t.range.today,
  '24h': t.range['24h'],
  '7d': t.range['7d'],
  month: t.range.month,
  all: t.range.all,
};

/**
 * Reusable, horizontally-scrollable time-window selector. Presentational:
 * the parent owns the selected value and persistence.
 */
export function TimeRangePills({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  return (
    <div
      role="group"
      aria-label={t.range.label}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {RANGE_KEYS.map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            aria-pressed={active}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
              active
                ? 'border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'border-neutral-300 text-neutral-500 hover:border-neutral-400 dark:border-neutral-700'
            }`}
          >
            {LABELS[k]}
          </button>
        );
      })}
    </div>
  );
}
