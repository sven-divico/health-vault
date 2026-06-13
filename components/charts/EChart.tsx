'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
// @ts-expect-error — echarts locale bundle has no type declarations. The `-obj`
// variant exports the plain locale object (the bare `langDE` self-registers onto a
// possibly-different echarts instance, so we register the object ourselves).
import langDE from 'echarts/i18n/langDE-obj';

echarts.registerLocale('DE', langDE);

export function EChart({ option, className }: { option: echarts.EChartsOption; className?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = echarts.init(elRef.current, undefined, { locale: 'DE' });
    chartRef.current = chart;
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => { ro.disconnect(); chart.dispose(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={elRef} className={className ?? 'h-64 w-full'} />;
}
