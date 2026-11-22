/**
 * Voz e tempos da ligação. A chave e o id da voz vêm só do ambiente.
 */
import { FishAudioTTS, type LlmTool, type TtsConfig } from 'agora-agents';
import { DESCRICAO_CONSULTAR_POLITICA } from '@/lib/plano';

export const SILENCIO_MS_PADRAO = 700;
export const INTERRUPT_MS = 160;
export const MAX_TOKENS_FALA = 160;

export function silencioMs(): number {
  const bruto = process.env.PROSA_SILENCE_MS ?? process.env.NEXT_SILENCE_MS;
  const n = Number(bruto ?? SILENCIO_MS_PADRAO);
  return Number.isFinite(n) && n > 0 ? n : SILENCIO_MS_PADRAO;
}

/**
 * Fish no modo gerenciado da Agora: a nuvem da Agora paga a síntese, sem chave
 * nem crédito na conta Fish. O SDK 2.9 não expõe esse modo para a Fish.
 */
class FishAudioGerenciado extends FishAudioTTS {
  constructor(private readonly referenceId: string) {
    super({ key: '', referenceId, backend: 's2.1-pro' });
  }

  toConfig(): TtsConfig {
    return {
      vendor: 'fishaudio',
      credential_mode: 'managed',
      params: { reference_id: this.referenceId, backend: 's2.1-pro' },
    } as unknown as TtsConfig;
  }
}

/**
 * Padrão: modo gerenciado. A conta Fish da chave própria ficou sem crédito
 * (402), o que derruba a voz com o erro -1000 da Agora.
 * PROSA_FISH_CREDENTIAL=byok volta a usar PROSA_FISH_API_KEY.
 */
export function vozDoCliente(): FishAudioTTS {
  const referenceId = process.env.PROSA_FISH_VOICE_ID;
  if (!referenceId) {
    throw new Error('Falta PROSA_FISH_VOICE_ID');
  }
  if (process.env.PROSA_FISH_CREDENTIAL !== 'byok') {
    return new FishAudioGerenciado(referenceId);
  }
  const key = process.env.PROSA_FISH_API_KEY;
  if (!key) {
    throw new Error('PROSA_FISH_CREDENTIAL=byok exige PROSA_FISH_API_KEY');
  }
  return new FishAudioTTS({
    key,
    referenceId,
    backend: process.env.PROSA_FISH_BACKEND ?? process.env.PROSA_FISH_MODEL ?? 'speech-1.5',
  });
}

/**
 * Tool HTTPS que a Agora chama no meio da fala, no LLM gerenciado.
 * Sem URL pública a nuvem não alcança este app, então a tool não entra.
 * O Custom LLM (NEXT_LLM_URL) executa a mesma função do lado de cá.
 */
export function ferramentaPoliticaAgora(produtoId?: string): LlmTool | null {
  const base = (process.env.TOOL_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (!base) return null;
  const produto = produtoId ? `&produto=${encodeURIComponent(produtoId)}` : '';
  return {
    type: 'function',
    function: {
      name: 'consultarPolitica',
      description: DESCRICAO_CONSULTAR_POLITICA,
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
      url: `${base}/api/tools/politica?descontoOferecidoPct={{args.descontoOferecidoPct}}${produto}`,
      timeout_ms: 5000,
    },
  };
}
