'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
        DCF Projection · FCF vs PV of FCF
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          barCategoryGap="28%"
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
            domain={[0, yMax]}
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

          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke={CHART_COLORS.red}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: 'Mkt: ' + fmtINR(currentPrice),
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

          <Bar
            dataKey="fcf"
            name="fcf"
            radius={[2, 2, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isTerminal ? CHART_COLORS.amber : CHART_COLORS.primary}
                fillOpacity={entry.isTerminal ? 0.65 : 0.85}
              />
            ))}
          </Bar>
          <Bar
            dataKey="pv"
            name="pv"
            radius={[2, 2, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isTerminal ? CHART_COLORS.amberLight : CHART_COLORS.green}
                fillOpacity={entry.isTerminal ? 0.45 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
