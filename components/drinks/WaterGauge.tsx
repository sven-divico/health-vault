'use client';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/charts/EChart';
import { t } from '@/lib/i18n/de';

const liters = (ml: number) => (ml / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Donut of today's total drink volume vs the daily goal. Fill caps at 100 %; label shows
 * the real percentage. */
export function WaterGauge({ consumedMl, goalMl }: { consumedMl: number; goalMl: number }) {
  const pct = goalMl > 0 ? Math.round((consumedMl / goalMl) * 100) : 0;
  const filled = Math.min(consumedMl, goalMl);
  const remainder = Math.max(0, goalMl - consumedMl);
  const over = consumedMl >= goalMl;

  const option: EChartsOption = {
    series: [{
      type: 'pie', radius: ['68%', '90%'], silent: true, startAngle: 90,
      label: { show: false }, labelLine: { show: false },
      data: [
        { value: filled, itemStyle: { color: over ? '#0891b2' : '#06b6d4' } },
        { value: remainder, itemStyle: { color: '#e5e7eb' } },
      ],
    }],
    title: {
      text: t.drinks.gaugeLabel(liters(consumedMl), liters(goalMl), pct),
      left: 'center', top: 'center',
      textStyle: { fontSize: 16, fontWeight: 600, color: '#64748b' },
    },
  };

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t.drinks.gaugeTitle}</h2>
      <div className="rounded border border-neutral-200 p-2 dark:border-neutral-800" style={{ height: 220 }}>
        <EChart option={option} className="h-full w-full" />
      </div>
    </section>
  );
}
