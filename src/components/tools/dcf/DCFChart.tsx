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
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        barCategoryGap="32%"
        margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
      >
        <CartesianGrid {...chartGrid} vertical={false} />
        <XAxis
          dataKey="name"
          tick={axisTick}
          axisLine={{ stroke: CHART_COLORS.grid, strokeOpacity: 0.5 }}
          tickLine={false}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          domain={[0, yMax]}
          tickFormatter={(v: number) => fmtINR(v)}
          width={70}
        />

        {currentPrice && (
          <ReferenceLine
            y={currentPrice}
            stroke={CHART_COLORS.red}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: 'Mkt Price: ' + fmtINR(currentPrice),
              fill: CHART_COLORS.red,
              fontSize: 10,
              fontFamily: 'IBM Plex Mono, monospace',
              position: 'insideTopRight',
            }}
          />
        )}

        <Tooltip
          {...tooltipStyle}
          formatter={(value: any, name: any) => [
            fmtINR(value),
            name === 'fcf' ? 'Projected FCF' : 'PV of FCF',
          ]}
          labelFormatter={(label: any) => `Period: ${label}`}
        />
        <Legend
          wrapperStyle={{
            fontSize: 11,
            fontFamily: 'IBM Plex Sans, sans-serif',
            color: CHART_COLORS.textSecondary,
            paddingTop: 8,
          }}
          iconType="rect"
          iconSize={10}
          formatter={(value: string) => (value === 'fcf' ? 'Projected FCF' : 'Present Value')}
        />

        <Bar
          dataKey="fcf"
          name="fcf"
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isTerminal ? CHART_COLORS.amber : CHART_COLORS.primary}
              fillOpacity={entry.isTerminal ? 0.7 : 0.9}
            />
          ))}
        </Bar>
        <Bar
          dataKey="pv"
          name="pv"
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          animationDuration={800}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.isTerminal ? CHART_COLORS.amberLight : CHART_COLORS.green}
              fillOpacity={entry.isTerminal ? 0.5 : 0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
