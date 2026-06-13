'use client';
import type { EChartsOption } from 'echarts';
import { EChart } from './charts/EChart';
import { t } from '@/lib/i18n/de';

interface Series { t: number; v: number }

function lineOption(name: string, data: Series[], min?: number, max?: number): EChartsOption {
  return {
    grid: { top: 24, right: 16, bottom: 48, left: 44 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'time', axisLabel: { hideOverlap: true, fontSize: 10 } },
    yAxis: { type: 'value', name, min: min ?? 'dataMin', max: max ?? 'dataMax', scale: true, axisLabel: { fontSize: 10 } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }],
    series: [{
      type: 'line', name,
      // Sparse series (incl. single point) need visible symbols; dense series stay clean.
      showSymbol: data.length <= 60, symbolSize: 4,
      data: data.map((d) => [d.t, d.v]),
    }],
  };
}

export function MeasureCharts({ weight, mood }: { weight: Series[]; mood: Series[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title={t.measures.weightTitle} data={weight} />
      <ChartCard title={t.measures.moodTitle} data={mood} min={1} max={5} />
    </div>
  );
}

function ChartCard({ title, data, min, max }: { title: string; data: Series[]; min?: number; max?: number }) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {data.length === 0
        ? <div className="flex h-64 items-center justify-center text-sm text-neutral-500">{t.measures.noData}</div>
        : <EChart option={lineOption(title, data, min, max)} className="h-64 w-full" />}
    </div>
  );
}
