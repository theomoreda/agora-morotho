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
import { obterCenario, obterProduto, listarMateriais } from '@/lib/data-provider';
import {
  montarPromptCliente,
  montarSaudacaoCliente,
  MENSAGEM_FALHA_CLIENTE,
} from '@/lib/cenario-prompt';
import type { Material } from '@/lib/types';

// Pipeline de voz (base: quickstart agent-quickstart-nextjs).
// Aqui o agente interpreta o CLIENTE virtual do cenário de treino, em pt-BR.
// A persona (instruções/saudação) é montada a partir do cenário recebido.

// agentUid identifies the AI in the RTC channel and shares its default with the client.
const agentUid = String(DEFAULT_AGENT_UID);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/**
 * Voz do cliente virtual.
 *
 * Padrão: preset gerenciado da Agora (`tts-1`) — não precisa de chave de vendor.
 * Upgrade (BYOK): com NEXT_TTS_API_KEY definida, usa `gpt-4o-mini-tts`, que
 * aceita `instructions` e permite ajustar o tom da voz do cliente.
 */
function buildVoice() {
  const ttsApiKey = process.env.NEXT_TTS_API_KEY;

  if (ttsApiKey) {
    return new OpenAITTS({
      apiKey: ttsApiKey,
      baseUrl: process.env.NEXT_TTS_BASE_URL ?? 'https://api.openai.com/v1',
      model: process.env.NEXT_TTS_MODEL ?? 'gpt-4o-mini-tts',
      voice: process.env.NEXT_TTS_VOICE ?? 'alloy',
      speed: 1.0,
    });
  }

  return new OpenAITTS({
    model: 'tts-1',
    voice: process.env.NEXT_TTS_VOICE ?? 'alloy',
    speed: 1.0,
  });
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, cenario_id } = body;

    const appId = requireEnv('NEXT_PUBLIC_AGORA_APP_ID');
    const appCertificate = requireEnv('NEXT_AGORA_APP_CERTIFICATE');

    if (!channel_name || !requester_id) {
      return NextResponse.json(
        { error: 'channel_name and requester_id are required' },
        { status: 400 },
      );
    }

    // --- 2. Montar a persona do cliente a partir do cenário ---

    const cenario = cenario_id ? await obterCenario(cenario_id) : null;
    if (!cenario) {
      return NextResponse.json(
        { error: 'cenario_id inválido ou não informado' },
        { status: 400 },
      );
    }
    const produto = await obterProduto(cenario.produtoId);
    const todosMateriais = await listarMateriais();
    const materiais: Material[] = produto
      ? todosMateriais.filter((m) => produto.materiais.includes(m.id))
      : [];

    const instructions = montarPromptCliente({ cenario, produto, materiais });
    const greeting = montarSaudacaoCliente(cenario);

    // --- 3. Build and start the agent ---

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
    });

    const agent = new Agent({
      client,
      instructions,
      greeting,
      failureMessage: MENSAGEM_FALHA_CLIENTE,
      maxHistory: 50,
      // VAD controls how the agent detects the start and end of a user's turn.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: 'vad',
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: Number(process.env.NEXT_SILENCE_MS ?? 480),
            },
          },
        },
      },
      advancedFeatures: { enable_rtm: true, enable_tools: true },
      parameters: {
        audio_scenario: 'chorus',
        data_channel: 'rtm',
        enable_error_message: true,
        enable_metrics: true,
      },
    })
      .withStt(
        new DeepgramSTT({
          model: 'nova-3',
          language: 'pt-BR',
          punctuation: true,
        }),
      )
      .withLlm(
        new OpenAI({
          model: 'gpt-4o-mini',
          greetingMessage: greeting,
          failureMessage: MENSAGEM_FALHA_CLIENTE,
          maxHistory: 15,
          params: {
            max_tokens: 1024,
            temperature: 0.8,
            top_p: 0.95,
          },
        }),
      )
      .withTts(buildVoice());

    // remoteUids restricts the agent to only process audio from this user
    const session = agent.createSession({
      channel: channel_name,
      agentUid,
      remoteUids: [requester_id],
      idleTimeout: 30,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
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
