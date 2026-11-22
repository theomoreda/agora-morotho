import { describe, expect, it } from 'vitest';
import { AgoraClient, Area } from 'agora-agents';
import { HELENA_PK_PROFILE, HELENA_PROFILE } from '@/data/patients';
import { DEFAULT_PROTOCOL } from '@/lib/contracts';
import { agentSettings, buildAgent, type VoiceAgentEnv } from './config';
import { buildInstructions, buildGreeting } from './prompts';

const env: VoiceAgentEnv = {
  PROSA_FISH_API_KEY: 'sk-fish-test',
  PROSA_FISH_VOICE_ID: 'voice-test',
};

describe('prompts (deprecated V1 modes)', () => {
  it('check-in greeting addresses the patient and asks Q1 (disposition)', () => {
    const g = buildGreeting('checkin', HELENA_PROFILE);
    expect(g).toContain('Dona Helena');
    expect(g).toMatch(/como a senhora está se sentindo/i);
  });

  it('emergency greeting asks if everything is ok', () => {
    expect(buildGreeting('emergency', HELENA_PROFILE)).toMatch(/ouvi um chamado.*está tudo bem/i);
  });

  it('check-in instructions follow the fixed Q1 → Q2 → Q3 order with the scheduled medication', () => {
    const p = buildInstructions('checkin', HELENA_PROFILE);
    const q2 = p.indexOf('Losartana 50mg');
    const q3 = p.search(/manhã, de tarde ou de noite/);
    expect(q2).toBeGreaterThan(-1);
    expect(q3).toBeGreaterThan(q2);
  });

  it.each(['checkin', 'emergency'] as const)('%s instructions carry the clinical guardrails', (mode) => {
    const p = buildInstructions(mode, HELENA_PROFILE).toLowerCase();
    for (const rule of ['nunca altere dose', 'nunca diagnostique', 'nunca prescreva', 'enfermagem']) {
      expect(p).toContain(rule);
    }
  });
});

describe('agentSettings (V1 check-in)', () => {
  const s = agentSettings('checkin', HELENA_PROFILE, env);

  it('uses VAD end-of-speech tolerant to elderly pauses (1500–2000 ms)', () => {
    const eos = s.turnDetection.config?.end_of_speech;
    expect(eos?.mode).toBe('vad');
    const silence = eos?.vad_config?.silence_duration_ms ?? 0;
    expect(silence).toBeGreaterThanOrEqual(1500);
    expect(silence).toBeLessThanOrEqual(2000);
  });

  it('resists spurious interruptions from TV noise and TTS echo', () => {
    const sos = s.turnDetection.config?.start_of_speech?.vad_config;
    expect(sos?.interrupt_duration_ms ?? 0).toBeGreaterThanOrEqual(400);
    expect(sos?.speaking_interrupt_duration_ms ?? 0).toBeGreaterThanOrEqual(600);
  });

  it('reassures the patient after 8 s of silence instead of hanging up', () => {
    expect(s.parameters.silence_config).toEqual({
      timeout_ms: 8000,
      action: 'speak',
      content: 'Estou aqui, pode falar com calma.',
    });
  });

  it('enables RTM delivery of state, transcripts and metrics', () => {
    expect(s.advancedFeatures.enable_rtm).toBe(true);
    expect(s.parameters.data_channel).toBe('rtm');
    expect(s.parameters.enable_metrics).toBe(true);
  });

  it('defaults ASR to managed Deepgram pt-BR with medication/name hotwords', () => {
    expect(s.asr).toMatchObject({ vendor: 'deepgram', language: 'pt-BR' });
    expect(s.asr.keywords).toEqual(expect.arrayContaining(['Losartana', 'Helena']));
  });

  it('uses the team-chosen Fish Audio voice', () => {
    expect(s.tts).toEqual({ key: 'sk-fish-test', referenceId: 'voice-test', backend: 'speech-1.5' });
  });

  it('fails fast when the Fish Audio credentials are missing', () => {
    expect(() => agentSettings('checkin', HELENA_PROFILE, {})).toThrow(/PROSA_FISH_API_KEY/);
  });
});

