'use client';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PatientCard } from '@/lib/dashboard/state';

interface Point {
  label: string;
  effort: number | null;
  today: number | null;
  sustainS: number | null;
  missed: number | null;
}

/** 14-day simulated history + today's live session: effort (dB above habitual) and best "Aaa" (s). */
export function EffortChart({ patient }: { patient: PatientCard }) {
  const target = patient.protocol.target_effort_db;
  const data: Point[] = patient.history.map((d) => ({
    label: d.date.slice(8, 10) + '/' + d.date.slice(5, 7),
    effort: d.effortDb,
    today: null,
    sustainS: d.sustainMs !== null ? d.sustainMs / 1000 : null,
    missed: d.practiced ? null : 0.4,
  }));
  if (patient.today?.effortDb != null) {
    const last = [...data].reverse().find((p) => p.effort !== null);
    if (last) last.today = last.effort; // dashed segment from the last practiced day
    data.push({
      label: 'Hoje',
      effort: null,
      today: patient.today.effortDb,
      sustainS: patient.today.sustainMs !== null ? patient.today.sustainMs / 1000 : null,
      missed: null,
    });
  }
  const maxEffort = Math.max(target + 4, ...data.map((d) => Math.max(d.effort ?? 0, d.today ?? 0)));
  const maxSustain = Math.max(patient.protocol.sustain.target_duration_ms / 1000 + 4, ...data.map((d) => d.sustainS ?? 0));

  return (
    <div className="h-72 w-full" aria-label="Esforço vocal e tempo de Aaa nos últimos 14 dias">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 13 }} />
          <YAxis
            yAxisId="db"
            stroke="#38bdf8"
            tick={{ fontSize: 13 }}
            domain={[0, Math.ceil(maxEffort)]}
            tickFormatter={(v: number) => `+${v} dB`}
          />
          <YAxis
            yAxisId="s"
            orientation="right"
            stroke="#a78bfa"
            tick={{ fontSize: 13 }}
            domain={[0, Math.ceil(maxSustain)]}
            tickFormatter={(v: number) => `${v}s`}
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 15 }}
            formatter={(v, name) =>
              name === 'missed'
                ? ['sem treino', 'Dia']
                : name === 'sustainS'
                  ? [`${Number(v).toFixed(1)} s`, 'Melhor "Aaa"']
                  : [`+${Number(v).toFixed(1)} dB`, name === 'today' ? 'Hoje (ao vivo)' : 'Esforço']
            }
          />
          <ReferenceLine
            yAxisId="db"
            y={target}
            stroke="#4ade80"
            strokeDasharray="6 4"
            label={{ value: `meta +${target} dB`, fill: '#4ade80', fontSize: 13, position: 'insideTopLeft' }}
          />
          <Bar yAxisId="s" dataKey="sustainS" fill="#a78bfa" fillOpacity={0.35} barSize={14} isAnimationActive={false} />
          <Bar yAxisId="db" dataKey="missed" fill="#f87171" barSize={14} isAnimationActive={false} />
          <Line yAxisId="db" type="monotone" dataKey="effort" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          <Line
            yAxisId="db"
            type="monotone"
            dataKey="today"
            stroke={patient.status === 'ON_TARGET' ? '#4ade80' : patient.status === 'REVIEW' ? '#f87171' : '#facc15'}
            strokeWidth={3}
            strokeDasharray="6 4"
            dot={{ r: 7 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="mt-1 text-sm text-slate-400">
        <span className="text-sky-400">━ esforço (dB acima da voz habitual)</span> ·{' '}
        <span className="text-violet-400">▮ melhor &quot;Aaa&quot; (s)</span> · <span className="text-red-400">▮ dia sem treino</span> · dB relativo, não
        calibrado
      </p>
    </div>
  );
}
