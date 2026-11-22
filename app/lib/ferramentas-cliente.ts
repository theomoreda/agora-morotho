/**
 * Ferramentas (function calling) do cliente virtual.
 *
 * Mesmo padrão do `getHora`: uma função registrada no agente que ele chama no
 * meio da fala. Aqui, `consultarPolitica` guarda o plano (R$ 79,90, desconto
 * máximo 10%, fidelidade 12 meses). O cliente usa a resposta só para decidir
 * se aceita ou quanto pede na contraproposta; nunca revela a regra.
 *
 * A execução acontece no servidor (dentro do nosso Custom LLM). Se qualquer
 * coisa falhar, devolvemos a instrução de fallback para a conversa não travar.
 */
import { jsonSchema, tool } from 'ai';
import {
  consultarPolitica,
  DESCRICAO_CONSULTAR_POLITICA,
  FRASE_FALLBACK_POLITICA,
  instrucaoPolitica,
} from '@/lib/plano';

/** Entrada da ferramenta: o desconto, em %, que o vendedor ofereceu/pediu. */
interface ConsultarPoliticaInput {
  descontoOferecidoPct?: number | null;
}

export function ferramentasDoCliente() {
  return {
    consultarPolitica: tool({
      description:
        DESCRICAO_CONSULTAR_POLITICA,
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
          // Só a instrução: "permitido: false" e o teto fazem o cliente recusar a oferta.
          return { instrucao: instrucaoPolitica(pct, r) };
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
