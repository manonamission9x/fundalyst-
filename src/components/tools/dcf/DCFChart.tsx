'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { ProjectedYear } from '@/types/financial';
import { CHART_COLORS, chartGrid, axisTick, tooltipStyle, fmtINR } from '@/lib/chart-theme';

interface DCFChartProps {
  projected: ProjectedYear[];
  tv: number;
  pvTv: number;
  /** Current market price for reference line */
  currentPrice?: number;
}

export default function DCFChart({ projected, tv, pvTv, currentPrice }: DCFChartProps) {
  const data = [
    ...projected.map((p) => ({
      name: 'Yr ' + p.year,
      fcf: Math.round(p.fcf),
      pv: Math.round(p.pv),
      isTerminal: false,
    })),
    { name: 'Terminal', fcf: Math.round(tv), pv: Math.round(pvTv), isTerminal: true },
  ];

  const maxVal = Math.max(...data.map((d) => d.fcf));
  const yMax = Math.ceil(maxVal * 1.15 / 10000) * 10000;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          domain={[0, yMax]}
          tickFormatter={(v: number) => fmtINR(v)}
        />

        {/* Current price reference line */}
        {currentPrice && (
          <ReferenceLine
            y={currentPrice}
            stroke={CHART_COLORS.red}
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: 'Price: ' + fmtINR(currentPrice),
              fill: CHART_COLORS.red,
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              position: 'right',
            }}
          />
        )}

        <Tooltip
          {...tooltipStyle}
          formatter={(value: any, name: any) => [fmtINR(value), name === 'fcf' ? 'Projected FCF' : 'PV of FCF']}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#9597A8' }}
          iconType="rect"
          iconSize={10}
          formatter={(value: string) => (value === 'fcf' ? 'Projected FCF' : 'PV of FCF')}
        />

        <Bar dataKey="fcf" name="fcf" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isTerminal ? CHART_COLORS.amber : CHART_COLORS.primary}
              fillOpacity={entry.isTerminal ? 0.7 : 0.9}
            />
          ))}
        </Bar>
        <Bar dataKey="pv" name="pv" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isTerminal ? CHART_COLORS.amber : CHART_COLORS.green}
              fillOpacity={entry.isTerminal ? 0.5 : 0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
