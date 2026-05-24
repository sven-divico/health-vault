'use client';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Series { t: number; v: number }

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString();
}

export function MeasureCharts({ weight, mood }: { weight: Series[]; mood: Series[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartCard title="Weight (kg)" data={weight} domain={['auto', 'auto']} />
      <ChartCard title="Mood (1-5)" data={mood} domain={[1, 5]} />
    </div>
  );
}

function ChartCard({ title, data, domain }: { title: string; data: Series[]; domain: [number | string, number | string] }) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">No data yet.</div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="t" tickFormatter={fmt} fontSize={11} />
              <YAxis domain={domain} fontSize={11} />
              <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString()} />
              <Line type="monotone" dataKey="v" stroke="currentColor" dot={{ r: 2 }} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
