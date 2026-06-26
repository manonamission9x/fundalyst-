'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TrendRow } from '@/types/financial';
import { SERIES_COLORS, chartGrid, axisTick, tooltipStyle as baseTooltip, fmtINR } from '@/lib/chart-theme';

interface TrendsChartProps {
  rows: TrendRow[];
  headers: string[];
}

export default function TrendsChart({ rows, headers }: TrendsChartProps) {
  const labels = headers.slice(1);

  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    rows.forEach((r) => {
      point[r.label] = r.vals[i] ?? 0;
    });
    return point;
  });

  // Custom tooltip with financial formatting
  const tooltipProps = {
    ...baseTooltip,
    formatter: (value: any, name: any) => [fmtINR(value), name] as [string, string],
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGrid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={axisTick}
          axisLine={{ stroke: '#2A2D42' }}
          tickLine={false}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmtINR(v)}
        />
        <Tooltip {...tooltipProps} />
        <Legend
          wrapperStyle={{ fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif', color: '#C8C9D4', paddingTop: 8 }}
          iconType="line"
          iconSize={12}
        />

        {rows.map((r, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const isPrimary = i === 0;
          return (
            <Line
              key={r.label}
              type="monotone"
              dataKey={r.label}
              stroke={color}
              strokeWidth={isPrimary ? 2.5 : 1.5}
              dot={isPrimary ? { r: 4, fill: color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
              strokeOpacity={isPrimary ? 1 : 0.7}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
