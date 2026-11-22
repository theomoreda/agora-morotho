/**
 * Verificação da regra de política comercial que a ferramenta do cliente usa.
 *
 * Critério de pronto da task: quando o vendedor oferece 30%, a consulta precisa
 * dizer que não é permitido e que o máximo é 10% — é com esse número que o
 * cliente recusa.
 *
 * Rodar: node --import tsx scripts/verify-politica.ts
 */
import { consultarPolitica, PLANO, FRASE_FALLBACK_POLITICA } from '../lib/plano';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ── Vendedor oferece 30% → não permitido, cita 10% ─────────────────────────
function verify30() {
  const r = consultarPolitica(30);
  assert(r.permitido === false, '30% deveria ser NÃO permitido');
  assert(r.descontoMaximoPct === 10, 'O máximo deveria ser 10%');
  assert(
    r.resumo.includes('10%') && r.resumo.includes('30%'),
    'O resumo deveria citar o 10% permitido e o 30% recusado',
  );
}

// ── Desconto dentro do teto (10%) → permitido ──────────────────────────────
function verifyDentroDoTeto() {
  const r = consultarPolitica(10);
  assert(r.permitido === true, '10% deveria ser permitido (igual ao teto)');
  const r5 = consultarPolitica(5);
  assert(r5.permitido === true, '5% deveria ser permitido');
}

// ── Sem número → consulta geral, informa o máximo ──────────────────────────
function verifySemNumero() {
  const r = consultarPolitica(null);
  assert(r.permitido === true, 'Consulta sem número não reprova');
  assert(r.resumo.includes('10%'), 'A consulta geral deveria informar o máximo');
}

// ── Plano carrega os valores corretos da task ──────────────────────────────
function verifyPlano() {
  assert(PLANO.precoMensal === 79.9, 'Preço deveria ser R$ 79,90');
  assert(PLANO.descontoMaximoPct === 10, 'Desconto máximo deveria ser 10%');
  assert(PLANO.fidelidadeMeses === 12, 'Fidelidade deveria ser 12 meses');
}

// ── Fallback tem uma frase pronta citando os 10% ───────────────────────────
function verifyFallback() {
  assert(
    FRASE_FALLBACK_POLITICA.includes('10%'),
    'A frase de fallback deveria citar o desconto máximo de 10%',
  );
}

function main() {
  verify30();
  verifyDentroDoTeto();
  verifySemNumero();
  verifyPlano();
  verifyFallback();
  console.log('Policy tool checks passed');
}

main();
