'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ProjectedYear } from '@/types/financial';
import { getChartColors, getChartGrid, getAxisTick, getTooltipStyle, inkWeight, fmtINR } from '@/lib/chart-theme';

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
              stroke={COLORS.textSecondary}
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: 'Mkt: ' + fmtINR(currentPrice),
                fill: COLORS.textSecondary,
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
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

          {/* Same unit (INR Cr), part-to-whole -> ink-weight, not categorical color (§4).
              FCF = weight 100, PV of FCF = weight 60. Terminal is just another
              period here, not a special caution-colored bar. */}
          <Bar
            dataKey="fcf"
            name="fcf"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
            fill={inkWeight(100).fill}
            fillOpacity={inkWeight(100).fillOpacity}
          />
          <Bar
            dataKey="pv"
            name="pv"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
            fill={inkWeight(60).fill}
            fillOpacity={inkWeight(60).fillOpacity}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
