'use client';
/**
 * On-device edge listener (SPEC §edge-listener).
 * Vosk WASM keyword spotting ("vamos treinar") on the local mic; the V1 impact-then-silence
 * detector is opt-in (pass `impact`) and off by default in v2.
 * No audio is sent over the network: the only request is the one-time model download.
 */
import type { EdgeTrigger } from '@/lib/contracts';
import { createImpactDetector, type ImpactOptions } from './impact';
import { KEYWORD_GRAMMAR, matchKeyword } from './keywords';

export type EdgeStatus = 'loading-model' | 'listening' | 'paused' | 'keyword-unavailable' | 'stopped' | 'error';

export interface EdgeListenerOptions {
  onTrigger: (trigger: EdgeTrigger) => void;
  onStatus?: (status: EdgeStatus, detail?: string) => void;
  /** Vosk partial/final text, for the dev page */
  onHeard?: (text: string) => void;
  /** Live mic RMS (0..1), for level meters and calibration */
  onLevel?: (rms: number) => void;
  modelUrl?: string;
  /** Enables the V1 impact-then-silence detector (off when omitted) */
  impact?: ImpactOptions;
  /** Minimum time between two triggers */
  cooldownMs?: number;
}

export interface EdgeListener {
  pause(): void;
  resume(): void;
  stop(): Promise<void>;
}

export const MODEL_URL = '/models/vosk-model-small-pt-0.3.tar.gz';

export async function startEdgeListener(opts: EdgeListenerOptions): Promise<EdgeListener> {
  const { onTrigger, onStatus, onHeard, onLevel, cooldownMs = 4000 } = opts;
  let paused = false;
  let lastTriggerAt = 0;
  const impact = opts.impact ? createImpactDetector(opts.impact) : null;

  const fire = (trigger: EdgeTrigger) => {
    if (paused || trigger.at - lastTriggerAt < cooldownMs) return;
    lastTriggerAt = trigger.at;
    onTrigger(trigger);
  };

  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but is what vosk-browser's acceptWaveform(AudioBuffer) expects.
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  // Keyword spotting: if the model fails, impact detection keeps working (SPEC fallback).
  onStatus?.('loading-model');
  type Recognizer = InstanceType<Awaited<ReturnType<typeof import('vosk-browser').createModel>>['KaldiRecognizer']>;
  let recognizer: Recognizer | null = null;
  let terminateModel: (() => void) | null = null;
  try {
    const { createModel } = await import('vosk-browser');
    const model = await createModel(opts.modelUrl ?? MODEL_URL);
    terminateModel = () => model.terminate();
    recognizer = new model.KaldiRecognizer(ctx.sampleRate, KEYWORD_GRAMMAR);
    const handle = (text: string) => {
      if (!text) return;
      onHeard?.(text);
      const keyword = matchKeyword(text);
      if (keyword) fire({ kind: 'keyword', keyword, at: Date.now() });
    };
    recognizer.on('partialresult', (m) => 'result' in m && 'partial' in m.result && handle(m.result.partial));
    recognizer.on('result', (m) => 'result' in m && 'text' in m.result && handle(m.result.text));
    onStatus?.('listening');
  } catch (e) {
    onStatus?.('keyword-unavailable', e instanceof Error ? e.message : String(e));
  }

  processor.onaudioprocess = (event) => {
    if (paused) return;
    const samples = event.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const rms = Math.sqrt(sum / samples.length);
    onLevel?.(rms);
    const now = Date.now();
    if (impact?.feed({ t: now, rms })) fire({ kind: 'impact', at: now });
    try {
      recognizer?.acceptWaveform(event.inputBuffer);
    } catch (err) {
      console.error('[edge-listener] acceptWaveform failed', err);
    }
  };
  source.connect(processor);
  processor.connect(ctx.destination); // required for onaudioprocess to fire in Chrome; output is silent

  return {
    pause() {
      paused = true;
      impact?.reset();
      onStatus?.('paused');
    },
    resume() {
      paused = false;
      onStatus?.(recognizer ? 'listening' : 'keyword-unavailable');
    },
    async stop() {
      paused = true;
      processor.disconnect();
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      recognizer?.remove();
      terminateModel?.();
      await ctx.close();
      onStatus?.('stopped');
    },
  };
}
