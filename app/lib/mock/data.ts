/**
 * Dados simulados da demo.
 *
 * Reproduz o roteiro de demonstração do projeto: 1 produto, 3 perfis de
 * cliente, 2 vendedores (um domina o produto, outro comete erros) e as
 * avaliações que o gestor compara. Tudo em memória — o `data-provider` lê daqui
 * hoje e, no futuro, do back-end.
 */
import type {
  Atribuicao,
  Avaliacao,
  Cenario,
  Criterio,
  Material,
  Produto,
  Vendedor,
} from '@/lib/types';

// ── Rubrica padrão (pesos do documento do projeto) ──────────────────────────

export const CRITERIOS_PADRAO: Criterio[] = [
  {
    id: 'crit-conhecimento',
    nome: 'Conhecimento do produto',
    descricao:
      'Domina características, diferenciais e limitações do produto, sem inventar informação.',
    peso: 25,
  },
  {
    id: 'crit-descoberta',
    nome: 'Descoberta de necessidades',
    descricao:
      'Faz perguntas que revelam a real necessidade e o contexto do cliente.',
    peso: 20,
  },
  {
    id: 'crit-argumentacao',
    nome: 'Argumentação',
    descricao:
      'Conecta benefícios do produto à necessidade descoberta, com clareza.',
    peso: 20,
  },
  {
    id: 'crit-objecoes',
    nome: 'Contorno de objeções',
    descricao: 'Responde objeções com segurança, sem agressividade nem rendição.',
    peso: 20,
  },
  {
    id: 'crit-fechamento',
    nome: 'Fechamento',
    descricao: 'Conduz para o próximo passo e propõe o fechamento no momento certo.',
    peso: 15,
  },
];

// ── Materiais e produto ─────────────────────────────────────────────────────

export const MATERIAIS: Material[] = [
  {
    id: 'mat-catalogo',
    titulo: 'Catálogo — Plano Gestão 360',
    tipo: 'catalogo',
    conteudo:
      'Plano Gestão 360: software de gestão para PMEs. Módulos de financeiro, estoque e vendas. Preço a partir de R$ 299/mês, até 10 usuários. Integração com NF-e. Suporte por chat em horário comercial.',
    atualizadoEm: '2026-11-01',
  },
  {
    id: 'mat-politica',
    titulo: 'Política comercial e descontos',
    tipo: 'politica',
    conteudo:
      'Desconto máximo de 15% para pagamento anual à vista. Teste grátis de 14 dias. Migração de dados inclusa no plano anual. Não oferecemos customização sob medida no plano de entrada.',
    atualizadoEm: '2026-11-05',
  },
  {
    id: 'mat-processo',
    titulo: 'Processo de vendas consultivo',
    tipo: 'processo',
    conteudo:
      'Etapas: abertura e rapport, descoberta de necessidades, demonstração focada na dor, contorno de objeções, proposta e fechamento. Sempre confirmar o próximo passo com data.',
    atualizadoEm: '2026-11-03',
  },
];

export const PRODUTOS: Produto[] = [
  {
    id: 'prod-gestao360',
    nome: 'Plano Gestão 360',
    descricao: 'Software de gestão para pequenas e médias empresas.',
    materiais: ['mat-catalogo', 'mat-politica', 'mat-processo'],
  },
];

// ── Cenários (3 perfis de cliente) ──────────────────────────────────────────

export const CENARIOS: Cenario[] = [
  {
    id: 'cen-desconfiado',
    titulo: 'Cliente interessado, mas desconfiado',
    produtoId: 'prod-gestao360',
    perfilCliente: 'interessado_desconfiado',
    dificuldade: 'medio',
    objetivo: 'Gerar confiança e agendar uma demonstração.',
    objecoes: [
      'Já tentei outros sistemas e não funcionaram.',
      'Como sei que meus dados ficam seguros?',
      'Não quero ficar preso em contrato longo.',
    ],
    comportamento:
      'Demonstra interesse, mas questiona tudo. Precisa de provas concretas e referências antes de avançar.',
    criterios: CRITERIOS_PADRAO,
    criadoEm: '2026-11-10',
  },
  {
    id: 'cen-caro',
    titulo: 'Cliente acha o produto caro',
    produtoId: 'prod-gestao360',
    perfilCliente: 'acha_caro',
    dificuldade: 'dificil',
    objetivo: 'Demonstrar valor e sustentar o preço sem desconto desnecessário.',
    objecoes: [
      'Está acima do meu orçamento.',
      'O concorrente cobra metade.',
      'Só fecho se der 30% de desconto.',
    ],
    comportamento:
      'Volta ao preço o tempo todo. Tenta forçar desconto fora da política. Responde bem a argumentos de retorno sobre investimento.',
    criterios: CRITERIOS_PADRAO,
    criadoEm: '2026-11-10',
  },
  {
    id: 'cen-concorrente',
    titulo: 'Cliente que conhece o concorrente',
    produtoId: 'prod-gestao360',
    perfilCliente: 'conhece_concorrente',
    dificuldade: 'dificil',
    objetivo: 'Diferenciar a solução sem atacar o concorrente.',
    objecoes: [
      'O concorrente X já faz isso há anos.',
      'Por que eu trocaria do que já uso?',
      'Vocês têm integração com NF-e como eles?',
    ],
    comportamento:
      'Compara ponto a ponto com o concorrente. Conhece o mercado e percebe exageros. Valoriza honestidade.',
    criterios: CRITERIOS_PADRAO,
    criadoEm: '2026-11-11',
  },
];

// ── Vendedores ──────────────────────────────────────────────────────────────

