import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  OpenAI,
  OpenAITTS,
} from 'agora-agents';
import { ClientStartRequest, AgentResponse } from '@/types/conversation';
import { DEFAULT_AGENT_UID } from '@/lib/agora';
import {
  CLARA_FAILURE_MESSAGE,
  CLARA_GREETING,
  CLARA_PROMPT,
  CLARA_VOICE_INSTRUCTIONS,
} from '@/lib/clara';

// ADAPTADO NO HACKATHON — baseado em app/api/invite-agent/route.ts do
// quickstart oficial agent-quickstart-nextjs (cópia intacta do original em
// route.ts.orig-quickstart, para auditoria de "preexistente x feito aqui").
//
// Mudanças, todas em campos documentados de persona/join:
//   persona Ada -> Clara (lib/clara.ts), em pt-BR
//   ASR language 'en' -> 'pt-BR' (Deepgram nova-3 suporta pt-BR)
//   TTS MiniMax (voz inglesa) -> OpenAI TTS (multilíngue, voz feminina calorosa)
//   silence_duration_ms 480 -> 1000, para dar tempo de pensar à pessoa idosa
//   LLM gerenciado, com caminho opcional de Custom LLM (brincadeiras do Prosa)
//
// Arquitetura, fluxo de token, nomes de env e ciclo de vida: preservados.

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Voz da Clara.
 *
 * Padrão: preset gerenciado da Agora (`tts-1`) — não precisa de chave de vendor.
 * A voz `nova` é feminina e calorosa, e o modelo é multilíngue, então fala pt-BR.
 *
 * Upgrade (BYOK): com PROSA_TTS_API_KEY definida, usa `gpt-4o-mini-tts`, que
 * aceita o campo `instructions` — é ele que deixa a voz pausada e acolhedora,
 * com sotaque brasileiro. Vale a troca: experiência de voz é 25% da nota.
 */
function buildClaraVoice() {
  const ttsApiKey = process.env.PROSA_TTS_API_KEY;

  if (ttsApiKey) {
    return new OpenAITTS({
      apiKey: ttsApiKey,
      baseUrl: process.env.PROSA_TTS_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.PROSA_TTS_MODEL ?? 'gpt-4o-mini-tts',
      voice: process.env.PROSA_TTS_VOICE ?? 'coral',
      instructions: CLARA_VOICE_INSTRUCTIONS,
      speed: 0.95,
    });
  }

  return new OpenAITTS({
    model: 'tts-1',
    voice: process.env.PROSA_TTS_VOICE ?? 'nova',
    speed: 0.95,
  });
}

/**
 * Cérebro da Clara.
 *
 * Padrão: LLM gerenciado da Agora (gpt-4o-mini) — sem chave, já conversa.
 *
 * Caminho Prosa: com PROSA_LLM_URL definida (o /api/chat/completions deste app
 * exposto por um túnel HTTPS público), a Agora chama o nosso Custom LLM. É ele
 * que executa as brincadeiras e registra as falas para as medidas de texto.
 */
function buildClaraBrain(prosaSessaoId?: number | null) {
  const customLlmUrl = process.env.PROSA_LLM_URL;

  if (customLlmUrl) {
    // A requisição do Custom LLM não traz o canal, então o id da sessão vai
    // na própria URL. É assim que as brincadeiras sabem em qual conversa
    // abrir e fechar as janelas de medida.
    const url = new URL(customLlmUrl);
    if (prosaSessaoId) url.searchParams.set('sid', String(prosaSessaoId));

    return new OpenAI({
      apiKey: requireEnv('PROSA_LLM_API_KEY'),
      url: url.toString(),
      model: process.env.PROSA_LLM_MODEL ?? 'gpt-4o-mini',
      greetingMessage: CLARA_GREETING,
      failureMessage: CLARA_FAILURE_MESSAGE,
      maxHistory: 15,
      params: {
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.95,
      },
    });
  }

  return new OpenAI({
    model: 'gpt-4o-mini',
    greetingMessage: CLARA_GREETING,
    failureMessage: CLARA_FAILURE_MESSAGE,
    maxHistory: 15,
    params: {
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.95,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, prosa_sessao_id } = body;

    // Validate required env vars on first request so misconfiguration surfaces
    // with a clear error message rather than a silent failure.
    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Build and start the agent ---

    // AgoraClient authenticates API calls to the Agora Conversational AI service.
    // area: change to Area.EU or Area.AP for European or Asia-Pacific deployments.
    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    // Pipeline: Deepgram pt-BR (reseller) STT → OpenAI LLM → OpenAI TTS.
    // Omit vendor API keys for supported models — AgentKit infers reseller presets on start.
    const agent = new Agent({
      client,
      instructions: CLARA_PROMPT,
      greeting: CLARA_GREETING,
      failureMessage: CLARA_FAILURE_MESSAGE,
      maxHistory: 50,
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              // Mantido curto de propósito: interromper a Clara é um requisito
              // de produto (a pessoa idosa fala em cima e ela para de falar).
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            // 1000ms (padrão do sample: 480). Pessoa idosa faz pausa longa
            // para pensar; com 480ms a Clara atropelava a fala.
            vad_config: {
              silence_duration_ms: Number(
                process.env.PROSA_SILENCE_MS ?? 1000,
              ),
            },
          },
        },
      },
      // RTM is required for transcript events in the browser client.
      // enable_tools is required for MCP tool invocation.
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      // Required for browser RTM events:
      // - data_channel: 'rtm' enables RTM delivery path for state/metrics/errors
      // - enable_error_message emits AGENT_ERROR payloads
      // - enable_metrics emits AGENT_METRICS latency payloads
      parameters: {
        // web client → ultra-low-latency chorus profile
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          // pt-BR é suportado no nova-3. O ASR nativo (ARES) lista pt-PT,
          // por isso o Prosa usa Deepgram em modo gerenciado.
          language: 'pt-BR',
          punctuation: true,
        }),
      )
      .withLlm(buildClaraBrain(prosa_sessao_id))
      .withTts(buildClaraVoice());

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false, // enable debug to show restful API calls in the console
    });

    const agentId = await session.start();

    return NextResponse.json({
      agent_id: agentId,
      create_ts: Math.floor(Date.now() / 1000),
      state: 'RUNNING',
    } as AgentResponse);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start conversation',
      },
      { status: 500 },
    );
  }
}
