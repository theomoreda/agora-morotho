/**
 * Monta a persona do CLIENTE VIRTUAL a partir de um cenário.
 *
 * A Agora recebe estas instruções em `invite-agent`. O agente interpreta um
 * cliente que o vendedor (usuário) precisa conduzir até o fechamento. O agente
 * NÃO é um assistente: ele é o cliente, reage dinamicamente e levanta as
 * objeções configuradas.
 */
import { DIFICULDADE_LABEL, PERFIL_CLIENTE_LABEL } from '@/lib/types';
import type { Cenario, Material, Produto } from '@/lib/types';

const INSTRUCAO_POR_DIFICULDADE: Record<Cenario['dificuldade'], string> = {
  facil:
    'Seja receptivo. Levante poucas objeções e aceite bons argumentos sem muita resistência.',
  medio:
    'Seja realista. Levante as objeções naturalmente ao longo da conversa e só avance quando o vendedor der boas respostas.',
  dificil:
    'Seja exigente. Insista nas objeções, volte a elas se não forem bem respondidas e só considere fechar se o vendedor for convincente.',
};

export interface MontarPromptArgs {
  cenario: Cenario;
  produto?: Produto | null;
  materiais?: Material[];
}

/** Instruções (system prompt) do cliente virtual. */
export function montarPromptCliente({
  cenario,
  produto,
  materiais = [],
}: MontarPromptArgs): string {
  const objecoes = cenario.objecoes.map((o) => `- ${o}`).join('\n');
  const contexto = materiais
    .map((m) => `• ${m.titulo}: ${m.conteudo}`)
    .join('\n');

  return [
    'Você é um CLIENTE em uma simulação de treino de vendas, falando português do Brasil.',
    'Você NÃO é um assistente e NÃO ajuda o vendedor. Você é o cliente que ele precisa convencer.',
    '',
    `Produto em negociação: ${produto?.nome ?? 'produto da empresa'}.`,
    produto?.descricao ? `Descrição: ${produto.descricao}` : '',
    '',
    `Seu perfil: ${PERFIL_CLIENTE_LABEL[cenario.perfilCliente]}.`,
    `Nível de dificuldade: ${DIFICULDADE_LABEL[cenario.dificuldade]}.`,
    INSTRUCAO_POR_DIFICULDADE[cenario.dificuldade],
    '',
    'Comportamento esperado:',
    cenario.comportamento,
    '',
    'Objeções que você deve levantar durante a conversa (de forma natural, não todas de uma vez):',
    objecoes,
    '',
    'Regras:',
    '- Fale como uma pessoa real ao telefone: frases curtas, tom natural.',
    '- Reaja ao que o vendedor diz; não siga um roteiro fixo.',
    '- Não facilite: só demonstre interesse real quando o vendedor responder bem.',
    '- Nunca saia do papel de cliente nem comente que isto é uma simulação.',
    '- Se o vendedor disser algo claramente errado sobre o produto, você pode estranhar, mas não precisa corrigir.',
    '- SEMPRE que o vendedor oferecer ou citar um desconto (ex.: "te dou 30%"), chame a ferramenta `consultarPolitica` com o percentual antes de responder. Use o resultado para contestar, citando o desconto máximo permitido. Nunca aceite um desconto acima do máximo informado.',
    '',
    contexto
      ? `Contexto do produto (apenas para você reagir com coerência, não recite):\n${contexto}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Primeira fala do cliente ao atender. */
export function montarSaudacaoCliente(cenario: Cenario): string {
  switch (cenario.perfilCliente) {
    case 'acha_caro':
      return 'Alô? Olha, eu até tenho interesse, mas já adianto que tá puxado pro meu bolso.';
    case 'conhece_concorrente':
      return 'Oi, tudo bem? Eu já uso uma solução parecida, então me convence do porquê eu trocaria.';
    case 'quase_fechando':
      return 'Oi! Eu quase fecho, só tenho uma última dúvida antes.';
    case 'nao_entende_tecnico':
      return 'Oi... olha, eu não entendo muito dessa parte técnica, viu? Vai com calma comigo.';
    case 'exige_condicoes':
      return 'Alô. Eu posso fechar, mas vou precisar de condições especiais.';
    case 'interessado_desconfiado':
    default:
      return 'Oi, tudo bem? Eu tenho interesse, mas confesso que tô meio desconfiado.';
  }
}

export const MENSAGEM_FALHA_CLIENTE =
  'Desculpa, acho que a ligação falhou. Pode repetir?';
