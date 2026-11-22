'use client';

/**
 * /clinica — Central do Fonoaudiólogo e Clínica (B2B).
 *
 * O fonoaudiólogo é o DONO do protocolo: edita as 3 frases do dia e a meta de
 * esforço relativo, e sincroniza instantaneamente com /paciente via
 * sessionBridge. Também monitora a sessão ao vivo e a evolução de 14 dias.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  CircleDot,
  Clock,
  Save,
  TrendingUp,
  Users,
} from 'lucide-react';

import { ProjectionMeter } from '@/components/vozativa/ProjectionMeter';
import { ProgressChart } from '@/components/vozativa/ProgressChart';
import { useVozativaBridge } from '@/hooks/use-vozativa-bridge';
import {
  MOCK_PATIENTS,
  PRIMARY_PATIENT_ID,
  TARGET_OPTIONS,
  buildFourteenDayHistory,
} from '@/lib/vozativa-data';
import { cn } from '@/lib/utils';
import type {
  DailyProgressPoint,
  ProtocolConfig,
  SessionStatus,
} from '@/types/vozativa';

const STATUS_LABEL: Record<SessionStatus, string> = {
  idle: 'Aguardando início',
  calibrating_baseline: 'Calibrando tom normal',
  active: 'Em exercício',
  completed: 'Sessão concluída',
};

export default function ClinicaPage() {
  const { ready, protocol, sessionState, publishProtocol } = useVozativaBridge();

  const [selectedPatient, setSelectedPatient] = useState(PRIMARY_PATIENT_ID);

  // Rascunho local do protocolo (só sincroniza ao salvar).
  const [draftPhrases, setDraftPhrases] = useState<string[]>([]);
  const [draftTarget, setDraftTarget] = useState<number>(protocol.targetMultiplier);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Mantém o rascunho alinhado ao protocolo quando ele chega/é recuperado.
  useEffect(() => {
    setDraftPhrases(protocol.phrases.map((p) => p.text));
    setDraftTarget(protocol.targetMultiplier);
  }, [protocol]);

  const history = useMemo(() => buildFourteenDayHistory(), []);

  // Gráfico: injeta o ponto do dia quando a sessão conclui.
  const chartPoints: DailyProgressPoint[] = useMemo(() => {
    if (sessionState.status !== 'completed' || sessionState.results.length === 0) {
      return history;
    }
    const avg =
      sessionState.results.reduce((s, r) => s + r.achievedMultiplier, 0) /
      sessionState.results.length;
    const copy = [...history];
    copy[copy.length - 1] = {
      ...copy[copy.length - 1],
      avgMultiplier: Number(avg.toFixed(2)),
      completed: true,
    };
    return copy;
  }, [history, sessionState]);

  const handleSave = () => {
    const next: ProtocolConfig = {
      patientId: PRIMARY_PATIENT_ID,
      targetMultiplier: draftTarget,
      phrases: protocol.phrases.map((p, i) => ({
        ...p,
        text: draftPhrases[i] ?? p.text,
      })),
      updatedAt: new Date().toISOString(),
    };
    publishProtocol(next);
    setSavedAt(new Date().toLocaleTimeString('pt-BR'));
  };

  const activePatient =
    MOCK_PATIENTS.find((p) => p.id === selectedPatient) ?? MOCK_PATIENTS[0];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 lg:flex-row">
        {/* Sidebar de pacientes */}
        <aside className="lg:w-72 lg:flex-shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4" aria-hidden />
              Pacientes
            </h2>
            <ul className="space-y-2">
              {MOCK_PATIENTS.map((p) => {
                const selected = p.id === selectedPatient;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(p.id)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        selected
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">
                          {p.name}
                        </span>
                        {p.online && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CircleDot className="h-3 w-3" aria-hidden />
                            em treino
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.age} anos · {p.condition}
                      </p>
                      <AdherenceBadge value={p.adherence} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Conteúdo principal */}
        <div className="flex-1 space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-slate-900">
              {activePatient.name}
            </h1>
            <p className="text-sm text-slate-500">
              {activePatient.age} anos · {activePatient.condition}
            </p>
          </header>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              icon={<CalendarCheck className="h-5 w-5" />}
              title="Adesão Domiciliar (14 dias)"
              value="92%"
              hint="13 de 14 dias concluídos"
            />
            <KpiCard
              icon={<TrendingUp className="h-5 w-5" />}
              title="Projeção Relativa Média"
              value="1.38x"
              hint="+38% de esforço vocal sustentado"
            />
            <KpiCard
              icon={<Clock className="h-5 w-5" />}
              title="Tempo Clínico Otimizado"
              value="100%"
              hint="Treinos entre consultas registrados"
            />
          </div>

          {/* Protocolo prescrito (interativo) */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Protocolo Prescrito
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Você é o dono do protocolo. Edite as 3 frases do dia e a meta de
              esforço relativo do paciente.
            </p>

            <div className="space-y-3">
              {protocol.phrases.map((p, i) => (
                <div key={p.id}>
                  <label
                    htmlFor={`phrase-${p.id}`}
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Exercício {p.id} · {p.label}
                  </label>
                  <input
                    id={`phrase-${p.id}`}
                    type="text"
                    value={draftPhrases[i] ?? ''}
                    onChange={(e) =>
                      setDraftPhrases((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
              ))}
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Meta de Esforço Relativo
              </legend>
              <div className="flex flex-wrap gap-2">
                {TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftTarget(opt.value)}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      draftTarget === opt.value
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
                    )}
                    aria-pressed={draftTarget === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!ready}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden />
                Salvar e Sincronizar com Paciente
              </button>
              {savedAt && (
                <span className="text-sm text-emerald-600">
                  Sincronizado às {savedAt}
                </span>
              )}
            </div>
          </section>

          {/* Monitor ao vivo */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Activity className="h-5 w-5 text-teal-600" aria-hidden />
                Monitor Ao Vivo da Sessão
              </h2>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  sessionState.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700'
                    : sessionState.status === 'completed'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-slate-100 text-slate-600',
                )}
              >
                {STATUS_LABEL[sessionState.status]}
              </span>
            </div>

            {(sessionState.status === 'active' ||
              sessionState.status === 'completed') && (
              <div className="mb-5 max-w-md">
                <ProjectionMeter
                  liveMultiplier={sessionState.liveMultiplier}
                  targetMultiplier={protocol.targetMultiplier}
                  variant="clinic"
                />
              </div>
            )}

            {/* Cards dos 3 exercícios */}
            <div className="grid gap-3 md:grid-cols-3">
              {protocol.phrases.map((phrase, i) => {
                const result = sessionState.results.find(
                  (r) => r.exerciseId === phrase.id,
                );
                const isCurrent =
                  sessionState.status === 'active' &&
                  sessionState.currentExerciseIndex === i;
                return (
                  <div
                    key={phrase.id}
                    className={cn(
                      'rounded-lg border p-3',
                      isCurrent
                        ? 'border-teal-400 bg-teal-50/60 ring-1 ring-teal-300'
                        : 'border-slate-200 bg-slate-50',
                    )}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Exercício {phrase.id}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-800">
                      {phrase.text}
                    </p>
                    {result ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {result.achievedMultiplier.toFixed(2)}x /{' '}
                          {result.targetMultiplier.toFixed(2)}x
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.attempts}{' '}
                          {result.attempts === 1 ? 'tentativa' : 'tentativas'}
                        </p>
                        <span
                          className={cn(
                            'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                            result.hitTarget
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700',
                          )}
                        >
                          {result.hitTarget ? 'Meta Atingida' : 'Abaixo da Meta'}
                        </span>
                        {result.transcript && (
                          <p className="mt-1 text-xs italic text-slate-400">
                            “{result.transcript}”
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-400">
                        {isCurrent ? 'Em andamento…' : 'Aguardando'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gráfico longitudinal */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Evolução de 14 dias — esforço vocal relativo
            </h2>
            <ProgressChart
              points={chartPoints}
              targetMultiplier={protocol.targetMultiplier}
            />
          </section>

          {/* Rodapé clínico */}
          <footer className="pt-2 text-xs leading-relaxed text-slate-400">
            VozAtiva — Apoio à prática fonoaudiológica domiciliar. Protocolo
            definido exclusivamente pelo profissional habilitado. Não realiza
            diagnóstico médico.
          </footer>
        </div>
      </div>
    </main>
  );
}

function KpiCard({
  icon,
  title,
  value,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-teal-600">{icon}</div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function AdherenceBadge({ value }: { value: number }) {
  const tone =
    value >= 85
      ? 'bg-emerald-100 text-emerald-700'
      : value >= 70
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';
  return (
    <span
      className={cn(
        'mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
        tone,
      )}
    >
      Adesão {value}%
    </span>
  );
}
