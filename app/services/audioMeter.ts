/**
 * audioMeter — leitor de nível de áudio local normalizado (0.0 a 1.0).
 *
 * Dois modos nesta etapa:
 *  - WebAudio: captura o microfone real via getUserMedia + AnalyserNode e
 *    expõe o nível RMS suavizado. Serve de preview/fallback antes da Agora.
 *  - Simulador: alimenta um nível fixo/animado para testar a UI sem microfone.
 *
 * Contrato de substituição (Etapa 2): o `agora-rtc-sdk-ng` já expõe
 * `localAudioTrack.getVolumeLevel()` em escala 0.0–1.0. Basta instanciar o
 * AudioMeter em modo "external" e chamar `pushExternalLevel(track.getVolumeLevel())`
 * num loop, reaproveitando a mesma suavização e os mesmos callbacks.
 */

export type AudioMeterMode = 'webaudio' | 'simulator' | 'external';

export interface AudioMeterOptions {
  /** Intervalo de emissão em ms (padrão 100ms, como pede a UI). */
  intervalMs?: number;
  /** Fator de suavização exponencial (0..1). Maior = mais estável. */
  smoothing?: number;
}

export type LevelListener = (level: number) => void;

const DEFAULTS = { intervalMs: 100, smoothing: 0.6 };

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export class AudioMeter {
  private mode: AudioMeterMode = 'simulator';
  private readonly intervalMs: number;
  private readonly smoothing: number;

  private listeners = new Set<LevelListener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  private smoothed = 0;

  // WebAudio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;

  // Simulador / external
  private simTarget = 0;
  private externalLevel = 0;

  constructor(options: AudioMeterOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULTS.intervalMs;
    this.smoothing = options.smoothing ?? DEFAULTS.smoothing;
  }

  onLevel(listener: LevelListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getLevel(): number {
    return this.smoothed;
  }

  /** Inicia o microfone real. Lança se o usuário negar a permissão. */
  async startWebAudio(): Promise<void> {
    this.stopLoop();
    this.mode = 'webaudio';

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioCtx = new Ctx();
    // Navegadores iniciam o AudioContext em 'suspended' até um gesto do
    // usuário. Sem o resume(), o grafo não processa e o nível fica sempre 0.
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0;
    this.timeData = new Uint8Array(new ArrayBuffer(this.analyser.fftSize));
    this.source.connect(this.analyser);

    this.startLoop();
  }

  /** Modo simulador: define o alvo de nível para onde o medidor converge. */
  startSimulator(targetLevel = 0): void {
    this.stopWebAudio();
    this.stopLoop();
    this.mode = 'simulator';
    this.simTarget = clamp01(targetLevel);
    this.startLoop();
  }

  setSimTarget(targetLevel: number): void {
    this.simTarget = clamp01(targetLevel);
  }

  /** Modo external: a Agora empurra o nível do track real. */
  startExternal(): void {
    this.stopWebAudio();
    this.stopLoop();
    this.mode = 'external';
    this.startLoop();
  }

  pushExternalLevel(level: number): void {
    this.externalLevel = clamp01(level);
  }

  private sampleRaw(): number {
    if (this.mode === 'webaudio' && this.analyser && this.timeData) {
      this.analyser.getByteTimeDomainData(this.timeData);
      let sumSquares = 0;
      for (let i = 0; i < this.timeData.length; i++) {
        const centered = (this.timeData[i] - 128) / 128; // -1..1
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / this.timeData.length);
      // Realça a faixa de fala: um RMS ~0.2 já é uma voz firme.
      return clamp01(rms * 3.2);
    }
    if (this.mode === 'external') return this.externalLevel;
    // simulator: converge suavemente para o alvo, com leve tremor natural.
    const jitter = (Math.random() - 0.5) * 0.04;
    return clamp01(this.simTarget + jitter);
  }

  private startLoop(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const raw = this.sampleRaw();
      this.smoothed =
        this.smoothing * this.smoothed + (1 - this.smoothing) * raw;
      const level = clamp01(this.smoothed);
      for (const l of this.listeners) l(level);
    }, this.intervalMs);
  }

  private stopLoop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private stopWebAudio(): void {
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
    this.source = null;
    this.analyser = null;
    this.stream = null;
    this.timeData = null;
    this.audioCtx = null;
  }

  /** Para tudo e zera o nível. Chame no cleanup do componente. */
  stop(): void {
    this.stopLoop();
    this.stopWebAudio();
    this.smoothed = 0;
    for (const l of this.listeners) l(0);
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

/**
 * Converte um nível relativo bruto (0..1) num multiplicador sobre a linha de
 * base habitual do paciente. baselineRef é o nível que representa o tom
 * habitual (1.0x). O resultado é limitado a uma faixa sensata (0.5x..2.0x).
 */
export function levelToMultiplier(level: number, baselineRef: number): number {
  const base = baselineRef > 0.001 ? baselineRef : 0.3;
  const m = level / base;
  return Math.max(0.5, Math.min(2.0, m));
}
