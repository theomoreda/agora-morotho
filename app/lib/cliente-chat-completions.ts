/**
 * Custom LLM do cliente virtual — endpoint compatível com OpenAI Chat
 * Completions que a Agora chama durante a conversa.
 *
 * É aqui que a ferramenta `consultarPolitica` fica registrada e é executada no
 * servidor (function calling). O contrato com a Agora é o do sample: POST no
 * formato OpenAI com stream=true, resposta em SSE (`data: {chunk}` terminando
 * em `data: [DONE]`).
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { stepCountIs, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ferramentasDoCliente } from '@/lib/ferramentas-cliente';

type MensagemChat = { role: string; content: unknown };
type CorpoChat = {
  messages?: MensagemChat[];
  model?: string;
  stream?: boolean;
  [chave: string]: unknown;
};

/** Passos de ferramenta permitidos antes de o cliente responder. */
const MAX_PASSOS = 4;

function codificarSse(
  encoder: TextEncoder,
  id: string,
  created: number,
  model: string,
  delta: Record<string, unknown>,
  finishReason: string | null = null,
): Uint8Array {
  return encoder.encode(
    `data: ${JSON.stringify({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [{ index: 0, delta, finish_reason: finishReason }],
    })}\n\n`,
  );
}

/**
 * O endpoint fica num túnel público para a Agora alcançar. Sem isto, qualquer
 * um na internet gastaria nossa cota de LLM.
 */
function autorizado(request: NextRequest): boolean {
  const esperado = process.env.NEXT_LLM_API_KEY;
  if (!esperado) return true; // sem chave configurada, não bloqueia o dev local
  const cabecalho = request.headers.get('authorization') ?? '';
  const recebido = cabecalho.replace(/^Bearer\s+/i, '').trim();
  return recebido === esperado;
}

export async function clienteChatCompletions(
  request: NextRequest,
): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }

  const apiKey = process.env.NEXT_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEXT_OPENAI_API_KEY não configurada' },
      { status: 500 },
    );
  }

  const modelId = process.env.NEXT_LLM_MODEL ?? 'gpt-4o-mini';

  let corpo: CorpoChat;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const modeloResposta = corpo.model ?? modelId;
  const mensagens = corpo.messages ?? [];

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.NEXT_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  });

  const resultado = streamText({
    model: openai(modelId),
    messages: mensagens as NonNullable<
      Parameters<typeof streamText>[0]['messages']
    >,
    tools: ferramentasDoCliente(),
    // Deixa o cliente chamar a ferramenta e depois falar, no mesmo turno.
    stopWhen: stepCountIs(MAX_PASSOS),
  });

  const encoder = new TextEncoder();
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          codificarSse(encoder, id, created, modeloResposta, {
            role: 'assistant',
            content: '',
          }),
        );
        for await (const pedaco of resultado.textStream) {
          controller.enqueue(
            codificarSse(encoder, id, created, modeloResposta, {
              content: pedaco,
            }),
          );
        }
        controller.enqueue(
          codificarSse(encoder, id, created, modeloResposta, {}, 'stop'),
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (erro) {
        console.error('[cliente-custom-llm] erro no stream:', erro);
        controller.error(erro);
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
