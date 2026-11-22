'use client';

/**
 * /paciente — Hub Kiosk acessível (B2C) para o idoso com Parkinson.
 *
 * Zero-UI / anti-tremor: alto contraste, tipografia grande, botões gigantes,
 * sem menus. A lógica de sessão aqui é orquestrada localmente (simulada) e
 * publicada em tempo real para /clinica via sessionBridge. Na Etapa 2, os
 * gatilhos de áudio/fala vêm do Agora RTC/RTM; a UI permanece a mesma.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Mic,
  Radio,
  ShieldCheck,
  Volume2,
} from 'lucide-react';

import { ProjectionMeter } from '@/components/vozativa/ProjectionMeter';
import { useVozativaBridge } from '@/hooks/use-vozativa-bridge';
import { AudioMeter, levelToMultiplier } from '@/services/audioMeter';
import { BASELINE_REF, PRIMARY_PATIENT_NAME } from '@/lib/vozativa-data';
import { cn } from '@/lib/utils';
import type { SessionState, TurnResult } from '@/types/vozativa';

export default function PacientePage() {
  const { ready, protocol, sessionState, publishSessionState, resetSession } =
    useVozativaBridge();

  const [showTestBar, setShowTestBar] = useState(false);
  const meterRef = useRef<AudioMeter | null>(null);
  const stateRef = useRef<SessionState>(sessionState);

  // Preview do microfone real (antes/independente do treino).
  const [micPreview, setMicPreview] = useState<{
    status: 'off' | 'requesting' | 'live' | 'denied';
    level: number;
    multiplier: number;
  }>({ status: 'off', level: 0, multiplier: 1.0 });
  const micPreviewActiveRef = useRef(false);

  // Mantém o espelho do estado atualizado fora da renderização.
  useEffect(() => {
    stateRef.current = sessionState;
  }, [sessionState]);

  // Instancia o medidor uma vez (lado cliente).
  useEffect(() => {
    const meter = new AudioMeter({ intervalMs: 100, smoothing: 0.55 });
    meterRef.current = meter;
    const off = meter.onLevel((level) => {
      // Preview do microfone: atualiza mesmo sem sessão ativa.
      if (micPreviewActiveRef.current) {
        const m = levelToMultiplier(level, BASELINE_REF);
        setMicPreview({
          status: 'live',
          level: Number(level.toFixed(3)),
          multiplier: Number(m.toFixed(2)),
        });
        return;
      }
      const s = stateRef.current;
      if (s.status !== 'active') return;
      const multiplier = levelToMultiplier(level, BASELINE_REF);
      publishSessionState({
        ...s,
        liveRawLevel: Number(level.toFixed(3)),
        liveMultiplier: Number(multiplier.toFixed(2)),
      });
    });
    return () => {
      off();
      meter.destroy();
      meterRef.current = null;
    };
    // publishSessionState é estável (useCallback).
  }, [publishSessionState]);

  const phrases = protocol.phrases;
  const target = protocol.targetMultiplier;
  const current = sessionState.currentExerciseIndex;
  const currentPhrase = phrases[current];

  // ---- Orquestração da sessão (simulada nesta etapa) ---------------------

  const startTraining = useCallback(() => {
    // Desliga o preview do microfone, se estiver ligado.
    micPreviewActiveRef.current = false;
    setMicPreview({ status: 'off', level: 0, multiplier: 1.0 });
    meterRef.current?.startSimulator(0);
    publishSessionState({
      status: 'active',
      agentSpeaking: true,
      agentCaption: `Vamos começar. Repita comigo, com firmeza: “${phrases[0]?.text ?? ''}”`,
      currentExerciseIndex: 0,
      liveRawLevel: 0,
      liveMultiplier: 1.0,
      results: [],
    });
  }, [phrases, publishSessionState]);

  const endTraining = useCallback(() => {
    meterRef.current?.stop();
    resetSession();
  }, [resetSession]);

  /** Registra o turno atual e avança (ou conclui). */
  const commitTurn = useCallback(
    (achievedMultiplier: number, transcript: string) => {
      const s = stateRef.current;
      const phrase = phrases[s.currentExerciseIndex];
      if (!phrase) return;

      const result: TurnResult = {
        exerciseId: phrase.id,
        phraseText: phrase.text,
        rawPeak: Number((achievedMultiplier * BASELINE_REF).toFixed(3)),
        baselineRef: BASELINE_REF,
        achievedMultiplier: Number(achievedMultiplier.toFixed(2)),
        targetMultiplier: target,
        hitTarget: achievedMultiplier >= target,
        attempts: 1,
        transcript,
        timestamp: new Date().toISOString(),
      };

      const results = [...s.results, result];
      const isLast = s.currentExerciseIndex >= phrases.length - 1;

      if (isLast) {
        meterRef.current?.setSimTarget(0);
        publishSessionState({
          status: 'completed',
          agentSpeaking: true,
          agentCaption:
            'Muito bem! Você concluiu o treino de hoje. Até amanhã, Sr. ' +
            PRIMARY_PATIENT_NAME +
            '.',
          currentExerciseIndex: s.currentExerciseIndex,
          liveRawLevel: 0,
          liveMultiplier: 1.0,
          results,
        });
      } else {
        const nextIndex = s.currentExerciseIndex + 1;
        meterRef.current?.setSimTarget(0);
        publishSessionState({
          status: 'active',
          agentSpeaking: true,
          agentCaption: `Agora a próxima: “${phrases[nextIndex]?.text ?? ''}”`,
          currentExerciseIndex: nextIndex,
          liveRawLevel: 0,
          liveMultiplier: 1.0,
          results,
        });
      }
    },
    [phrases, target, publishSessionState],
  );

  // ---- Botões do "Modo Teste UI" ----------------------------------------

  const testRealMic = useCallback(async () => {
    // Liga/desliga o preview do microfone real.
    if (micPreviewActiveRef.current) {
      micPreviewActiveRef.current = false;
      meterRef.current?.stop();
      setMicPreview({ status: 'off', level: 0, multiplier: 1.0 });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicPreview({ status: 'denied', level: 0, multiplier: 1.0 });
      alert(
        'Este navegador não expõe o microfone. Em acesso por rede, a captura de áudio exige HTTPS (ou localhost).',
      );
      return;
    }

    setMicPreview({ status: 'requesting', level: 0, multiplier: 1.0 });
    try {
      await meterRef.current?.startWebAudio();
      micPreviewActiveRef.current = true;
      setMicPreview({ status: 'live', level: 0, multiplier: 1.0 });
    } catch (err) {
      micPreviewActiveRef.current = false;
      setMicPreview({ status: 'denied', level: 0, multiplier: 1.0 });
      const name = err instanceof DOMException ? err.name : '';
      const msg =
        name === 'NotAllowedError'
          ? 'Permissão do microfone negada. Clique no cadeado da barra de endereço e permita o microfone.'
          : name === 'NotFoundError'
            ? 'Nenhum microfone encontrado neste computador.'
            : 'Não foi possível acessar o microfone. Verifique a permissão do navegador.';
      alert(msg);
    }
  }, []);

  const simulateWeak = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'active') return;
    const weak = 0.95;
    meterRef.current?.startSimulator(weak * BASELINE_REF);
    // Depois de "falar", registra o turno abaixo da meta.
    window.setTimeout(() => commitTurn(weak, '(simulação) fala com voz baixa'), 1200);
  }, [commitTurn]);

  const simulateHit = useCallback(() => {
    const s = stateRef.current;
    if (s.status !== 'active') return;
    const strong = 1.42;
    meterRef.current?.startSimulator(strong * BASELINE_REF);
    window.setTimeout(
      () => commitTurn(strong, '(simulação) fala com boa projeção'),
      1200,
    );
  }, [commitTurn]);

  const toggleAgentSpeaking = useCallback(() => {
    const s = stateRef.current;
    publishSessionState({ ...s, agentSpeaking: !s.agentSpeaking });
  }, [publishSessionState]);

  // ---- Render ------------------------------------------------------------

  const isActive = sessionState.status === 'active';
  const isCompleted = sessionState.status === 'completed';
  const agentSpeaking = sessionState.agentSpeaking;

  const captionText = useMemo(() => {
    if (isActive && !agentSpeaking && currentPhrase) return currentPhrase.text;
    return sessionState.agentCaption;
  }, [isActive, agentSpeaking, currentPhrase, sessionState.agentCaption]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8">
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <h1 className="text-4xl font-bold md:text-5xl">
            Olá, Sr. {PRIMARY_PATIENT_NAME}
          </h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 text-base font-medium text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden />
            Sessão Privada • Áudio não armazenado
          </span>
        </header>

        {/* Progresso: 3 pílulas grandes */}
        <ol className="mb-8 grid grid-cols-3 gap-3" aria-label="Progresso do treino">
          {phrases.map((p, i) => {
            const done =
              sessionState.results.some((r) => r.exerciseId === p.id) ||
              (isCompleted && i <= current);
            const isCurrent = isActive && i === current;
            return (
              <li
                key={p.id}
                className={cn(
                  'flex min-h-[72px] items-center justify-center gap-2 rounded-2xl border-2 px-3 text-center text-lg font-semibold transition-colors',
                  done
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : isCurrent
                      ? 'border-emerald-400 bg-slate-800 text-slate-50 ring-2 ring-emerald-400/50'
                      : 'border-slate-700 bg-slate-900 text-slate-400',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {done && <Check className="h-6 w-6" aria-hidden />}
                Exercício {i + 1}
              </li>
            );
          })}
        </ol>

        {/* Cartão central de fala & legenda */}
        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="mb-5 flex items-center justify-center gap-3">
            <span
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-full',
                agentSpeaking
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-emerald-500/20 text-emerald-400',
                isActive || isCompleted ? 'animate-pulse' : '',
              )}
              aria-hidden
            >
              {agentSpeaking ? (
                <Volume2 className="h-7 w-7" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </span>
            <p
              className={cn(
                'text-2xl font-semibold md:text-3xl',
                agentSpeaking ? 'text-sky-300' : 'text-emerald-300',
              )}
            >
              {agentSpeaking ? 'Assistente falando...' : 'Sua vez — fale com firmeza'}
            </p>
          </div>

          {/* Legenda / frase atual */}
          <p
            className={cn(
              'text-center leading-snug',
              isActive && !agentSpeaking
                ? 'text-3xl font-bold md:text-4xl'
                : 'text-2xl text-slate-200',
            )}
          >
            {captionText}
          </p>
        </section>

        {/* Medidor de projeção relativa */}
        {(isActive || isCompleted) && (
          <section className="mb-8" aria-label="Medidor de projeção vocal">
            <ProjectionMeter
              liveMultiplier={sessionState.liveMultiplier}
              targetMultiplier={target}
              variant="patient"
            />
          </section>
        )}

        {/* Preview do microfone (fora do treino) */}
        {!isActive && !isCompleted && micPreview.status !== 'off' && (
          <section
            className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
            aria-label="Teste do microfone"
          >
            <p className="mb-3 text-center text-base font-medium text-slate-300">
              {micPreview.status === 'requesting' &&
                'Pedindo permissão do microfone…'}
              {micPreview.status === 'live' && 'Microfone ligado — fale para testar'}
              {micPreview.status === 'denied' && 'Microfone indisponível'}
            </p>
            {micPreview.status === 'live' && (
              <>
                <ProjectionMeter
                  liveMultiplier={micPreview.multiplier}
                  targetMultiplier={target}
                  variant="patient"
                />
                <p className="mt-3 text-center text-sm tabular-nums text-slate-400">
                  Sinal captado: {(micPreview.level * 100).toFixed(0)}% ·{' '}
                  {micPreview.multiplier.toFixed(2)}x
                </p>
              </>
            )}
          </section>
        )}

        {/* Ação principal */}
        <div className="mt-auto pt-2">
          {sessionState.status === 'idle' || isCompleted ? (
            <button
              type="button"
              onClick={startTraining}
              disabled={!ready}
              className="w-full min-h-[84px] rounded-2xl bg-emerald-600 text-2xl font-bold text-white transition-colors hover:bg-emerald-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/60 disabled:opacity-50 md:text-3xl"
            >
              {isCompleted ? 'TREINAR NOVAMENTE' : 'INICIAR TREINO DE HOJE'}
            </button>
          ) : (
            <button
              type="button"
              onClick={endTraining}
              className="w-full min-h-[84px] rounded-2xl bg-slate-700 text-2xl font-bold text-white transition-colors hover:bg-slate-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/60 md:text-3xl"
            >
              ENCERRAR TREINO
            </button>
          )}
        </div>

        {/* Modo Teste UI (colapsável, discreto) */}
        <section className="mt-6 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={() => setShowTestBar((v) => !v)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', showTestBar && 'rotate-180')}
              aria-hidden
            />
            Modo Teste UI
          </button>
          {showTestBar && (
            <div className="mt-3 flex flex-wrap gap-2">
              <TestButton onClick={testRealMic} icon={<Radio className="h-4 w-4" />}>
                {micPreview.status === 'live'
                  ? 'Parar Microfone Real'
                  : 'Testar Microfone Real (WebAudio)'}
              </TestButton>
              <TestButton onClick={simulateWeak} disabled={!isActive}>
                Simular Fala Fraca (0.95x)
              </TestButton>
              <TestButton onClick={simulateHit} disabled={!isActive}>
                Simular Meta Atingida (1.42x)
              </TestButton>
              <TestButton onClick={toggleAgentSpeaking}>
                Alternar Fala do Agente
              </TestButton>
            </div>
          )}
        </section>

        {/* Rodapé de privacidade/clínico */}
        <footer className="mt-6 text-center text-xs leading-relaxed text-slate-600">
          O áudio é processado em tempo real e nunca é gravado ou armazenado.
          Ferramenta de apoio à prática diária prescrita pelo fonoaudiólogo —
          não realiza diagnóstico clínico.
        </footer>
      </div>
    </main>
  );
}

function TestButton({
  children,
  onClick,
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  );
}
