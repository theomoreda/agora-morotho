/**
 * Custom LLM do Prosa — endpoint compatível com OpenAI Chat Completions.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 * Derivado de lib/chat-completions.ts do quickstart oficial (o original segue
 * no repositório, intacto), com três acréscimos nossos:
 *
 *   1. function calling para as brincadeiras (lib/brincadeiras.ts)
 *   2. caminho rápido SEM LLM durante o minuto dos bichos (latência ~0)
 *   3. autenticação do endpoint, já que ele fica exposto por túnel público
 *
 * O contrato com a Agora é o mesmo do sample: ela faz POST no formato OpenAI
 * com stream=true e espera SSE — linhas `data: {chunk}` terminando em
 * `data: [DONE]`.
 *
 * Como a sessão é identificada: a requisição do Custom LLM não traz o canal.
 * Por isso o join (app/api/invite-agent) monta a llm.url com `?sid=<id>`, e
 * é daí que sai o id da conversa.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { stepCountIs, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { CLARA_PROMPT } from '@/lib/clara';
import { ferramentasDaClara, respostaRapidaFluencia } from '@/lib/brincadeiras';

type MensagemChat = { role: string; content: unknown };

type CorpoChat = {
  messages?: MensagemChat[];
  model?: string;
  stream?: boolean;
  [chave: string]: unknown;
};

/** Quantos passos de ferramenta a Clara pode dar antes de responder. */
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

/** Monta uma resposta SSE completa a partir de um texto já pronto. */
function sseDeTextoFixo(texto: string, model: string): NextResponse {
  const encoder = new TextEncoder();
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        codificarSse(encoder, id, created, model, {
          role: 'assistant',
          content: '',
        }),
      );
      controller.enqueue(
        codificarSse(encoder, id, created, model, { content: texto }),
      );
      controller.enqueue(codificarSse(encoder, id, created, model, {}, 'stop'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
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

/**
 * O endpoint fica num túnel público para a Agora alcançar. Sem isto, qualquer
 * um na internet gastaria nossa cota de LLM.
 */
function autorizado(request: NextRequest): boolean {
  const esperado = process.env.PROSA_LLM_API_KEY;
  if (!esperado) return true; // sem chave configurada, não bloqueia o dev local

  const cabecalho = request.headers.get('authorization') ?? '';
  const recebido = cabecalho.replace(/^Bearer\s+/i, '').trim();
  return recebido === esperado;
}

export async function prosaChatCompletions(
  request: NextRequest,
): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 });
  }

  const sidCru = request.nextUrl.searchParams.get('sid');
  const sessaoId = sidCru && /^\d+$/.test(sidCru) ? Number(sidCru) : null;

  const modelId = process.env.PROSA_LLM_MODEL ?? 'gpt-4o-mini';

  let corpo: CorpoChat;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const modeloResposta = corpo.model ?? modelId;

  // ── Caminho rápido: minuto dos bichos ───────────────────────────────────
  // Durante a brincadeira a Clara só diz "Isso!", "Continue...". Passar isso
  // pelo LLM custaria centenas de ms por turno e quebraria o ritmo. Aqui a
  // resposta sai sem nenhuma chamada de modelo.
  const rapida = await respostaRapidaFluencia(sessaoId);
  if (rapida) {
    return sseDeTextoFixo(rapida, modeloResposta);
  }

  // ── Caminho normal: LLM com as ferramentas ──────────────────────────────
  const apiKey = process.env.PROSA_OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'PROSA_OPENAI_API_KEY não configurada' },
      { status: 500 },
    );
  }

  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.PROSA_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  });

  const mensagens = (corpo.messages ?? []) as MensagemChat[];

  // A Agora normalmente já envia o system prompt (vem do campo `instructions`
  // do join). Se por qualquer motivo não vier, a Clara não pode virar um
  // assistente genérico falando inglês — então garantimos a persona aqui.
  const temSystem = mensagens.some((m) => m.role === 'system');
  const mensagensFinais = temSystem
    ? mensagens
    : [{ role: 'system', content: CLARA_PROMPT }, ...mensagens];

  const resultado = streamText({
    model: openai(modelId),
    messages: mensagensFinais as NonNullable<
      Parameters<typeof streamText>[0]['messages']
    >,
    tools: ferramentasDaClara(sessaoId),
    // Deixa a Clara chamar uma ferramenta e depois falar, no mesmo turno.
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
        console.error('[prosa-custom-llm] erro no stream:', erro);
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
