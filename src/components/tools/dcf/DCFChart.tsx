'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectedYear } from '@/types/financial';

interface DCFChartProps {
  projected: ProjectedYear[];
  tv: number;
  pvTv: number;
}

export default function DCFChart({ projected, tv, pvTv }: DCFChartProps) {
  const data = [
    ...projected.map((p) => ({
      name: 'Yr ' + p.year,
      'Projected FCF': Math.round(p.fcf),
      'PV of FCF': Math.round(p.pv),
    })),
    { name: 'Terminal', 'Projected FCF': Math.round(tv), 'PV of FCF': Math.round(pvTv) },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barCategoryGap="30%">
        <CartesianGrid stroke="#242632" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: '#74768A', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }} />
        <YAxis tick={{ fill: '#74768A', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#111217', border: '1px solid #242632', borderRadius: 4, fontSize: 12 }}
          labelStyle={{ color: '#F0EFEA', fontFamily: 'IBM Plex Mono, monospace' }}
          itemStyle={{ color: '#F0EFEA' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: '#A8AAB8' }}
          iconType="rect"
          iconSize={10}
        />
        <Bar dataKey="Projected FCF" fill="#4F6EF7" radius={[3, 3, 0, 0]} />
        <Bar dataKey="PV of FCF" fill="#34A86C" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
