'use client';
import type { AttemptResult, SessionStatus, TranscriptLine } from '@/lib/contracts';
import type { Alert, PatientCard } from '@/lib/dashboard/state';
import { adherence, recentAvgEffortDb } from '@/lib/vocal-metrics/history';

export const STATUS_UI: Record<SessionStatus, { label: string; dot: string; banner: string; text: string; order: number }> = {
  REVIEW: { label: 'Revisar com a fono', dot: 'bg-red-500', banner: 'bg-red-950 border-red-500', text: 'text-red-300', order: 0 },
  BELOW_TARGET: { label: 'Abaixo da meta', dot: 'bg-yellow-400', banner: 'bg-yellow-950 border-yellow-400', text: 'text-yellow-300', order: 1 },
  ON_TARGET: { label: 'Na meta', dot: 'bg-green-400', banner: 'bg-green-950 border-green-500', text: 'text-green-300', order: 2 },
};

const fmtDb = (db: number | null | undefined) => (db === null || db === undefined ? '—' : `${db >= 0 ? '+' : ''}${db.toFixed(1).replace('.', ',')} dB`);
const fmtS = (ms: number | null | undefined) => (ms === null || ms === undefined ? '—' : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);

export function PatientList({
  patients,
  selectedId,
  onSelect,
}: {
  patients: PatientCard[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {patients.map((p) => {
        const ui = STATUS_UI[p.status];
        const live = p.live && !p.live.final;
        return (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                p.id === selectedId ? 'border-sky-400 bg-slate-800' : 'border-slate-800 bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`h-4 w-4 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
                <span className="text-lg font-semibold">{p.name}</span>
                {live && <span className="ml-auto animate-pulse rounded bg-sky-600 px-2 text-sm font-bold">AO VIVO</span>}
              </div>
              <div className="ml-7 text-base text-slate-400">
                {p.age} anos · {p.condition}
              </div>
              <div className={`ml-7 text-base ${ui.text}`}>{ui.label}</div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-900 p-4">
      <div className="text-base text-slate-400">{label}</div>
      <div className={`text-3xl font-bold ${tone ?? ''}`}>{value}</div>
      {hint && <div className="text-sm text-slate-500">{hint}</div>}
    </div>
  );
}

export function PatientSummary({ patient: p }: { patient: PatientCard }) {
  const ui = STATUS_UI[p.status];
  const adh = adherence(p.history);
  const avg = recentAvgEffortDb(p.history);
  const target = p.protocol.target_effort_db;
  const todayEffort = p.today?.effortDb ?? null;
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border-2 p-5 ${ui.banner}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-3xl font-bold">
            {p.name} <span className="text-xl font-normal text-slate-300">({p.age} anos)</span>
          </h2>
          <span className={`text-2xl font-bold ${ui.text}`}>{ui.label}</span>
        </div>
        <p className="mt-1 text-lg text-slate-300">
          {p.condition}
          {p.expansion && <span className="ml-2 rounded bg-violet-800 px-2 text-sm">expansão pós-AVC</span>}
        </p>
        {p.reasons.length > 0 && (
          <ul className="mt-2 list-disc pl-6 text-lg text-slate-200">
            {p.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Esforço hoje"
          value={fmtDb(todayEffort)}
          hint={`meta ${fmtDb(target)}`}
          tone={todayEffort === null ? undefined : todayEffort >= target ? 'text-green-400' : 'text-yellow-300'}
        />
        <Kpi label="Média 7 treinos" value={fmtDb(avg)} hint="acima da voz habitual" />
        <Kpi label='Melhor "Aaa" hoje' value={fmtS(p.today?.sustainMs)} hint={`meta ${fmtS(p.protocol.sustain.target_duration_ms)}`} />
        <Kpi
          label="Adesão (14 dias)"
          value={`${adh.practiced}/${adh.total}`}
          tone={adh.practiced / adh.total >= 0.8 ? 'text-green-400' : 'text-yellow-300'}
        />
      </div>
    </div>
  );
}

function AttemptRow({ a }: { a: AttemptResult }) {
  const max = Math.max(a.target_effort_db * 2, 12);
  const pct = (db: number) => `${Math.min(100, Math.max(0, (db / max) * 100))}%`;
  const label = a.kind === 'sustain' ? `"Aaa" #${a.attempt}` : `Frase ${a.exercise_id.split('-')[1]}${a.attempt > 1 ? ` (#${a.attempt})` : ''}`;
  return (
    <li className="grid grid-cols-[7rem_1fr_7rem] items-center gap-3">
      <span className="text-base font-semibold">{label}</span>
      <div className="relative h-6 rounded bg-slate-800" title={a.phrase}>
        {!a.no_attempt && (
          <div className={`h-6 rounded ${a.met_target ? 'bg-green-500' : 'bg-yellow-400'}`} style={{ width: pct(Math.max(0, a.effort_db ?? 0)) }} />
        )}
        <div className="absolute inset-y-0 border-l-2 border-dashed border-green-300" style={{ left: pct(a.target_effort_db) }} />
      </div>
      <span className={`text-base ${a.no_attempt ? 'text-slate-400' : a.met_target ? 'text-green-300' : 'text-yellow-300'}`}>
        {a.no_attempt ? 'sem tentativa' : `${fmtDb(a.effort_db)}${a.kind === 'sustain' ? ` · ${fmtS(a.duration_ms)}` : ''}`}
      </span>
    </li>
  );
}

export function LiveSession({ patient: p }: { patient: PatientCard }) {
  const live = p.live;
  if (!live) return <p className="text-lg text-slate-500">Nenhuma sessão hoje ainda.</p>;
  return (
    <div className="space-y-3">
      <p className="text-base text-slate-400">
        {live.final ? 'Sessão concluída' : 'Sessão em andamento'} · início por {live.trigger === 'VOICE_COMMAND' ? 'comando de voz' : 'botão'} · voz
        habitual {live.habitualDb !== null ? `${live.habitualDb.toFixed(1)} dBFS` : '—'}
      </p>
      <ul className="space-y-2" aria-live="polite">
        {live.attempts.map((a, i) => (
          <AttemptRow key={`${a.exercise_id}-${a.attempt}-${i}`} a={a} />
        ))}
      </ul>
      {p.symptoms.length > 0 && <p className="rounded-lg bg-red-950 px-3 py-2 text-lg text-red-200">Relato na conversa: {p.symptoms.join(', ')}</p>}
    </div>
  );
}

export function TranscriptPanel({ lines }: { lines: TranscriptLine[] }) {
  return (
    <div className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto" aria-live="polite">
      {lines.length === 0 && <p className="text-lg text-slate-500">Sem conversa em andamento.</p>}
      {lines.map((l) => (
        <div
          key={`${l.session_id}-${l.turn_id}-${l.speaker}`}
          className={`rounded-lg px-3 py-2 text-lg ${l.speaker === 'AGENT' ? 'bg-slate-800' : 'bg-sky-950'} ${l.final ? '' : 'opacity-70'}`}
        >
          <span className="mr-2 text-sm font-bold uppercase text-slate-400">{l.speaker === 'AGENT' ? 'Gabriel' : 'Paciente'}</span>
          {l.text}
        </div>
      ))}
    </div>
  );
}

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return <p className="text-lg text-slate-500">Nenhum alerta.</p>;
  return (
    <ul className="space-y-2">
      {alerts.map((a, i) => (
        <li key={i} className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-base">
          <strong>{new Date(a.at).toLocaleTimeString('pt-BR')}</strong> · {a.patientName}: {a.message}
        </li>
      ))}
    </ul>
  );
}
