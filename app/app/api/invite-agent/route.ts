import '@/lib/corrigir-token-agora';
import { NextRequest, NextResponse } from 'next/server';
import {
  AgoraClient,
  Agent,
  Area,
  DeepgramSTT,
  ExpiresIn,
  OpenAI,
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
import {
  ferramentaPoliticaAgora,
  INTERRUPT_MS,
  MAX_TOKENS_FALA,
  silencioMs,
  vozDoCliente,
} from '@/lib/voz-cliente';

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

/** Voz Fish Audio. Chave e id só em PROSA_FISH_API_KEY e PROSA_FISH_VOICE_ID. */
function buildVoice() {
  return vozDoCliente();
}

/**
 * Cérebro do cliente virtual.
 *
 * Padrão: LLM gerenciado da Agora (gpt-4o-mini) — sem chave, já conversa, mas
 * NÃO executa a ferramenta de política (ela vive no nosso Custom LLM).
 *
 * Com NEXT_LLM_URL definido (o /api/chat/completions deste app exposto por um
 * túnel HTTPS público), a Agora chama o nosso Custom LLM, que registra e executa
 * `consultarPolitica`. É o caminho que faz o cliente contestar o desconto.
 */
function buildBrain(greeting: string, produtoId?: string) {
  const customLlmUrl = process.env.NEXT_LLM_URL || process.env.PROSA_LLM_URL;
  const ferramenta = ferramentaPoliticaAgora(produtoId);
  const params = {
    max_tokens: MAX_TOKENS_FALA,
    temperature: 0.8,
    top_p: 0.95,
    frequency_penalty: 0.6,
    presence_penalty: 0.4,
  };

  if (customLlmUrl) {
    return new OpenAI({
      apiKey: requireEnv('NEXT_LLM_API_KEY'),
      url: customLlmUrl,
      model: process.env.NEXT_LLM_MODEL ?? 'gpt-4o-mini',
      greetingMessage: greeting,
      failureMessage: MENSAGEM_FALHA_CLIENTE,
      maxHistory: 15,
      params,
    });
  }

  if (!ferramenta) {
    console.warn(
      '[invite-agent] TOOL_BASE_URL e NEXT_LLM_URL vazios; consultarPolitica não roda nesta ligação',
    );
  }

  return new OpenAI({
    model: 'gpt-4o-mini',
    greetingMessage: greeting,
    failureMessage: MENSAGEM_FALHA_CLIENTE,
    maxHistory: 15,
    params,
    ...(ferramenta ? { tools: [ferramenta] } : {}),
  });
}

export async function POST(request: NextRequest) {
  try {
    // --- 1. Parse request ---

    const body: ClientStartRequest = await request.json();
    const { requester_id, channel_name, cenario_id, produto_id } = body;

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
    const produto = await obterProduto(produto_id || cenario.produtoId);
    if (produto_id && !produto) {
      return NextResponse.json(
        { error: 'produto_id inválido' },
        { status: 400 },
      );
    }
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
              interrupt_duration_ms: INTERRUPT_MS,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: 'vad',
            vad_config: {
              silence_duration_ms: silencioMs(),
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
      .withLlm(buildBrain(greeting, produto?.id))
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
