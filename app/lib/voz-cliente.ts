/**
 * Voz e tempos da ligação. A chave e o id da voz vêm só do ambiente.
 */
import { FishAudioTTS, type LlmTool } from 'agora-agents';

export const SILENCIO_MS_PADRAO = 700;
export const INTERRUPT_MS = 160;
export const MAX_TOKENS_FALA = 160;

export function silencioMs(): number {
  const bruto = process.env.PROSA_SILENCE_MS ?? process.env.NEXT_SILENCE_MS;
  const n = Number(bruto ?? SILENCIO_MS_PADRAO);
  return Number.isFinite(n) && n > 0 ? n : SILENCIO_MS_PADRAO;
}

export function vozDoCliente(): FishAudioTTS {
  const key = process.env.PROSA_FISH_API_KEY;
  const referenceId = process.env.PROSA_FISH_VOICE_ID;
  if (!key || !referenceId) {
    throw new Error('Faltam PROSA_FISH_API_KEY e PROSA_FISH_VOICE_ID');
  }
  return new FishAudioTTS({
    key,
    referenceId,
    backend: process.env.PROSA_FISH_BACKEND ?? process.env.PROSA_FISH_MODEL ?? 's2.1-pro',
  });
}

/**
 * Tool HTTPS que a Agora chama no meio da fala, no LLM gerenciado.
 * Sem URL pública a nuvem não alcança este app, então a tool não entra.
 * O Custom LLM (NEXT_LLM_URL) executa a mesma função do lado de cá.
 */
export function ferramentaPoliticaAgora(): LlmTool | null {
  const base = (process.env.TOOL_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (!base) return null;
  return {
    type: 'function',
    function: {
      name: 'consultarPolitica',
      description:
        'Consulta a política comercial do plano (preço, desconto máximo e fidelidade). Use sempre que o vendedor oferecer ou citar um desconto.',
      parameters: {
        type: 'object',
        properties: {
          descontoOferecidoPct: {
            type: ['number', 'null'],
            description:
              'Percentual de desconto que o vendedor ofereceu. Ex.: 30. Use null se não houver número.',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    execution: { mode: 'sync' },
    server: {
      method: 'GET',
      url: `${base}/api/tools/politica?descontoOferecidoPct={{args.descontoOferecidoPct}}`,
      timeout_ms: 5000,
    },
  };
}
