'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import type { ProjectedYear } from '@/types/financial';
import { getChartColors, getChartGrid, getAxisTick, getTooltipStyle, fmtINR } from '@/lib/chart-theme';

interface DCFChartProps {
  projected: ProjectedYear[];
  tv: number;
  pvTv: number;
  currentPrice?: number;
}

export default function DCFChart({ projected, tv, pvTv, currentPrice }: DCFChartProps) {
  const COLORS = getChartColors();
  const grid = getChartGrid();
  const tick = getAxisTick();
  const tooltip = getTooltipStyle();

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
    <div style={{ fontFamily: 'var(--font-ibm-plex-mono)' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: COLORS.text,
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
            domain={[0, yMax]}
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

          {currentPrice && (
            <ReferenceLine
              y={currentPrice}
              stroke={COLORS.red}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: 'Mkt: ' + fmtINR(currentPrice),
                fill: COLORS.red,
                fontSize: 10,
                fontFamily: 'var(--font-ibm-plex-mono)',
                position: 'insideTopRight',
              }}
            />
          )}

          <Tooltip
            {...tooltip}
            formatter={(value: unknown, name: unknown) => [
              fmtINR(Number(value)),
              name === 'fcf' ? 'Projected FCF' : 'PV of FCF',
            ] as [string, string]}
            labelFormatter={(_label: unknown) => `Period: ${_label}` as string}
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
                fill={entry.isTerminal ? COLORS.amber : COLORS.primary}
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
                fill={entry.isTerminal ? COLORS.amberLight : COLORS.green}
                fillOpacity={entry.isTerminal ? 0.45 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
