'use client';
/**
 * Tela 1 — Hub do paciente (B2C). High contrast, giant type, no menus.
 * Standby: on-device listening for "Gabriel, vamos treinar" (Vosk) — nothing leaves the device.
 * Session: voice-coach practice (Agora Conversational AI + local loudness measurement).
 * Signaling: receives the therapist's protocol (PROTOCOL_UPDATE → PROTOCOL_ACK) and publishes telemetry.
 * Demo controls at the bottom are clearly labelled as simulation aids.
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HELENA_PK_PROFILE } from '@/data/patients';
import { findPracticePatient } from '@/data/seed-practice';
import type { ClinicEvent, EdgeTrigger, PracticeTrigger } from '@/lib/contracts';
import { connectClinicSync, type ClinicConnection } from '@/lib/clinic-sync/connect';
import { startEdgeListener, type EdgeListener, type EdgeStatus } from '@/lib/edge-listener/listener';
import { startAgentSession, stopAgentSession, type AgentSession } from '@/lib/hub/agent-session';
import { loadProtocol, saveProtocol, type StoredProtocol } from '@/lib/hub/protocol-store';
import { missedDaysBefore, recentAvgEffortDb } from '@/lib/vocal-metrics/history';
import type { PracticePatientInfo, SessionOutcome } from '@/components/hub/PracticeSession';

const AgoraProvider = dynamic(() => import('@/components/hub/AgoraProvider'), { ssr: false });
const PracticeSession = dynamic(() => import('@/components/hub/PracticeSession'), { ssr: false });

const PROFILE = HELENA_PK_PROFILE;
const SEED = findPracticePatient(PROFILE.id);
const PATIENT: PracticePatientInfo = {
  id: PROFILE.id,
  name: PROFILE.name,
  age: PROFILE.age,
  address: PROFILE.address,
  fallbackHabitualDb: SEED.habitualDb,
  recentAvgEffortDb: recentAvgEffortDb(SEED.history),
  missedDaysBefore: missedDaysBefore(SEED.history),
};
const SEED_PROTOCOL: StoredProtocol = { protocol: SEED.protocol, version: SEED.protocolVersion };
const RESULT_SCREEN_MS = 10_000;

type Phase = 'off' | 'standby' | 'starting' | 'session' | 'result';

interface ActiveSession {
  session: AgentSession;
  sessionId: string;
  trigger: PracticeTrigger;
}

export default function HubPage() {
  const [phase, setPhase] = useState<Phase>('off');
  const [edgeStatus, setEdgeStatus] = useState<EdgeStatus | 'off'>('off');
  const [link, setLink] = useState<'off' | 'conectado' | 'erro'>('off');
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [protocol, setProtocol] = useState<StoredProtocol>(SEED_PROTOCOL);
  const [protocolFlash, setProtocolFlash] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [error, setError] = useState('');
  const [dev, setDev] = useState(false);
  const [aiDenoiser, setAiDenoiser] = useState(true);

  const clinic = useRef<ClinicConnection | null>(null);
  const edge = useRef<EdgeListener | null>(null);
  const phaseRef = useRef<Phase>('off');
  const protocolRef = useRef(protocol);
  useEffect(() => {
    phaseRef.current = phase;
    protocolRef.current = protocol;
  }, [phase, protocol]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setDev(q.has('dev'));
    if (q.get('denoiser') === '0') setAiDenoiser(false);
    setProtocol(loadProtocol(PATIENT.id, SEED_PROTOCOL));
  }, []);

  const publish = useCallback((ev: ClinicEvent) => {
    if (!clinic.current) return console.warn('[hub] clinic-sync not connected; dropped', ev.event_type);
    clinic.current.sync.publish(ev).catch((e) => console.error('[hub] publish failed', e));
  }, []);

  const startSession = useCallback(async (trigger: PracticeTrigger) => {
    if (phaseRef.current !== 'standby') return;
    setPhase('starting');
    setError('');
    edge.current?.pause();
    try {
      const session = await startAgentSession('practice', PATIENT.id, protocolRef.current.protocol);
      setActive({ session, sessionId: `sess-${Date.now()}`, trigger });
      setPhase('session');
    } catch (e) {
      console.error('[hub] could not start session', e);
      setError('Não consegui conectar agora. Tente de novo.');
      setPhase('standby');
      edge.current?.resume();
    }
  }, []);

  const onEdgeTrigger = useCallback(
    (trigger: EdgeTrigger) => {
      console.info('[hub] edge trigger', trigger);
      if (trigger.kind === 'keyword') void startSession('VOICE_COMMAND');
    },
    [startSession],
  );

  const activate = async () => {
    setPhase('standby');
    connectClinicSync()
      .then(async (c) => {
        clinic.current = c;
        await c.sync.subscribe(
          (ev) => {
            if (ev.event_type !== 'PROTOCOL_UPDATE' || ev.patient_id !== PATIENT.id) return;
            if (ev.protocol_version < protocolRef.current.version) return;
            const next = { protocol: ev.protocol, version: ev.protocol_version };
            console.info('[hub] protocol v%d from %s', ev.protocol_version, ev.updated_by);
            setProtocol(next);
            saveProtocol(PATIENT.id, next);
            setProtocolFlash(true);
            setTimeout(() => setProtocolFlash(false), 4000);
            void c.sync.publish({
              event_type: 'PROTOCOL_ACK',
              timestamp: new Date().toISOString(),
              patient_id: PATIENT.id,
              protocol_version: ev.protocol_version,
            });
          },
          { onInvalid: (e) => console.warn('[hub] invalid message', e) },
        );
        setLink('conectado');
      })
      .catch((e) => {
        console.error('[hub] clinic-sync failed', e);
        setLink('erro');
      });
    try {
      edge.current = await startEdgeListener({ onTrigger: onEdgeTrigger, onStatus: (s) => setEdgeStatus(s) });
    } catch (e) {
      console.error('[hub] edge listener failed', e);
      setEdgeStatus('error');
    }
  };

  const onSessionEnd = useCallback((result: SessionOutcome) => {
    setOutcome(result);
    setPhase('result');
    setActive((current) => {
      if (current) void stopAgentSession(current.session);
      return null;
    });
    setTimeout(() => {
      setPhase('standby');
      setOutcome(null);
      edge.current?.resume();
    }, RESULT_SCREEN_MS);
  }, []);

  useEffect(
    () => () => {
      void edge.current?.stop();
      void clinic.current?.close();
    },
    [],
  );

  const edgeLabel =
    edgeStatus === 'listening'
      ? 'Escuta local ativa — nenhum áudio sai do aparelho'
      : edgeStatus === 'paused'
        ? 'Escuta local pausada durante o treino'
        : edgeStatus === 'loading-model'
          ? 'Carregando escuta local…'
          : edgeStatus === 'keyword-unavailable'
            ? 'Comando de voz indisponível — use o botão'
            : 'Escuta local desligada';

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 text-xl">
        <span className="flex items-center gap-3">
          <span className={`h-4 w-4 rounded-full ${edgeStatus === 'listening' ? 'bg-green-400' : edgeStatus === 'paused' ? 'bg-yellow-400' : 'bg-gray-500'}`} />
          {edgeLabel}
        </span>
        <span className="text-lg text-gray-400">
          Clínica: {link === 'conectado' ? 'conectada via Agora Signaling' : link === 'erro' ? 'sem conexão' : '—'} · protocolo da fono v{protocol.version}
        </span>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-6 text-center">
        {phase === 'off' && (
          <button onClick={activate} className="rounded-3xl bg-yellow-300 px-12 py-8 text-5xl font-bold text-black">
            Ativar aparelho
          </button>
        )}

        {phase === 'standby' && (
          <>
            <p className="text-6xl font-bold leading-tight">Bom dia, {PATIENT.address}!</p>
            <p className="text-5xl text-yellow-200">
              Diga: <strong>“Gabriel, vamos treinar”</strong>
            </p>
            <button onClick={() => void startSession('BUTTON')} className="rounded-3xl bg-yellow-300 px-14 py-8 text-5xl font-bold text-black">
              Começar treino
            </button>
            <div
              className={`mt-4 max-w-4xl rounded-2xl border-2 px-8 py-5 text-left transition-colors ${protocolFlash ? 'border-green-400 bg-green-950' : 'border-gray-700'}`}
              aria-live="polite"
            >
              <p className="mb-2 text-2xl text-gray-400">
                {protocolFlash ? '✓ Novo treino enviado pela sua fonoaudióloga' : 'Frases de hoje (da sua fonoaudióloga):'}
              </p>
              <ol className="list-decimal space-y-1 pl-10 text-4xl">
                {protocol.protocol.phrases.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ol>
            </div>
            {error && <p className="text-3xl text-red-300">{error}</p>}
          </>
        )}

        {phase === 'starting' && <p className="text-6xl font-bold">Chamando o Gabriel…</p>}

        {phase === 'result' && outcome && (
          <div className="flex flex-col items-center gap-6">
            <p className="text-7xl font-bold text-green-300">Parabéns, {PATIENT.address}!</p>
            <p className="text-5xl">
              Meta atingida em {outcome.metCount} de {outcome.total} exercícios.
            </p>
            <p className="text-4xl text-gray-300">Sua fonoaudióloga já recebeu o resultado. Até amanhã!</p>
          </div>
        )}

        {active && (
          <AgoraProvider>
            <PracticeSession
              session={active.session}
              patient={PATIENT}
              protocol={protocol.protocol}
              protocolVersion={protocol.version}
              trigger={active.trigger}
              sessionId={active.sessionId}
              publish={publish}
              onEnd={onSessionEnd}
              aiDenoiser={aiDenoiser}
              debug={dev}
            />
          </AgoraProvider>
        )}
      </section>

      {phase !== 'off' && (
        <footer className="border-t border-gray-800 px-6 py-3 text-base text-gray-400">
          <span className="mr-3 uppercase tracking-wide">Controles de demonstração:</span>
          <button
            className="mr-2 rounded border border-amber-700 px-3 py-1 text-amber-400 disabled:opacity-40"
            disabled={phase !== 'standby'}
            onClick={() => onEdgeTrigger({ kind: 'keyword', keyword: 'treinar', at: Date.now() })}
          >
            Simular comando de voz (simulado)
          </button>
          <button
            className="rounded border border-gray-600 px-3 py-1 disabled:opacity-40"
            disabled={phase !== 'session'}
            onClick={() => window.dispatchEvent(new Event('unmute:end-session'))}
          >
            Encerrar treino
          </button>
          <span className="ml-4">dB relativo, não calibrado — fique a um palmo do aparelho.</span>
        </footer>
      )}
    </main>
  );
}
