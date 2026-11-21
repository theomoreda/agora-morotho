/**
 * As brincadeiras do Prosa, como ferramentas do Custom LLM.
 *
 * FEITO NO HACKATHON (UNMUTE by Agora, 21-22/11/2026).
 *
 * Por que isto precisa ser ferramenta e não só texto no prompt: a medida exige
 * saber **exatamente quais turnos** pertencem a cada brincadeira. Um prompt
 * pedindo "avise quando começar" é sugestão; uma tool é um evento verificável.
 * A Clara chama a ferramenta, o serviço de análise abre a janela e etiqueta as
 * falas que chegam. É isso que transforma conversa em dado.
 *
 * O minuto dos bichos tem um detalhe de latência: enquanto ele roda, a Clara
 * só precisa dizer "Isso!", "Continue...". Mandar isso para o LLM custaria
 * centenas de ms por turno e quebraria o ritmo da brincadeira. Então, com a
 * janela aberta, respondemos de um conjunto fixo, sem chamar o modelo —
 * latência praticamente zero. Ver `respostaRapidaFluencia`.
 */

import { jsonSchema, tool } from 'ai';
import { PALAVRAS_MEMORIA, SEGUNDOS_FLUENCIA } from '@/lib/clara';
import { urlAnalise, type Brincadeira } from '@/lib/prosa-api';

/** Incentivos curtos ditos durante o minuto dos bichos. */
const INCENTIVOS = [
  'Isso!',
  'Continue...',
  'Mais um!',
  'Boa!',
  'Isso mesmo, e mais?',
  'Muito bem, continue.',
] as const;

const FECHAMENTO_FLUENCIA =
  'Muito bem! Você lembrou de bastante bicho. Vamos voltar a conversar.';

/**
 * Estado das janelas abertas, por sessão.
 *
 * Limitação declarada: isto vive na memória deste processo. Com mais de uma
 * instância do Next, uma sessão atendida por outra instância perderia o
 * cronômetro (a janela em si está no banco, essa parte sobrevive). Para o
 * piloto, um processo só resolve; em produção isto vira Redis.
 */
type JanelaAberta = { tipo: Brincadeira; abertaEm: number };
const janelas = new Map<number, JanelaAberta>();

async function chamarAnalise(
  sessaoId: number,
  acao: 'abrir' | 'fechar',
  tipo?: Brincadeira,
): Promise<void> {
  const resposta = await fetch(
    `${urlAnalise()}/api/sessoes/${sessaoId}/brincadeira`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, tipo: tipo ?? null }),
    },
  );
  if (!resposta.ok) {
    throw new Error(`janela de brincadeira: HTTP ${resposta.status}`);
  }
}

export function janelaDe(sessaoId: number): JanelaAberta | undefined {
  return janelas.get(sessaoId);
}

/**
 * Resposta instantânea durante o minuto dos bichos, sem passar pelo LLM.
 *
 * Devolve null quando o minuto não está rolando — aí o fluxo normal segue.
 */
export async function respostaRapidaFluencia(
  sessaoId: number | null,
): Promise<string | null> {
  if (sessaoId === null) return null;

  const janela = janelas.get(sessaoId);
  if (!janela || janela.tipo !== 'fluencia') return null;

  const decorridoS = (Date.now() - janela.abertaEm) / 1000;

  if (decorridoS >= SEGUNDOS_FLUENCIA) {
    janelas.delete(sessaoId);
    try {
      await chamarAnalise(sessaoId, 'fechar');
    } catch (e) {
      console.warn('[prosa] falha ao fechar o minuto dos bichos:', e);
    }
    return FECHAMENTO_FLUENCIA;
  }

  return INCENTIVOS[Math.floor(Math.random() * INCENTIVOS.length)];
}

/**
 * Ferramentas expostas à Clara.
 *
 * `sessaoId` vem do `?sid=` da llm.url, montada no join (invite-agent). A
 * requisição do Custom LLM não traz o canal, então o id da sessão na URL é
 * como amarramos a chamada do LLM à conversa certa.
 */
export function ferramentasDaClara(sessaoId: number | null) {
  const semSessao =
    'Anotado. (Esta conversa não está sendo acompanhada, então não há o que registrar.)';

  return {
    guardar_palavras: tool({
      description:
        'Use no COMEÇO da conversa, quando for pedir à pessoa para guardar ' +
        'três palavras. Devolve quais palavras dizer. Não invente outras.',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => ({
        palavras: PALAVRAS_MEMORIA,
        instrucao:
          'Peça para ela guardar estas três palavras e diga que você vai ' +
          'perguntar no finalzinho. Fale as três, devagar, uma por vez.',
      }),
    }),

    cobrar_palavras: tool({
      description:
        'Use no FIM da conversa, quando for perguntar quais eram as três ' +
        'palavras. Chame ANTES de fazer a pergunta.',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => {
        if (sessaoId === null) return { aviso: semSessao };
        try {
          await chamarAnalise(sessaoId, 'abrir', 'memoria');
        } catch (e) {
          console.warn('[prosa] falha ao abrir janela de memória:', e);
        }
        return {
          instrucao:
            'Pergunte com leveza quais eram as três palavrinhas. Se ela não ' +
            'lembrar, acolha e siga — nunca corrija nem dê nota.',
        };
      },
    }),

    iniciar_minuto_dos_bichos: tool({
      description:
        'Use quando for começar a brincadeira de falar bichos por um ' +
        'minuto. Chame no momento em que a pessoa aceitar brincar.',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => {
        if (sessaoId === null) return { aviso: semSessao };
        try {
          await chamarAnalise(sessaoId, 'abrir', 'fluencia');
          janelas.set(sessaoId, { tipo: 'fluencia', abertaEm: Date.now() });
        } catch (e) {
          console.warn('[prosa] falha ao abrir o minuto dos bichos:', e);
        }
        return {
          segundos: SEGUNDOS_FLUENCIA,
          instrucao:
            'Diga que ela pode começar. Durante o minuto, responda só com ' +
            'incentivos curtos. Não repita os bichos nem puxe outro assunto.',
        };
      },
    }),

    perguntar_o_dia: tool({
      description:
        'Use quando for perguntar, de forma leve, que dia da semana é hoje ' +
        'ou em que mês estamos. Chame ANTES de fazer a pergunta.',
      inputSchema: jsonSchema<Record<string, never>>({
        type: 'object',
        properties: {},
        additionalProperties: false,
      }),
      execute: async () => {
        if (sessaoId === null) return { aviso: semSessao };
        try {
          await chamarAnalise(sessaoId, 'abrir', 'orientacao');
        } catch (e) {
          console.warn('[prosa] falha ao abrir janela de orientação:', e);
        }
        return {
          instrucao:
            'Pergunte de forma natural, como quem puxa assunto. Se ela ' +
            'errar ou não souber, siga em frente sem insistir.',
        };
      },
    }),
  };
}
