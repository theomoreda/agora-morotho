/**
 * Verificação do motor do veredito.
 *
 * Cobre o critério de pronto da task: uma conversa em que o vendedor promete
 * 30% precisa sair como "não apto", pelo critério de condição comercial, com a
 * frase do vendedor ao lado. Mais alguns casos de borda.
 *
 * Rodar: node --import tsx scripts/verify-veredito.ts
 */
import { avaliarTexto, avaliarTurnos } from '../lib/veredito';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ── Critério de pronto: vendedor promete 30% → não apto ─────────────────────
function verifyDesconto30() {
  const conversa = `Cliente: Só fecho com um desconto grande.
Vendedor: Fechado, eu te dou 30% de desconto então.`;

  const v = avaliarTexto(conversa);

  assert(v.apto === false, 'Promessa de 30% deveria resultar em NÃO apto');
  assert(
    v.criterioFalho === 'condicao_comercial',
    'O critério violado deveria ser condicao_comercial',
  );
  assert(
    v.frase?.includes('30%') ?? false,
    'A frase do veredito deveria conter a promessa de 30%',
  );
}

// ── Desconto dentro do teto (15%) → não reprova por condição comercial ──────
function verifyDescontoDentroDoTeto() {
  const conversa = `Vendedor: Consigo aplicar os 10% do plano anual.`;
  const v = avaliarTexto(conversa);
  assert(
    v.criterioFalho !== 'condicao_comercial',
    '10% está dentro do teto e não deveria reprovar por condição comercial',
  );
}

// ── Percentual dito pelo CLIENTE não reprova o vendedor ─────────────────────
function verifyPercentualDoCliente() {
  const conversa = `Cliente: Eu quero 30% de desconto.
Vendedor: Não consigo chegar a esse valor, mas o plano já inclui a migração.`;
  const v = avaliarTexto(conversa);
  assert(
    v.apto === true,
    'Se só o cliente pede 30% e o vendedor segura, deveria ser apto',
  );
}

// ── Cedência sem percentual → reprova por segurou_objecao ───────────────────
function verifyCedencia() {
  const conversa = `Cliente: Tá caro demais.
Vendedor: Tudo bem, posso fazer uma condição especial pra você.`;
  const v = avaliarTexto(conversa);
  assert(v.apto === false, 'Ceder diante da objeção deveria reprovar');
  assert(
    v.criterioFalho === 'segurou_objecao',
    'A cedência deveria reprovar por segurou_objecao',
  );
  assert(
    v.frase?.toLowerCase().includes('condição especial') ?? false,
    'A frase deveria ser a cedência do vendedor',
  );
}

// ── Conversa limpa → apto ───────────────────────────────────────────────────
function verifyApto() {
  const conversa = `Cliente: Está acima do meu orçamento.
Vendedor: Entendo. O retorno costuma cobrir o investimento em dois meses. Posso te mostrar como?`;
  const v = avaliarTexto(conversa);
  assert(v.apto === true, 'Conversa sem violação deveria ser apto');
  assert(v.criterioFalho === null, 'Apto não deveria ter critério violado');
}

// ── Prioridade: condição comercial vem antes de cedência ────────────────────
function verifyPrioridade() {
  const v = avaliarTurnos([
    { falante: 'cliente', texto: 'Quero 30%.' },
    { falante: 'vendedor', texto: 'Posso fazer uma condição especial.' },
    { falante: 'vendedor', texto: 'Te dou 30% de desconto.' },
  ]);
  assert(
    v.criterioFalho === 'condicao_comercial',
    'Com as duas violações, condicao_comercial tem prioridade',
  );
}

function main() {
  verifyDesconto30();
  verifyDescontoDentroDoTeto();
  verifyPercentualDoCliente();
  verifyCedencia();
  verifyApto();
  verifyPrioridade();
  console.log('Verdict engine checks passed');
}

main();
