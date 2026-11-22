'use client';
/**
 * One live practice session in the patient hub (SPEC §hub, decision 4: the hub orchestrates,
 * the agent verbalises). Wires together:
 *   Agora RTC (join + mic, starter patterns) · AgoraVoiceAI (agent state, transcript)
 *   agent-done gate · raw level meter (2nd getUserMedia, no AGC) · attempt detector
 *   practice-machine (pure) → effects: coach (think/say), mute, measure, publish, stop
 */
import { useEffect, useRef, useState } from 'react';
import AgoraRTC, { RemoteUser, useJoin, useLocalMicrophoneTrack, usePublish, useRemoteUsers, useRTCClient } from 'agora-rtc-react';
import { AgoraVoiceAI, AgoraVoiceAIEvents, TranscriptHelperMode, TurnStatus } from 'agora-agent-client-toolkit';
import type { ClinicEvent, PracticeProtocol, PracticeTrigger } from '@/lib/contracts';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import type { AgentSession } from '@/lib/hub/agent-session';
import { createAgentDoneGate } from '@/lib/hub/agent-done';
import { verdict } from '@/lib/hub/coach-messages';
import { applyAiDenoiser } from '@/lib/hub/denoiser';
import { startLevelMeter, type LevelMeter as Meter } from '@/lib/hub/level-meter';
import { smoothDb } from '@/lib/hub/meter-scale';
import {
  ECHO_GUARD_MS,
  practiceStep,
  practiceTelemetry,
  practiceView,
  startPractice,
  type Effect,
  type PracticeEvent,
  type PracticeState,
} from '@/lib/hub/practice-machine';
import { framesOf, startDetector, stepDetector, type DetectorState } from '@/lib/vocal-metrics/attempt-detector';
import { habitualLevelDb, levelDb, measureAttempt, type EnergyFrame } from '@/lib/vocal-metrics/level';
import { exerciseSummary } from '@/lib/vocal-metrics/status';
import { APP_PREFIX } from '@/lib/voice-agent/prompts';
import { LevelMeter } from './LevelMeter';

export interface PracticePatientInfo {
  id: string;
  name: string;
  age: number;
  address: string;
  fallbackHabitualDb: number;
  recentAvgEffortDb: number | null;
  missedDaysBefore: number;
}

export interface SessionOutcome {
  metCount: number;
  total: number;
  status: string;
}

export interface PracticeSessionProps {
  session: AgentSession;
  patient: PracticePatientInfo;
  protocol: PracticeProtocol;
  protocolVersion: number;
  trigger: PracticeTrigger;
  sessionId: string;
  publish: (event: ClinicEvent) => void;
  onEnd: (outcome: SessionOutcome) => void;
  aiDenoiser?: boolean;
  /** Developer overlay (levels, phases) */
  debug?: boolean;
}

const TICK_MS = 50;
/** Patient silent after the greeting → start anyway with the profile's habitual level. */
const CALIBRATION_TIMEOUT_MS = 8_000;
/** think() accepted but the agent never started speaking → re-send the fixed fallback via say(). */
const COACH_RETRY_MS = 5_000;
/** No agent activity for this long while waiting on it → offer "Continuar treino". */
const STUCK_MS = 12_000;
const MAX_SESSION_MS = 5 * 60_000;

