'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendRow } from '@/types/financial';
import { CHART_COLORS, SERIES_COLORS, chartGrid, axisTick, tooltipStyle, fmtINR } from '@/lib/chart-theme';

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

  return (
    <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: CHART_COLORS.text,
          letterSpacing: '0.02em',
          paddingBottom: 4,
        }}
      >
        {headers[0] ?? 'Financial Trends'}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...chartGrid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={axisTick}
            axisLine={{ stroke: CHART_COLORS.grid, strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <YAxis
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtINR(v)}
            width={60}
            label={{
              value: '₹ Cr',
              position: 'insideTopLeft',
              offset: -10,
              fill: CHART_COLORS.textMuted,
              fontSize: 9,
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          />
          <Tooltip
            contentStyle={tooltipStyle.contentStyle}
            labelStyle={tooltipStyle.labelStyle}
            itemStyle={tooltipStyle.itemStyle}
            formatter={(value: unknown, name: unknown) => [fmtINR(Number(value)), String(name)] as [string, string]}
            labelFormatter={(_label: unknown) => `Period: ${_label}` as string}
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
                strokeWidth={isPrimary ? 1.5 : 1}
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
    </div>
  );
}
