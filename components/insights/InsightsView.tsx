'use client';
import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { EChart } from '@/components/charts/EChart';

interface Metric { key: string; label: string; unit: string; color: string; points: { t: number; v: number }[] }

export function InsightsView({ metrics }: { metrics: Metric[] }) {
  const [selected, setSelected] = useState<string[]>(metrics.filter((m) => m.points.length).map((m) => m.key).slice(0, 3));
  const [mode, setMode] = useState<'stacked' | 'overlay'>('stacked');
  const active = metrics.filter((m) => selected.includes(m.key));

  function toggle(key: string) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  const option = useMemo<EChartsOption>(
    () => (mode === 'stacked' ? stackedOption(active) : overlayOption(active)),
    [active, mode],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {metrics.map((m) => (
          <button key={m.key} onClick={() => toggle(m.key)}
            disabled={!m.points.length}
            className={`rounded-full border px-3 py-1 text-xs ${selected.includes(m.key) ? 'border-transparent text-white' : 'border-neutral-300 text-neutral-500 dark:border-neutral-700'} disabled:opacity-40`}
            style={selected.includes(m.key) ? { backgroundColor: m.color } : undefined}>
            {m.label}{m.points.length ? '' : ' (no data)'}
          </button>
        ))}
        <span className="ml-auto" />
        <div className="flex rounded border border-neutral-300 text-xs dark:border-neutral-700">
          {(['stacked', 'overlay'] as const).map((mo) => (
            <button key={mo} onClick={() => setMode(mo)}
              className={`px-3 py-1 ${mode === mo ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}>
              {mo === 'stacked' ? 'Stacked' : 'Overlay'}
            </button>
          ))}
        </div>
      </div>
      {active.length === 0
        ? <div className="flex h-64 items-center justify-center text-sm text-neutral-500">Select at least one metric.</div>
        : (
          <div style={{ height: mode === 'stacked' ? active.length * 150 + 60 : 360 }}>
            <EChart key={mode} option={option} className="h-full w-full" />
          </div>
        )}
    </div>
  );
}

function overlayOption(active: Metric[]): EChartsOption {
  return {
    grid: { top: 30, right: 50, bottom: 64, left: 50 },
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    xAxis: { type: 'time', axisLabel: { hideOverlap: true, fontSize: 10 } },
    yAxis: active.map((m, i) => ({
      type: 'value', name: m.unit, position: i % 2 ? 'right' : 'left',
      offset: Math.floor(i / 2) * 40, scale: true, splitNumber: 4,
      axisLine: { lineStyle: { color: m.color } }, axisLabel: { fontSize: 10 },
    })),
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 18 }],
    series: active.map((m, i) => ({
      type: 'line', name: m.label, yAxisIndex: i, showSymbol: false,
      itemStyle: { color: m.color }, data: m.points.map((p) => [p.t, p.v]),
    })),
  };
}

function stackedOption(active: Metric[]): EChartsOption {
  const rows = active.length;
  const laneH = 110;
  const top = 30, gap = 40;
  return {
    tooltip: { trigger: 'axis' },
    axisPointer: { link: [{ xAxisIndex: 'all' }] },
    grid: active.map((_, i) => ({ left: 52, right: 20, top: top + i * (laneH + gap), height: laneH })),
    xAxis: active.map((_, i) => ({
      type: 'time', gridIndex: i,
      axisLabel: { show: i === rows - 1, hideOverlap: true, fontSize: 10 },
    })),
    yAxis: active.map((m, i) => ({
      type: 'value', gridIndex: i, scale: true, splitNumber: 3,
      name: `${m.label} (${m.unit})`, nameGap: 8,
      nameTextStyle: { fontSize: 10, color: '#9aa6ba', align: 'left' },
      axisLabel: { fontSize: 10 },
    })),
    dataZoom: [
      { type: 'inside', xAxisIndex: active.map((_, i) => i) },
      { type: 'slider', xAxisIndex: active.map((_, i) => i), height: 16, bottom: 8 },
    ],
    series: active.map((m, i) => ({
      type: 'line', name: m.label, xAxisIndex: i, yAxisIndex: i, showSymbol: false,
      itemStyle: { color: m.color }, data: m.points.map((p) => [p.t, p.v]),
    })),
  };
}
