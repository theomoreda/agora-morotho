'use client';
/**
 * Raw loudness meter for the voice coach (SPEC §Tech Stack, decision "medição num segundo getUserMedia").
 *
 * The Agora RTC track keeps AEC/AGC/AI-denoiser for the conversation, but AGC normalises loudness
 * and would erase the patient's effort. This opens a SECOND capture of the same microphone with
 * autoGainControl and noiseSuppression OFF (echoCancellation stays on) and samples it with an
 * AnalyserNode at ~50 Hz. Frames use Date.now(), the same clock as the hub's agent events.
 * Nothing leaves the device: frames only feed the local attempt detector and the on-screen meter.
 */
import type { EnergyFrame } from '@/lib/vocal-metrics/level';

export interface LevelMeterOptions {
  onFrame: (frame: EnergyFrame) => void;
  /** Same microphone as the RTC track, when the user picked one */
  deviceId?: string;
  /** Sampling period; 20 ms ≈ 50 Hz */
  intervalMs?: number;
}

export interface LevelMeter {
  stop(): Promise<void>;
  /** Effective constraints reported by the browser (to confirm AGC is really off) */
  settings: MediaTrackSettings;
}

export async function startLevelMeter(opts: LevelMeterOptions): Promise<LevelMeter> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      deviceId: opts.deviceId ? { exact: opts.deviceId } : undefined,
      autoGainControl: false,
      noiseSuppression: false,
      echoCancellation: true,
      channelCount: 1,
    },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024; // ~21 ms at 48 kHz: one window per frame
  source.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    opts.onFrame({ t: Date.now(), rms: Math.sqrt(sum / buf.length) });
  }, opts.intervalMs ?? 20);

  return {
    settings: stream.getAudioTracks()[0]?.getSettings() ?? {},
    async stop() {
      clearInterval(timer);
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
    },
  };
}
