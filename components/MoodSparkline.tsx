'use client';
import type { EChartsOption } from 'echarts';
import { EChart } from './charts/EChart';

export function MoodSparkline({ data }: { data: { t: number; v: number }[] }) {
  if (data.length === 0) return <span className="text-sm text-neutral-500">no data</span>;
  const option: EChartsOption = {
    grid: { top: 4, right: 4, bottom: 4, left: 4 },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', min: 1, max: 5, show: false },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'line', showSymbol: false, smooth: true, data: data.map((d) => [d.t, d.v]) }],
  };
  return <EChart option={option} className="h-16 w-full" />;
}
