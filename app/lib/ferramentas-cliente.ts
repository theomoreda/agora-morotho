/**
 * Ferramentas (function calling) do cliente virtual.
 *
 * Mesmo padrão do `getHora`: uma função registrada no agente que ele chama no
 * meio da fala. Aqui, `consultarPolitica` guarda o plano (R$ 79,90, desconto
 * máximo 10%, fidelidade 12 meses) e responde quando o vendedor oferece algo
 * fora da regra — o cliente então contesta citando o número correto.
 *
 * A execução acontece no servidor (dentro do nosso Custom LLM). Se qualquer
 * coisa falhar, devolvemos a frase pronta de fallback e instruímos o cliente a
 * recusar mesmo assim, para a conversa não travar.
 */
import { jsonSchema, tool } from 'ai';
import {
  consultarPolitica,
  FRASE_FALLBACK_POLITICA,
  PLANO,
} from '@/lib/plano';

/** Entrada da ferramenta: o desconto, em %, que o vendedor ofereceu/pediu. */
interface ConsultarPoliticaInput {
  descontoOferecidoPct?: number | null;
}

export function ferramentasDoCliente() {
  return {
    consultarPolitica: tool({
      description:
        'Consulta a política comercial do plano (preço, desconto máximo e ' +
        'fidelidade). Use SEMPRE que o vendedor oferecer ou citar um desconto, ' +
        'ou prometer uma condição comercial, para saber o que é permitido antes ' +
        'de responder.',
      inputSchema: jsonSchema<ConsultarPoliticaInput>({
        type: 'object',
        properties: {
          descontoOferecidoPct: {
            type: ['number', 'null'],
            description:
              'Percentual de desconto que o vendedor ofereceu ou que está em ' +
              'discussão. Ex.: 30 para "30% de desconto". Use null se não houver ' +
              'um número claro.',
          },
        },
        required: [],
        additionalProperties: false,
      }),
      execute: async ({ descontoOferecidoPct }: ConsultarPoliticaInput) => {
        try {
          const pct =
            typeof descontoOferecidoPct === 'number'
              ? descontoOferecidoPct
              : null;
          const r = consultarPolitica(pct);
          return {
            plano: PLANO.nome,
            precoMensal: r.precoMensal,
            descontoMaximoPct: r.descontoMaximoPct,
            fidelidadeMeses: r.fidelidadeMeses,
            permitido: r.permitido,
            // Instrução explícita para o cliente contestar com o número certo.
            instrucao: r.permitido
              ? `${r.resumo} Você pode aceitar essa condição.`
              : `${r.resumo} Recuse o desconto oferecido e cite que o máximo é ${r.descontoMaximoPct}%.`,
          };
        } catch (erro) {
          console.error('[consultarPolitica] falha, usando fallback:', erro);
          // Fallback: a regra caiu, mas o cliente não pode travar nem aceitar.
          return {
            erro: true,
            instrucao: FRASE_FALLBACK_POLITICA,
          };
        }
      },
    }),
  };
}
