/**
 * Desempenho da ligação calculado da transcrição, sem microfone.
 *
 * Rodar: node --import tsx scripts/verify-sessao.ts
 */
import { analisarSessao, detectarDesfecho, extrairOfertas } from '../lib/analise-sessao';
import { parseConversa } from '../lib/veredito';
import type { PoliticaComercial } from '../lib/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const POLITICA: PoliticaComercial = {
  precoMensal: 249.9,
  descontoMaximoPct: 10,
  fidelidadeMeses: 12,
};

function criterio(a: ReturnType<typeof analisarSessao>, id: string): boolean | null {
  const c = a.criterios.find((x) => x.id === id);
  assert(c, `critério ${id} ausente`);
  return c.atendido;
}

function metrica(a: ReturnType<typeof analisarSessao>, nome: string): string | null {
  return a.metricas.find((m) => m.nome.startsWith(nome))?.valor ?? null;
}

function verifyVendedorBom() {
  const a = analisarSessao({
    duracaoSeg: 200,
    politica: POLITICA,
    turnos: parseConversa(`Cliente: Oi, tô achando caro.
Vendedor: Entendo. Quanto você paga hoje somando internet, celular e TV?
Cliente: Uns 320 reais.
Vendedor: Separados os quatro serviços custam uns 330. No combo você tem fibra de 600 Mega, 5G e Netflix incluso por 249,90.
Cliente: Hum, faz sentido, é mais barato que o que eu pago.
Vendedor: E qual operadora você usa hoje? A instalação é grátis.
Cliente: Fechado, pode mandar o contrato. Tchau!`),
  });
  assert(a.avaliavel, 'conversa com os dois lados é avaliável');
  assert(a.desfecho === 'fechou', 'vendedor bom deveria fechar');
  assert(criterio(a, 'politica') === true, 'sem desconto, respeitou a política');
  assert(criterio(a, 'valor') === true, 'mostrou valor');
  assert(criterio(a, 'concorrencia') === true, 'comparou com o que o cliente paga');
  assert(criterio(a, 'descoberta') === true, 'fez perguntas');
  assert(criterio(a, 'sustentou') === null, 'sem oferta, defesa de valor não se aplica');
  assert(criterio(a, 'tempo') === true, 'fechou em menos de 5 min');
  assert(a.nota === 100, `nota deveria ser 100, veio ${a.nota}`);
  assert(metrica(a, 'Desconto na venda') === '0%', 'fechou sem desconto');
  assert(a.transcricao.length === 7, 'transcrição vai junto com a análise');
}

function verifyVendedorFraco() {
  const a = analisarSessao({
    duracaoSeg: 420,
    politica: POLITICA,
    turnos: parseConversa(`Cliente: Tá caro.
Vendedor: Te dou 20% de desconto.
Cliente: Fecho se você me der 30% e sem fidelidade.
Vendedor: Tudo bem, 30% e sem fidelidade.
Cliente: Então fechado, 30% sem fidelidade. Tchau.`),
  });
  assert(a.desfecho === 'fechou', 'cliente fechou nas condições dele');
  assert(criterio(a, 'politica') === false, '30% fura a política');
  assert(criterio(a, 'sustentou') === false, 'deu desconto antes de mostrar valor');
  assert(criterio(a, 'tempo') === false, '7 min não é tempo curto');
  assert(metrica(a, 'Desconto na venda') === '30%', 'desconto final 30%');
}

function verifyPercentualQueNaoEDesconto() {
  const a = analisarSessao({
    duracaoSeg: 120,
    politica: POLITICA,
    turnos: parseConversa(`Cliente: Por que eu trocaria?
Vendedor: Nossa rede é 100% fibra e tem 99% de disponibilidade.
Cliente: Vou pensar e te retorno.`),
  });
  assert(extrairOfertas(a.transcricao).length === 0, '"100% fibra" não é desconto');
  assert(criterio(a, 'politica') === null, 'sem oferta nem venda, política sem base');
  assert(metrica(a, 'Maior desconto') === null, 'sem desconto oferecido, sem métrica');
  assert(metrica(a, 'Mensalidade') === null, 'sem venda, sem mensalidade fechada');
  assert(metrica(a, 'Receita cedida') === null, 'sem venda, sem receita cedida');
  assert(criterio(a, 'tempo') === null, 'sem venda, tempo de fechamento não se aplica');
}

function verifyNegacaoEAceite() {
  const recusa = extrairOfertas(
    parseConversa(`Cliente: Me dá 20% que eu fecho.
Vendedor: Não consigo 20%, mas consigo 8%.`),
  );
  assert(
    recusa.length === 1 && recusa[0].pct === 8,
    `negou 20% e ofereceu 8%, veio ${JSON.stringify(recusa)}`,
  );

  const aceite = extrairOfertas(
    parseConversa(`Cliente: Fecho com 15%.
Vendedor: Pode ser.`),
  );
  assert(aceite.length === 1 && aceite[0].pct === 15, '"Pode ser" aceita os 15% pedidos');

  const fidelidade = analisarSessao({
    duracaoSeg: 60,
    politica: POLITICA,
    turnos: parseConversa(`Cliente: Dá pra tirar a fidelidade?
Vendedor: Não dá pra ser sem fidelidade.
Cliente: Não tenho interesse.`),
  });
  assert(criterio(fidelidade, 'politica') === null, 'negar a dispensa não fura a política');
}

function verifyConversaVazia() {
  const a = analisarSessao({
    duracaoSeg: 0,
    politica: POLITICA,
    turnos: parseConversa('Cliente: Alô?'),
  });
  assert(!a.avaliavel, 'só o cliente falou: não avaliável');
  assert(a.criterios.every((c) => c.atendido === null), 'nenhum critério sem conversa');
  assert(a.nota === 0, 'sem critério avaliado, nota 0');
}

function verifyDesfechos() {
  assert(
    detectarDesfecho(parseConversa('Cliente: Eu fecho se você me der 20%.')).desfecho ===
      'sem_decisao',
    'contraproposta não é fechamento',
  );
  assert(
    detectarDesfecho(parseConversa('Cliente: Vou pensar e te retorno semana que vem. Tchau.'))
      .desfecho === 'adiou',
    'adiar deveria ser detectado',
  );
  assert(
    detectarDesfecho(parseConversa('Cliente: Não vou fechar, obrigado. Tchau.')).desfecho ===
      'recusou',
    'recusa deveria ser detectada',
  );
  assert(
    detectarDesfecho(parseConversa('Cliente: Não aceito essa condição.')).desfecho ===
      'recusou',
    '"não aceito" é recusa, não fechamento',
  );
}

verifyVendedorBom();
verifyVendedorFraco();
verifyPercentualQueNaoEDesconto();
verifyNegacaoEAceite();
verifyConversaVazia();
verifyDesfechos();
console.log('Session analysis checks passed');
