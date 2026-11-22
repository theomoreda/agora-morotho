import { NextRequest, NextResponse } from 'next/server';
import { consultarPolitica, FRASE_FALLBACK_POLITICA, PLANO } from '@/lib/plano';

function lerPercentual(valor: string | null): number | null {
  if (valor === null || valor === '' || valor === 'null') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/** A Agora chama isto no meio da conversa quando TOOL_BASE_URL está público. */
export async function GET(request: NextRequest) {
  try {
    const pct = lerPercentual(
      request.nextUrl.searchParams.get('descontoOferecidoPct'),
    );
    const r = consultarPolitica(pct);
    return NextResponse.json({
      plano: PLANO.nome,
      precoMensal: r.precoMensal,
      descontoMaximoPct: r.descontoMaximoPct,
      fidelidadeMeses: r.fidelidadeMeses,
      permitido: r.permitido,
      resumo: r.resumo,
    });
  } catch (erro) {
    console.error('[tools/politica] falha:', erro);
    return NextResponse.json({
      erro: true,
      instrucao: FRASE_FALLBACK_POLITICA,
    });
  }
}
