import { Agent, DeepgramSTT, FishAudioTTS, OpenAI, type AgoraClient } from 'agora-agents';
import type { PatientProfile } from '@/data/patients';
import { DEFAULT_PROTOCOL, type PracticeProtocol } from '@/lib/contracts';
import { AGENT_NAME, buildGreeting, buildInstructions, FAILURE_MESSAGE, SILENCE_REMINDER, type AgentMode } from './prompts';

export interface VoiceAgentEnv {
  PROSA_FISH_API_KEY?: string;
  PROSA_FISH_VOICE_ID?: string;
  /** Fish Audio backend for BYOK (default speech-1.5) */
  PROSA_FISH_BACKEND?: string;
}

const LANGUAGE = 'pt-BR';

/**
 * Plain, testable description of the agent for a session.
 * Tuning values come from SPEC §voice-agent; T15 recalibrates them on stage.
 */
export function agentSettings(
  mode: AgentMode,
  patient: PatientProfile,
  env: VoiceAgentEnv,
  protocol: PracticeProtocol = DEFAULT_PROTOCOL,
) {
  const fishKey = env.PROSA_FISH_API_KEY;
  const fishVoice = env.PROSA_FISH_VOICE_ID;
  if (!fishKey || !fishVoice) {
    throw new Error('Missing PROSA_FISH_API_KEY / PROSA_FISH_VOICE_ID in .env.local');
  }

  return {
    instructions: buildInstructions(mode, patient, protocol),
    greeting: buildGreeting(mode, patient),
    asr: {
      // Managed Deepgram nova-3. ARES is not usable for pt-BR: the SDK rejects
      // turnDetection.language "pt-BR", which is where ARES reads its language.
      vendor: 'deepgram' as const,
      language: LANGUAGE,
      keywords:
        mode === 'practice'
          ? [patient.name.split(' ')[0], AGENT_NAME, 'treinar', 'engasgo', 'engolir']
          : [patient.medication.name.split(' ')[0], patient.name.split(' ')[0], AGENT_NAME, 'socorro', 'tontura'],
    },
    llm: { model: 'gpt-4.1-mini' as const, temperature: 0.4, maxTokens: 200, maxHistory: 20 },
    tts: { key: fishKey, referenceId: fishVoice, backend: env.PROSA_FISH_BACKEND || 'speech-1.5' },
    turnDetection: {
      config: {
        speech_threshold: 0.5,
        start_of_speech: {
          mode: 'vad' as const,
          vad_config: {
            interrupt_duration_ms: 400, // TV / ambient noise must not cut the agent
            speaking_interrupt_duration_ms: 600, // laptop mic: tolerate TTS echo
            prefix_padding_ms: 300,
          },
        },
        end_of_speech: {
          mode: 'vad' as const, // semantic EoS is en/zh only
          vad_config: { silence_duration_ms: 1800 }, // elderly pauses: 1500–2000 ms
        },
      },
    },
    advancedFeatures: { enable_rtm: true },
    parameters: {
      audio_scenario: 'chorus' as const,
      data_channel: 'rtm' as const,
      enable_error_message: true,
      enable_metrics: true,
      // Practice: no silence reminder — the uplink is muted during attempts and the hub
      // handles "no attempt" itself via think() (P0 decision). V1 modes keep the reminder.
      ...(mode === 'practice'
        ? {}
        : { silence_config: { timeout_ms: 8000, action: 'speak' as const, content: SILENCE_REMINDER } }),
    },
  };
}

/** Maps the settings onto the Agora SDK builder (no network calls). */
export function buildAgent(
  client: AgoraClient,
  mode: AgentMode,
  patient: PatientProfile,
  env: VoiceAgentEnv,
  protocol: PracticeProtocol = DEFAULT_PROTOCOL,
) {
  const s = agentSettings(mode, patient, env, protocol);

  const stt = new DeepgramSTT({ model: 'nova-3', language: s.asr.language, keyterm: s.asr.keywords[0] });

  return new Agent({
    client,
    turnDetection: s.turnDetection,
    advancedFeatures: s.advancedFeatures,
    parameters: s.parameters,
  })
    .withStt(stt)
    .withLlm(
      new OpenAI({
        model: s.llm.model,
        systemMessages: [{ role: 'system', content: s.instructions }],
        greetingMessage: s.greeting,
        failureMessage: FAILURE_MESSAGE,
        maxHistory: s.llm.maxHistory,
        params: { max_tokens: s.llm.maxTokens, temperature: s.llm.temperature },
      }),
    )
    .withTts(new FishAudioTTS(s.tts));
}
