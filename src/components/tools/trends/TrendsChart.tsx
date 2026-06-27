'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendRow } from '@/types/financial';
import { SERIES_COLORS, chartGrid, axisTick, tooltipStyle, fmtINR } from '@/lib/chart-theme';

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

  const tooltipProps = {
    ...tooltipStyle,
    formatter: (value: any, name: any) => [fmtINR(value), name] as [string, string],
    labelFormatter: (label: any) => `Period: ${label}`,
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid {...chartGrid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={axisTick}
          axisLine={{ stroke: '#2E2E32', strokeOpacity: 0.5 }}
          tickLine={false}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => fmtINR(v)}
          width={70}
        />
        <Tooltip {...tooltipProps} />

        {rows.map((r, i) => {
          const color = SERIES_COLORS[i % SERIES_COLORS.length];
          const isPrimary = i === 0;
          return (
            <Line
              key={r.label}
              type="monotone"
              dataKey={r.label}
              stroke={color}
              strokeWidth={isPrimary ? 2 : 1.5}
              dot={isPrimary ? { r: 3, fill: color, strokeWidth: 0, stroke: color } : false}
              activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#141416' }}
              strokeOpacity={isPrimary ? 1 : 0.6}
              isAnimationActive={false}
              connectNulls
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );
}
