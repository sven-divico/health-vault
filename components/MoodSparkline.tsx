'use client';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';

export function MoodSparkline({ data }: { data: { t: number; v: number }[] }) {
  if (data.length === 0) return <span className="text-sm text-neutral-500">no data</span>;
  return (
    <div className="h-16 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis hide domain={[1, 5]} />
          <Line type="monotone" dataKey="v" stroke="currentColor" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