describe('buildAgent', () => {
  it('maps settings onto the Agora SDK agent without network calls', () => {
    const client = new AgoraClient({ area: Area.US, appId: 'app', appCertificate: 'cert' });
    const agent = buildAgent(client, 'emergency', HELENA_PROFILE, env);
    expect(agent.turnDetection?.config?.end_of_speech?.vad_config?.silence_duration_ms).toBe(1800);
    expect(agent.parameters).toMatchObject({ data_channel: 'rtm' });
    expect(JSON.stringify(agent.llm)).toMatch(/ouvi um chamado/i);
    expect(JSON.stringify(agent.tts)).toContain('voice-test');
    expect(JSON.stringify(agent.stt)).toContain('pt-BR');
  });
});

// =====================================================================
// v2 — practice (voice coach)
// =====================================================================

describe('practice prompts', () => {
  const custom = { ...DEFAULT_PROTOCOL, phrases: ['Bom dia, tudo bem?', 'Eu quero um copo de água.', 'Quero um café com leite.'] };
  const p = buildInstructions('practice', HELENA_PK_PROFILE, custom);

  it('greets by name and asks a spoken question (habitual-voice calibration)', () => {
    const g = buildGreeting('practice', HELENA_PK_PROFILE);
    expect(g).toContain('Dona Helena');
    expect(g).toContain('Gabriel');
    expect(g).toMatch(/como a senhora está hoje\?$/);
  });

  it("embeds the therapist's protocol: Aaa target and the three phrases in order", () => {
    expect(p).toContain('meta da fonoaudióloga: 8 segundos');
    const idx = custom.phrases.map((f) => p.indexOf(`"${f}"`));
    expect(idx.every((i) => i > -1)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
  });

  it('explains [APP] messages and forbids speaking dB values', () => {
    expect(p).toContain('[APP]');
    expect(p).toMatch(/NÃO são falas da paciente/);
    expect(p).toMatch(/Nunca fale em decibéis/);
    expect(p).toMatch(/exatamente como veio/);
  });

  it('keeps the safety guardrails: no diagnosis/prescription, no protocol changes, dysphagia → therapist', () => {
    const lower = p.toLowerCase();
    for (const rule of ['nunca diagnostique', 'nunca prescreva', 'nunca mude o treino', 'engasgo', 'avisar a fonoaudióloga']) {
      expect(lower).toContain(rule);
    }
  });
});

describe('agentSettings (practice)', () => {
  const s = agentSettings('practice', HELENA_PK_PROFILE, env);

  it('has no silence reminder (the hub mutes the uplink during attempts)', () => {
    expect(s.parameters).not.toHaveProperty('silence_config');
  });

  it('keeps elderly-friendly turn detection and RTM', () => {
    expect(s.turnDetection.config?.end_of_speech?.vad_config?.silence_duration_ms).toBe(1800);
    expect(s.advancedFeatures.enable_rtm).toBe(true);
  });

  it('boosts the patient name, agent name and dysphagia words in ASR', () => {
    expect(s.asr.keywords).toEqual(expect.arrayContaining(['Helena', 'Gabriel', 'engasgo']));
    expect(s.asr.keywords).not.toContain('socorro');
  });

  it('defaults to the standard protocol and uses the coach persona in the built agent', () => {
    const client = new AgoraClient({ area: Area.US, appId: 'app', appCertificate: 'cert' });
    const agent = buildAgent(client, 'practice', HELENA_PK_PROFILE, env);
    const llm = JSON.stringify(agent.llm);
    expect(llm).toContain('treinador de voz');
    expect(llm).toContain(DEFAULT_PROTOCOL.phrases[2]);
  });
});