export const VENDEDORES: Vendedor[] = [
  {
    id: 'vend-ana',
    nome: 'Ana Ribeiro',
    email: 'ana.ribeiro@empresa.com',
    mediaGeral: 88,
  },
  {
    id: 'vend-bruno',
    nome: 'Bruno Costa',
    email: 'bruno.costa@empresa.com',
    mediaGeral: 54,
  },
];

// ── Atribuições ─────────────────────────────────────────────────────────────

export const ATRIBUICOES: Atribuicao[] = [
  {
    id: 'atr-1',
    cenarioId: 'cen-desconfiado',
    vendedorId: 'vend-ana',
    prazo: '2026-11-25',
    status: 'concluida',
    avaliacaoId: 'aval-ana-desconfiado',
  },
  {
    id: 'atr-2',
    cenarioId: 'cen-caro',
    vendedorId: 'vend-ana',
    prazo: '2026-11-28',
    status: 'pendente',
    avaliacaoId: null,
  },
  {
    id: 'atr-3',
    cenarioId: 'cen-desconfiado',
    vendedorId: 'vend-bruno',
    prazo: '2026-11-25',
    status: 'concluida',
    avaliacaoId: 'aval-bruno-desconfiado',
  },
  {
    id: 'atr-4',
    cenarioId: 'cen-caro',
    vendedorId: 'vend-bruno',
    prazo: '2026-11-28',
    status: 'pendente',
    avaliacaoId: null,
  },
];

// ── Avaliações (uma boa, uma fraca — para o gestor comparar) ─────────────────

export const AVALIACOES: Avaliacao[] = [
  {
    id: 'aval-ana-desconfiado',
    atribuicaoId: 'atr-1',
    cenarioId: 'cen-desconfiado',
    vendedorId: 'vend-ana',
    realizadaEm: '2026-11-20',
    notaFinal: 88,
    notasPorCriterio: [
      {
        criterioId: 'crit-conhecimento',
        criterioNome: 'Conhecimento do produto',
        peso: 25,
        nota: 92,
        evidencias: [
          '"O plano de entrada vai até 10 usuários e já inclui NF-e."',
        ],
        comentario: 'Citou corretamente limites e integrações do plano.',
      },
      {
        criterioId: 'crit-descoberta',
        criterioNome: 'Descoberta de necessidades',
        peso: 20,
        nota: 90,
        evidencias: [
          '"Hoje quantas pessoas mexem no financeiro aí na empresa?"',
        ],
        comentario: 'Boas perguntas abertas antes de apresentar a solução.',
      },
      {
        criterioId: 'crit-argumentacao',
        criterioNome: 'Argumentação',
        peso: 20,
        nota: 86,
        evidencias: ['"Como você mencionou o retrabalho, o módulo de estoque..."'],
        comentario: 'Ligou benefício à dor levantada pelo cliente.',
      },
      {
        criterioId: 'crit-objecoes',
        criterioNome: 'Contorno de objeções',
        peso: 20,
        nota: 85,
        evidencias: ['"Entendo a insegurança; por isso temos teste de 14 dias."'],
        comentario: 'Usou o teste grátis para reduzir o risco percebido.',
      },
      {
        criterioId: 'crit-fechamento',
        criterioNome: 'Fechamento',
        peso: 15,
        nota: 84,
        evidencias: ['"Podemos agendar a demo para quinta às 10h?"'],
        comentario: 'Propôs próximo passo com data concreta.',
      },
    ],
    errosIdentificados: [],
    pontosDeMelhoria: [
      'Confirmar o orçamento do cliente mais cedo na conversa.',
    ],
  },
  {
    id: 'aval-bruno-desconfiado',
    atribuicaoId: 'atr-3',
    cenarioId: 'cen-desconfiado',
    vendedorId: 'vend-bruno',
    realizadaEm: '2026-11-20',
    notaFinal: 54,
    notasPorCriterio: [
      {
        criterioId: 'crit-conhecimento',
        criterioNome: 'Conhecimento do produto',
        peso: 25,
        nota: 45,
        evidencias: ['"Acho que dá uns 20 usuários no plano básico."'],
        comentario:
          'Informação incorreta: o plano de entrada vai até 10 usuários.',
      },
      {
        criterioId: 'crit-descoberta',
        criterioNome: 'Descoberta de necessidades',
        peso: 20,
        nota: 50,
        evidencias: ['Partiu direto para a demonstração sem perguntar o contexto.'],
        comentario: 'Pouca descoberta antes de apresentar o produto.',
      },
      {
        criterioId: 'crit-argumentacao',
        criterioNome: 'Argumentação',
        peso: 20,
        nota: 58,
        evidencias: ['"É muito bom, confia."'],
        comentario: 'Argumentos genéricos, sem conectar à necessidade.',
      },
      {
        criterioId: 'crit-objecoes',
        criterioNome: 'Contorno de objeções',
        peso: 20,
        nota: 60,
        evidencias: ['"Então eu te dou um desconto maior."'],
        comentario: 'Cedeu desconto em vez de reforçar valor.',
      },
      {
        criterioId: 'crit-fechamento',
        criterioNome: 'Fechamento',
        peso: 15,
        nota: 55,
        evidencias: ['Encerrou sem combinar um próximo passo.'],
        comentario: 'Não houve proposta clara de fechamento.',
      },
    ],
    errosIdentificados: [
      'Disse que o plano básico tem 20 usuários (são 10).',
      'Ofereceu desconto acima da política (máximo de 15%).',
    ],
    pontosDeMelhoria: [
      'Revisar os limites do plano de entrada no catálogo.',
      'Fazer descoberta antes de demonstrar.',
      'Sustentar o preço com valor antes de recorrer a desconto.',
    ],
  },
];
