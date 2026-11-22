'use client';
/**
 * Dev check for P6 / stage calibration (P11): raw loudness meter + habitual calibration +
 * attempt detection, with no agent involved. Everything runs locally (DevTools → Network stays empty).
 */
import { useEffect, useRef, useState } from 'react';
import { LevelMeter } from '@/components/hub/LevelMeter';
import { DEFAULT_PROTOCOL, type AttemptResult, type ExerciseKind } from '@/lib/contracts';
import { startLevelMeter, type LevelMeter as Meter } from '@/lib/hub/level-meter';
import { smoothDb } from '@/lib/hub/meter-scale';
import { DEFAULT_DETECTOR, framesOf, startDetector, stepDetector, type DetectorState } from '@/lib/vocal-metrics/attempt-detector';
import { buildAttemptResult, habitualLevelDb, levelDb, measureAttempt, type EnergyFrame } from '@/lib/vocal-metrics/level';

const CALIBRATION_MS = 3000;
type Mode = 'idle' | 'calibrating' | 'attempt';

export default function DevMeterPage() {
  const meter = useRef<Meter | null>(null);
  const smoothed = useRef(-70);
  const lastT = useRef(0);
  const calib = useRef<{ until: number; frames: EnergyFrame[] } | null>(null);
  const detector = useRef<DetectorState | null>(null);
  const kindRef = useRef<ExerciseKind>('sustain');

  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<MediaTrackSettings>({});
  const [level, setLevel] = useState(-70);
  const [raw, setRaw] = useState(-70);
  const [habitual, setHabitual] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('idle');
  const [detectorPhase, setDetectorPhase] = useState('');
  const [results, setResults] = useState<AttemptResult[]>([]);
  const [error, setError] = useState('');
  /** Mirror of `habitual` for the frame callback (set where it changes, never during render) */
  const habitualRef = useRef<number | null>(null);

  const onFrame = (f: EnergyFrame) => {
    const db = levelDb(f.rms);
    smoothed.current = smoothDb(smoothed.current, db, lastT.current ? f.t - lastT.current : 0);
    lastT.current = f.t;
    setLevel(smoothed.current);
    setRaw(db);

    const c = calib.current;
    if (c) {
      c.frames.push(f);
      if (f.t >= c.until) {
        calib.current = null;
        const h = habitualLevelDb(c.frames);
        habitualRef.current = h;
        setHabitual(h);
        setMode('idle');
      }
    }

    const d = detector.current;
    if (d) {
      const next = stepDetector(d, f);
      detector.current = next;
      setDetectorPhase(next.phase);
      if (next.phase === 'done') {
        detector.current = null;
        const r = buildAttemptResult({
          kind: kindRef.current,
          attempt: 1,
          phraseIndex: 0,
          measurement: measureAttempt(framesOf(next)),
          habitualDb: habitualRef.current ?? -40,
          protocol: DEFAULT_PROTOCOL,
          at: new Date().toISOString(),
        });
        setResults((list) => [r, ...list].slice(0, 10));
        setMode('idle');
      }
    }
  };

  const start = async () => {
    try {
      meter.current = await startLevelMeter({ onFrame });
      setSettings(meter.current.settings);
      setRunning(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const calibrate = () => {
    calib.current = { until: Date.now() + CALIBRATION_MS, frames: [] };
    setMode('calibrating');
  };

  const attempt = (kind: ExerciseKind) => {
    kindRef.current = kind;
    detector.current = startDetector(Date.now());
    setDetectorPhase('waiting');
    setMode('attempt');
  };

  useEffect(() => () => void meter.current?.stop(), []);

  const btn = 'rounded bg-gray-700 px-4 py-2 text-lg disabled:opacity-40';
  return (
    <main className="min-h-screen space-y-6 bg-black p-6 text-white">
      <h1 className="text-3xl font-bold">Medidor de voz · teste e calibração (local)</h1>
      {error && <p className="text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button className={btn} onClick={start} disabled={running}>
          Ligar microfone (sem AGC)
        </button>
        <button className={btn} onClick={calibrate} disabled={!running || mode !== 'idle'}>
          Calibrar voz de costume (fale normal por 3 s)
        </button>
        <button className={btn} onClick={() => attempt('sustain')} disabled={!running || mode !== 'idle'}>
          Tentativa &quot;Aaa&quot;
        </button>
        <button className={btn} onClick={() => attempt('phrase')} disabled={!running || mode !== 'idle'}>
          Tentativa frase
        </button>
      </div>

      <p className="font-mono text-sm text-gray-400">
        AGC={String(settings.autoGainControl)} · NS={String(settings.noiseSuppression)} · AEC={String(settings.echoCancellation)} ·
        sampleRate={settings.sampleRate ?? '?'} · piso de voz {DEFAULT_DETECTOR.voiceFloorDb} dBFS
      </p>
      <p className="font-mono text-lg">
        agora: {raw.toFixed(1)} dBFS · suavizado: {level.toFixed(1)} · voz de costume: {habitual?.toFixed(1) ?? '—'} · modo: {mode}
        {mode === 'attempt' && ` (${detectorPhase})`}
      </p>

      <div className="flex flex-wrap items-start gap-10">
        <LevelMeter
          levelDb={level}
          habitualDb={habitual ?? -40}
          targetEffortDb={DEFAULT_PROTOCOL.target_effort_db}
          active={mode === 'attempt'}
        />
        <ul className="space-y-2 font-mono text-lg">
          {results.map((r, i) => (
            <li key={i} className={r.met_target ? 'text-green-300' : 'text-yellow-200'}>
              {r.kind} · esforço {r.effort_db ?? '—'} dB (meta {r.target_effort_db}) · {r.duration_ms ?? '—'} ms
              {r.target_duration_ms ? ` (meta ${r.target_duration_ms})` : ''} · {r.no_attempt ? 'SEM TENTATIVA' : r.met_target ? 'META ✓' : 'abaixo'}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-gray-500">dB relativo, não calibrado — fique a um palmo do microfone.</p>
    </main>
  );
}
