'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TrendRow } from '@/types/financial';

interface TrendsChartProps {
  rows: TrendRow[];
  headers: string[];
}

const COLORS = ['#4F6EF7', '#34A86C', '#CBA344', '#E5484D', '#8B5CF6'];

export default function TrendsChart({ rows, headers }: TrendsChartProps) {
  const labels = headers.slice(1);

  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    rows.forEach((r) => {
      point[r.label] = r.vals[i] ?? 0;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid stroke="#2A2D3E33" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: '#74768A', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }} />
        <YAxis
          tick={{ fill: '#74768A', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}
          tickFormatter={(v: number) => '₹' + v.toLocaleString('en-IN')}
        />
        <Tooltip
          contentStyle={{ background: '#1C1E2A', border: '1px solid #2A2D3E', borderRadius: 4 }}
          labelStyle={{ color: '#F0EFEA', fontWeight: 600, fontSize: 12 }}
          itemStyle={{ color: '#D0D1DC', fontSize: 12 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans', color: '#D0D1DC' }}
          iconType="line"
          iconSize={12}
        />
        {rows.map((r, i) => (
          <Line
            key={r.label}
            type="monotone"
            dataKey={r.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS[i % COLORS.length] }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
