'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrendRow } from '@/types/financial';
import { ChartState } from '@/components/ui';
import { getChartColors, getSeriesColors, getChartGrid, getAxisTick, getTooltipStyle, fmtINR } from '@/lib/chart-theme';

interface TrendsChartProps {
  rows: TrendRow[];
  headers: string[];
}

export default function TrendsChart({ rows, headers }: TrendsChartProps) {
  const COLORS = getChartColors();
  const series = getSeriesColors();
  const grid = getChartGrid();
  const tick = getAxisTick();
  const tooltip = getTooltipStyle();

  const labels = headers.slice(1);

  if (!rows.length || !labels.length) {
    return (
      <ChartState
        state="empty"
        title="Trend chart"
        desc="Add period labels and at least one metric to plot trends."
      />
    );
  }

  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    rows.forEach((r) => {
      point[r.label] = r.vals[i] ?? 0;
    });
    return point;
  });

  const hasFiniteValue = data.some((point) =>
    rows.some((row) => Number.isFinite(Number(point[row.label])))
  );

  if (!hasFiniteValue) {
    return (
      <ChartState
        state="error"
        title="Trend chart unavailable"
        desc="Check the metric values and run the chart again."
      />
    );
  }

  return (
    <ChartState>
      <div className="chart-wrap">
      <div className="chart-title">
        {headers[0] ?? 'Financial Trends'}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...grid} vertical={false} />
          <XAxis
            dataKey="name"
            tick={tick}
            axisLine={{ stroke: COLORS.grid, strokeOpacity: 0.3 }}
            tickLine={false}
          />
          <YAxis
            tick={tick}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => fmtINR(v)}
            width={60}
            label={{
              value: '₹ Cr',
              position: 'insideTopLeft',
              offset: -10,
              fill: COLORS.textMuted,
              fontSize: 9,
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          />
          <Tooltip
            contentStyle={tooltip.contentStyle}
            labelStyle={tooltip.labelStyle}
            itemStyle={tooltip.itemStyle}
            formatter={(value: unknown, name: unknown) => [fmtINR(Number(value)), String(name)] as [string, string]}
            labelFormatter={(_label: unknown) => `Period: ${_label}` as string}
          />

          {rows.map((r, i) => {
            const color = series[i % series.length];
            const isPrimary = i === 0;
            return (
              <Line
                key={r.label}
                type="monotone"
                dataKey={r.label}
                stroke={color}
                strokeWidth={isPrimary ? 1.5 : 1}
                dot={isPrimary ? { r: 3, fill: color, strokeWidth: 0, stroke: color } : false}
                activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: COLORS.tooltipBg }}
                strokeOpacity={isPrimary ? 1 : 0.6}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </ChartState>
  );
}
