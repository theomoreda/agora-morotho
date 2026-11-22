import { NextRequest, NextResponse } from 'next/server';
import { salvarHabilitacao, store } from '@/lib/mock/store';
import type { Habilitacao } from '@/lib/types';

function idsValidos(valor: unknown, existentes: { id: string }[]): string[] {
  if (!Array.isArray(valor)) return [];
  const ids = new Set(existentes.map((e) => e.id));
  return valor.filter((v): v is string => typeof v === 'string' && ids.has(v));
}

/** Vendedor que o gestor ainda não configurou pode simular tudo. */
function habilitacaoDe(vendedorId: string): Habilitacao {
  return (
    store.habilitacoes.find((h) => h.vendedorId === vendedorId) ?? {
      vendedorId,
      cenarioIds: store.cenarios.map((c) => c.id),
      produtoIds: store.produtos.map((p) => p.id),
    }
  );
}

export async function GET(request: NextRequest) {
  const vendedorId = request.nextUrl.searchParams.get('vendedorId');
  if (!vendedorId) {
    return NextResponse.json({ error: 'vendedorId é obrigatório' }, { status: 400 });
  }
  return NextResponse.json(habilitacaoDe(vendedorId));
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const vendedorId = typeof body?.vendedorId === 'string' ? body.vendedorId : '';
  if (!vendedorId) {
    return NextResponse.json({ error: 'vendedorId é obrigatório' }, { status: 400 });
  }
  const habilitacao: Habilitacao = {
    vendedorId,
    cenarioIds: idsValidos(body.cenarioIds, store.cenarios),
    produtoIds: idsValidos(body.produtoIds, store.produtos),
  };
  salvarHabilitacao(habilitacao);
  return NextResponse.json(habilitacao);
}
