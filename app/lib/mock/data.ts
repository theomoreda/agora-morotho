/**
 * Dados simulados da demo.
 *
 * Reproduz o roteiro de demonstração do projeto: 2 produtos, 3 perfis de
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
  {
    id: 'mat-catalogo-combo',
    titulo: 'Catálogo — Combo Conecta Total',
    tipo: 'catalogo',
    conteudo:
      'Combo Conecta Total: telefonia móvel, internet banda larga, TV por assinatura e streaming numa fatura só, por R$ 249,90/mês. Móvel: 1 linha 5G com 40 GB, ligações e WhatsApp ilimitados; linha adicional por R$ 39,90/mês, até 3 adicionais. Banda larga: fibra de 600 Mega com Wi-Fi 6 e instalação grátis. TV: 120 canais, sendo 80 em HD, com 1 ponto incluso; ponto adicional por R$ 19,90/mês. Streaming: Netflix padrão com anúncios e Globoplay inclusos. Separados, os quatro serviços custariam cerca de R$ 330/mês.',
    atualizadoEm: '2026-11-22',
  },
  {
    id: 'mat-politica-combo',
    titulo: 'Política comercial — Combo Conecta Total',
    tipo: 'politica',
    conteudo:
      'Fidelidade de 12 meses. Cancelamento antes disso cobra multa proporcional aos meses restantes. Desconto máximo de 10% na mensalidade nos 6 primeiros meses para quem traz a portabilidade da linha móvel. Não é possível retirar um serviço do combo para baixar o preço. A instalação da fibra é agendada em até 7 dias úteis, sujeita a cobertura no endereço.',
    atualizadoEm: '2026-11-22',
  },
];

export const PRODUTOS: Produto[] = [
  {
    id: 'prod-gestao360',
    nome: 'Plano Gestão 360',
    descricao: 'Software de gestão para pequenas e médias empresas.',
    materiais: ['mat-catalogo', 'mat-politica', 'mat-processo'],
  },
  {
    id: 'prod-combo',
    nome: 'Combo Conecta Total',
    descricao:
      'Plano de operadora com telefonia móvel, internet banda larga, TV por assinatura e streaming.',
    materiais: ['mat-catalogo-combo', 'mat-politica-combo', 'mat-processo'],
    politica: { precoMensal: 249.9, descontoMaximoPct: 10, fidelidadeMeses: 12 },
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
  {
    id: 'cen-descoberta',
    titulo: 'Descoberta de necessidades — O cliente que não sabe o que precisa',
    produtoId: 'prod-gestao360',
    perfilCliente: 'nao_sabe_o_que_precisa',
    dificuldade: 'medio',
    objetivo:
      'Habilidade treinada: investigação e descoberta de necessidades. Identificar pelo menos três problemas reais do cliente, entender suas consequências e descobrir o que motivou a busca por uma solução.',
    objecoes: [
      'O sistema atual não é muito bom.',
      'Ah, sei lá, acho que dá pra melhorar umas coisas.',
      'Antes de ver o produto, não sei se é bem isso que eu preciso.',
    ],
    comportamento:
      'Comunicativo, mas superficial: não sabe identificar exatamente seus problemas. No início responde de maneira genérica e diz que o sistema atual "não é muito bom". Só revela problemas específicos quando o vendedor faz perguntas sobre eles, um de cada vez. Problemas reais (não conte espontaneamente): 1) o estoque é controlado em planilha e vive desatualizado, então já venderam produto que não tinham; 2) o fechamento financeiro do mês leva quase uma semana porque é tudo conferido à mão; 3) a nota fiscal é emitida em outro sistema e redigitada, gerando erros. Consequências: clientes reclamando de atraso, horas extras da equipe e multa por nota errada. Motivação (só conta se perguntado diretamente por que está buscando agora): perdeu um cliente grande no mês passado por causa de um pedido sem estoque. Se o vendedor apresentar o produto antes de entender esses problemas, perca o interesse e responda de forma vaga e apressada.',
    criterios: CRITERIOS_PADRAO,
    criadoEm: '2026-11-22',
  },
  {
    id: 'cen-fechamento',
    titulo: 'Fechamento — O cliente interessado que não toma decisão',
    produtoId: 'prod-gestao360',
    perfilCliente: 'indeciso',
    dificuldade: 'dificil',
    objetivo:
      'Habilidade treinada: técnicas de fechamento e identificação de barreiras ocultas. Descobrir o que impede a decisão e estabelecer um próximo passo concreto.',
    objecoes: [
      'Preciso conversar internamente antes.',
      'Vamos ver, depois eu te retorno.',
      'Não quero decidir nada com pressa.',
    ],
    comportamento:
      'Educado, indeciso e avesso a decisões precipitadas. Gosta do produto e não apresenta objeções explícitas, mas evita assumir compromissos e diz que precisa conversar internamente. Não gosta de pressão comercial: se o vendedor insistir ou forçar o fechamento, fique mais reticente e encerre com "depois te retorno". Barreira oculta (só revele se o vendedor perguntar com cuidado o que falta para decidir ou quem mais participa da decisão): o sócio precisa aprovar e tem medo de que a migração dos dados pare a operação no fechamento do trimestre. Se o vendedor descobrir essa barreira e tratá-la, aceite um próximo passo concreto, como uma reunião com o sócio em data definida.',
    criterios: CRITERIOS_PADRAO,
    criadoEm: '2026-11-22',
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
  {
    id: 'atr-5',
    cenarioId: 'cen-descoberta',
    vendedorId: 'vend-ana',
    prazo: '2026-12-02',
    status: 'pendente',
    avaliacaoId: null,
  },
  {
    id: 'atr-6',
    cenarioId: 'cen-fechamento',
    vendedorId: 'vend-ana',
    prazo: '2026-12-04',
    status: 'pendente',
    avaliacaoId: null,
  },
  {
    id: 'atr-7',
    cenarioId: 'cen-descoberta',
    vendedorId: 'vend-bruno',
    prazo: '2026-12-02',
    status: 'pendente',
    avaliacaoId: null,
  },
  {
    id: 'atr-8',
    cenarioId: 'cen-fechamento',
    vendedorId: 'vend-bruno',
    prazo: '2026-12-04',
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
