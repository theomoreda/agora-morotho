import { NextRequest, NextResponse } from 'next/server';
import {
  consultarPolitica,
  FRASE_FALLBACK_POLITICA,
  instrucaoPolitica,
  planoDoProduto,
} from '@/lib/plano';
import { obterProduto } from '@/lib/data-provider';

function lerPercentual(valor: string | null): number | null {
  if (valor === null || valor === '' || valor === 'null') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** A Agora chama isto no meio da conversa quando TOOL_BASE_URL está público. */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const pct = lerPercentual(params.get('descontoOferecidoPct'));
    const produtoId = params.get('produto');
    const plano = planoDoProduto(produtoId ? await obterProduto(produtoId) : null);
    const r = consultarPolitica(pct, plano);
    // Só a instrução: "permitido: false" e o teto fazem o cliente recusar a oferta.
    return NextResponse.json({ instrucao: instrucaoPolitica(pct, r) });
  } catch (erro) {
    console.error('[tools/politica] falha:', erro);
    return NextResponse.json({
      erro: true,
      instrucao: FRASE_FALLBACK_POLITICA,
    });
  }
}