export default function PracticeSession(props: PracticeSessionProps) {
  const { session, patient } = props;
  const client = useRTCClient();
  const remoteUsers = useRemoteUsers();
  const agentUser = remoteUsers.find((u) => u.uid.toString() === String(DEFAULT_AGENT_UID));
  const agentUserRef = useRef(agentUser);
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
    agentUserRef.current = agentUser;
  });

  const machine = useRef<PracticeState>(
    startPractice({
      address: patient.address,
      fallbackHabitualDb: patient.fallbackHabitualDb,
      protocol: props.protocol,
      history: { recentAvgEffortDb: patient.recentAvgEffortDb, missedDaysBefore: patient.missedDaysBefore },
    }),
  );
  const protocolVersion = useRef(props.protocolVersion);
  const gate = useRef(createAgentDoneGate());
  const detector = useRef<DetectorState | null>(null);
  const calib = useRef<{ from: number; frames: EnergyFrame[]; timer: ReturnType<typeof setTimeout> } | null>(null);
  const lastActivity = useRef(Date.now());
  const pendingCoach = useRef<{ fallback: string; at: number } | null>(null);
  const ended = useRef(false);
  const smoothed = useRef(-70);
  const lastFrameT = useRef(0);

  const [view, setView] = useState(() => practiceView(machine.current));
  const [agentState, setAgentState] = useState('');
  const [level, setLevel] = useState(-70);
  const [onsetAt, setOnsetAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);
  const [stuck, setStuck] = useState(false);

  // StrictMode guard (see AGENTS.md): join and create the mic only on the real mount.
  const isReady = useReadyFlag();
  const { isConnected: joined } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: session.agoraData.channel,
      token: session.agoraData.token,
      uid: parseInt(session.agoraData.uid, 10),
    },
    isReady,
  );
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady, { AEC: true, ANS: true, AGC: true });
  usePublish([localMicrophoneTrack]);
  const micRef = useRef(localMicrophoneTrack);
  useEffect(() => {
    micRef.current = localMicrophoneTrack;
  }, [localMicrophoneTrack]);

  // Agora AI Noise Suppression on the conversation mic (not on the measuring stream).
  useEffect(() => {
    if (!localMicrophoneTrack || propsRef.current.aiDenoiser === false) return;
    void applyAiDenoiser(localMicrophoneTrack).then((s) => console.info('[practice] AI denoiser:', s));
  }, [localMicrophoneTrack]);

  // ---------- machine plumbing ----------

  const telemetryMeta = (now = new Date()) => ({
    patientId: patient.id,
    patientName: `${patient.name} (${patient.age} anos)`,
    sessionId: propsRef.current.sessionId,
    trigger: propsRef.current.trigger,
    protocolVersion: protocolVersion.current,
    now,
  });

  const finish = (reason: string) => {
    if (ended.current) return;
    ended.current = true;
    const s = machine.current;
    console.info(`[practice] end (${reason})`, s.attempts);
    if (reason !== 'done') propsRef.current.publish(practiceTelemetry(s, true, telemetryMeta()));
    pendingCoach.current = null;
    const sum = exerciseSummary(s.attempts);
    propsRef.current.onEnd({ metCount: sum.metCount, total: sum.total, status: practiceTelemetry(s, true, telemetryMeta()).status });
  };

  const postCoach = (body: Record<string, string>) =>
    fetch('/api/agent/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: session.agentId, ...body }),
    });

  const coach = (text: string, fallback: string) => {
    lastActivity.current = Date.now();
    pendingCoach.current = { fallback, at: Date.now() };
    console.info('[practice] coach →', text);
    postCoach({ text, fallback })
      .then(async (r) => console.info('[practice] coach ←', r.status, await r.json().catch(() => ({}))))
      .catch((e) => console.error('[practice] coach failed', e));
  };

  const run = (effects: Effect[]) => {
    for (const e of effects) {
      switch (e.type) {
        case 'coach':
          coach(e.message.text, e.message.fallback);
          break;
        case 'mute':
          void micRef.current?.setMuted(e.muted);
          break;
        case 'measure':
          detector.current = startDetector(e.openedAt);
          setOnsetAt(null);
          break;
        case 'publish':
          propsRef.current.publish(practiceTelemetry(machine.current, e.final, telemetryMeta()));
          break;
        case 'stop':
          finish('done');
          break;
      }
    }
  };

  const dispatch = (event: PracticeEvent) => {
    if (ended.current) return;
    const { state, effects } = practiceStep(machine.current, event);
    machine.current = state;
    setView(practiceView(state));
    run(effects);
  };

  const closeCalibration = (habitual: number | null) => {
    const c = calib.current;
    if (!c) return;
    clearTimeout(c.timer);
    calib.current = null;
    console.info('[practice] habitual level', habitual);
    dispatch({ type: 'calibrated', habitualDb: habitual });
  };

  /** The agent really finished an utterance (gate fired). */
  const onAgentDone = (at: number) => {
    lastActivity.current = Date.now();
    if (machine.current.phase === 'calibrating' && !calib.current) {
      // Greeting finished: the patient's answer calibrates the habitual voice.
      calib.current = {
        from: at + ECHO_GUARD_MS,
        frames: [],
        timer: setTimeout(() => {
          const c = calib.current;
          closeCalibration(c ? habitualLevelDb(c.frames) : null);
          dispatch({ type: 'agentDone', at: Date.now() }); // agent may never reply to silence
        }, CALIBRATION_TIMEOUT_MS),
      };
    }
    dispatch({ type: 'agentDone', at });
  };

  // ---------- protocol updates from the therapist (only before the first exercise) ----------
  useEffect(() => {
    if (props.protocolVersion === protocolVersion.current) return;
    dispatch({ type: 'protocolUpdated', protocol: props.protocol });
    if (machine.current.protocol === props.protocol) protocolVersion.current = props.protocolVersion;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.protocolVersion]);

  // ---------- agent events ----------
  useEffect(() => {
    if (!isReady || !joined) return;
    let cancelled = false;
    const published = new Map<string, string>();
    const userFinal = new Set<number>();

    (async () => {
      try {
        (AgoraRTC as unknown as { setParameter?: (k: string, v: unknown) => void }).setParameter?.('ENABLE_AUDIO_PTS', true);
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmEngine: session.rtm,
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: false,
        });
        if (cancelled) {
          ai.unsubscribe();
          ai.destroy();
          return;
        }
        ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_, event) => {
          const now = Date.now();
          gate.current.state(event.state, now);
          setAgentState(event.state);
          if (event.state === 'speaking') pendingCoach.current = null;
          if (event.state === 'speaking' || event.state === 'thinking') {
            lastActivity.current = now;
            setStuck(false);
            // The patient's answer to the greeting is over once the agent starts replying.
            if (calib.current) closeCalibration(habitualLevelDb(calib.current.frames));
          }
        });
        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (items) => {
          for (const item of items) {
            const isUser = item.uid === '0' || item.uid === session.agoraData.uid;
            const text = item.text?.trim();
            // think() injections come back as user turns — never show them as the patient's speech.
            if (!text || text.startsWith(APP_PREFIX)) continue;
            const final = item.status !== TurnStatus.IN_PROGRESS;
            if (isUser && final && !userFinal.has(item.turn_id)) {
              userFinal.add(item.turn_id);
              dispatch({ type: 'patientSaid', text });
            }
            const key = `${isUser ? 'P' : 'A'}-${item.turn_id}`;
            if (published.get(key) === `${text}|${final}`) continue;
            published.set(key, `${text}|${final}`);
            propsRef.current.publish({
              event_type: 'TRANSCRIPT_LINE',
              timestamp: new Date().toISOString(),
              patient_id: patient.id,
              session_id: propsRef.current.sessionId,
              speaker: isUser ? 'PATIENT' : 'AGENT',
              text,
              turn_id: item.turn_id,
              final,
            });
          }
        });
        ai.subscribeMessage(session.agoraData.channel);
      } catch (e) {
        console.error('[practice] AgoraVoiceAI init failed', e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ai = AgoraVoiceAI.getInstance();
        ai?.unsubscribe();
        ai?.destroy();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, joined]);

  // ---------- agent audio level → done gate; watchdog ----------
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      const agentLevel = agentUserRef.current?.audioTrack?.getVolumeLevel() ?? 0;
      const done = gate.current.level(agentLevel, t);
      if (done !== null) onAgentDone(done);

      const pc = pendingCoach.current;
      if (pc && t - pc.at > COACH_RETRY_MS) {
        pendingCoach.current = null;
        console.warn('[practice] agent silent after think → say fallback');
        lastActivity.current = t;
        postCoach({ text: pc.fallback, mode: 'say' }).catch((e) => console.error('[practice] say retry failed', e));
      }

      const phase = machine.current.phase;
      const waitingOnAgent = phase === 'intro' || phase === 'instructing' || phase === 'closing';
      if (waitingOnAgent && !gate.current.busy() && t - lastActivity.current > STUCK_MS) setStuck(true);
      setClock(t);
    }, TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- raw level meter → calibration, attempt detector, on-screen meter ----------
  useEffect(() => {
    if (!isReady) return;
    let meter: Meter | null = null;
    let cancelled = false;
    startLevelMeter({
      onFrame: (f) => {
        const db = levelDb(f.rms);
        smoothed.current = smoothDb(smoothed.current, db, lastFrameT.current ? f.t - lastFrameT.current : 0);
        lastFrameT.current = f.t;
        setLevel(smoothed.current);

        const c = calib.current;
        if (c && f.t >= c.from) c.frames.push(f);

        const d = detector.current;
        if (!d) return;
        const next = stepDetector(d, f);
        detector.current = next;
        if (next.onsetAt !== d.onsetAt) setOnsetAt(next.onsetAt);
        if (next.phase === 'done') {
          detector.current = null;
          setOnsetAt(null);
          const frames = framesOf(next);
          const measurement = measureAttempt(frames);
          console.info('[practice] attempt', next.outcome, JSON.stringify(measurement), attemptDebug(frames));
          dispatch({ type: 'attemptMeasured', measurement, at: new Date().toISOString() });
        }
      },
    })
      .then((m) => {
        if (cancelled) return void m.stop();
        meter = m;
        console.info('[practice] level meter settings', m.settings);
      })
      .catch((e) => console.error('[practice] level meter failed', e));
    return () => {
      cancelled = true;
      void meter?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // ---------- manual end + safety stop ----------
  useEffect(() => {
    const onStop = () => finish('manual');
    window.addEventListener('unmute:end-session', onStop);
    const safety = setTimeout(() => finish('timeout'), MAX_SESSION_MS);
    return () => {
      window.removeEventListener('unmute:end-session', onStop);
      clearTimeout(safety);
      const c = calib.current;
      if (c) clearTimeout(c.timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resume = () => {
    setStuck(false);
    lastActivity.current = Date.now();
    if (machine.current.phase === 'closing') return finish('closing-stuck');
    dispatch({ type: 'resume' });
  };

  return (
    <>
      <PracticeScreen
        view={view}
        agentState={agentState}
        level={level}
        onsetAt={onsetAt}
        clock={clock}
        stuck={stuck}
        onResume={resume}
        address={patient.address}
      />
      {props.debug && (
        <p className="fixed bottom-14 left-4 font-mono text-sm text-gray-500">
          fase {view.phase} · agente {agentState || '—'} · nível {level.toFixed(1)} dBFS · habitual {view.habitualDb ?? '—'}
        </p>
      )}
      <div className="hidden">{agentUser && <RemoteUser user={agentUser} />}</div>
    </>
  );
}

// =====================================================================
// Presentation (high contrast, giant type, no small controls)
// =====================================================================

function PracticeScreen({
  view,
  agentState,
  level,
  onsetAt,
  clock,
  stuck,
  onResume,
  address,
}: {
  view: ReturnType<typeof practiceView>;
  agentState: string;
  level: number;
  onsetAt: number | null;
  clock: number;
  stuck: boolean;
  onResume: () => void;
  address: string;
}) {
  const ex = view.exercise;
  const measuring = view.phase === 'measuring';
  const speaking = agentState === 'speaking';
  const last = view.lastAttempt;
  const lastVerdict = last ? verdict(last) : null;

  if (view.phase === 'calibrating' || view.phase === 'intro') {
    return (
      <div className="flex flex-col items-center gap-8 text-center">
        <div className={`h-56 w-56 rounded-full ${speaking ? 'animate-pulse bg-yellow-300' : 'border-8 border-yellow-300'}`} aria-hidden />
        <p className="text-6xl font-bold">{speaking ? 'Gabriel está falando…' : 'Pode falar, estou ouvindo'}</p>
        {stuck && <ResumeButton onClick={onResume} />}
      </div>
    );
  }

  if (view.phase === 'closing' || view.phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-7xl font-bold text-green-300">Treino concluído!</p>
        <p className="text-5xl">
          Meta atingida em {view.summary.metCount} de {view.summary.total} exercícios
        </p>
        {stuck && <ResumeButton onClick={onResume} />}
      </div>
    );
  }

  const sustainSeconds = measuring && onsetAt !== null && ex?.kind === 'sustain' ? Math.max(0, (clock - onsetAt) / 1000) : null;

  return (
    <div className="flex w-full max-w-6xl flex-wrap items-center justify-center gap-12">
      <div className="flex max-w-3xl flex-1 flex-col items-center gap-6 text-center">
        <Steps view={view} />
        {ex?.kind === 'sustain' ? (
          <>
            <p className="text-5xl text-gray-300">Respire fundo e diga, bem forte:</p>
            <p className="text-8xl font-black tracking-widest text-yellow-200">AAAAA…</p>
          </>
        ) : (
          <>
            <p className="text-5xl text-gray-300">Diga em voz bem forte:</p>
            <p className="text-7xl font-black leading-tight text-yellow-200">“{view.phrase}”</p>
          </>
        )}
        <p className={`text-5xl font-bold ${measuring ? 'text-green-300' : 'text-gray-400'}`} aria-live="polite">
          {measuring ? 'Sua vez! Pode falar' : speaking ? 'Gabriel está falando…' : 'Um momento…'}
        </p>
        {sustainSeconds !== null && view.targetDurationMs !== null && (
          <p className={`font-mono text-6xl ${sustainSeconds * 1000 >= view.targetDurationMs ? 'text-green-300' : 'text-white'}`}>
            {sustainSeconds.toFixed(1).replace('.', ',')} s <span className="text-3xl text-gray-400">/ meta {view.targetDurationMs / 1000} s</span>
          </p>
        )}
        {!measuring && last && lastVerdict && (
          <p
            className={`rounded-2xl px-6 py-3 text-4xl font-bold ${
              lastVerdict === 'met' ? 'bg-green-900 text-green-200' : lastVerdict === 'none' ? 'bg-gray-800 text-gray-200' : 'bg-yellow-900 text-yellow-100'
            }`}
          >
            {lastVerdict === 'met' ? '✓ Meta atingida!' : lastVerdict === 'almost' ? 'Quase lá!' : lastVerdict === 'none' ? `Sem pressa, ${address}` : 'Mais forte!'}
          </p>
        )}
        {stuck && <ResumeButton onClick={onResume} />}
      </div>
      <LevelMeter levelDb={level} habitualDb={view.habitualDb ?? -40} targetEffortDb={view.targetEffortDb} active={measuring} />
    </div>
  );
}

function Steps({ view }: { view: ReturnType<typeof practiceView> }) {
  const ex = view.exercise;
  const labels = ['"Aaa"', 'Frase 1', 'Frase 2', 'Frase 3'];
  const currentIndex = ex ? (ex.kind === 'sustain' ? 0 : ex.index + 1) : labels.length;
  return (
    <ol className="flex gap-3 text-2xl" aria-label="Etapas do treino">
      {labels.map((l, i) => (
        <li
          key={l}
          className={`rounded-full px-4 py-1 ${i < currentIndex ? 'bg-green-800 text-green-100' : i === currentIndex ? 'bg-yellow-300 font-bold text-black' : 'bg-gray-800 text-gray-400'}`}
        >
          {i < currentIndex ? '✓ ' : ''}
          {l}
        </li>
      ))}
    </ol>
  );
}

function ResumeButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-3xl bg-yellow-300 px-10 py-6 text-4xl font-bold text-black">
      Continuar treino
    </button>
  );
}

/** Compact run-length view of an attempt (V=voiced frames, s=silent) + frame spacing, for logs. */
function attemptDebug(frames: EnergyFrame[]): string {
  if (frames.length < 2) return `frames=${frames.length}`;
  const dts = frames.slice(1).map((f, i) => f.t - frames[i].t);
  const runs = frames
    .map((f) => (levelDb(f.rms) >= -50 ? 'V' : 's'))
    .join('')
    .replace(/(V+|s+)/g, (m) => `${m[0]}${m.length} `)
    .slice(0, 300);
  const lv = frames.map((f) => Math.round(levelDb(f.rms)));
  return `frames=${frames.length} dt=${Math.min(...dts)}..${Math.max(...dts)} lv=${Math.min(...lv)}..${Math.max(...lv)} runs=${runs}`;
}

function useReadyFlag(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setReady(false);
    };
  }, []);
  return ready;
}
