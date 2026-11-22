import { NextRequest, NextResponse } from 'next/server';
import { removerMaterial, salvarMaterial, salvarProduto, store } from '@/lib/mock/store';
import type { Material, Produto, TipoMaterial } from '@/lib/types';

const TIPOS: TipoMaterial[] = ['catalogo', 'apresentacao', 'manual', 'politica', 'processo'];

/** O conteúdo entra inteiro no prompt do cliente virtual. */
const MAX_CONTEUDO = 20_000;

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function listaDeIds(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

export async function GET() {
  return NextResponse.json({ produtos: store.produtos, materiais: store.materiais });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'corpo inválido' }, { status: 400 });
  }

  if (body.entidade === 'material') {
    const titulo = texto(body.titulo);
    const conteudo = texto(body.conteudo);
    const tipo = body.tipo as TipoMaterial;
    if (!titulo || !conteudo || !TIPOS.includes(tipo)) {
      return NextResponse.json(
        { error: 'titulo, conteudo e tipo válido são obrigatórios' },
        { status: 400 },
      );
    }
    if (conteudo.length > MAX_CONTEUDO) {
      return NextResponse.json(
        { error: `conteúdo passa de ${MAX_CONTEUDO} caracteres` },
        { status: 400 },
      );
    }
    const arquivo = texto(body.arquivo);
    const material: Material = {
      id: `mat-${crypto.randomUUID()}`,
      titulo,
      tipo,
      conteudo,
      atualizadoEm: new Date().toISOString().slice(0, 10),
      ...(arquivo ? { arquivo } : {}),
    };
    salvarMaterial(material, listaDeIds(body.produtoIds));
    return NextResponse.json(material, { status: 201 });
  }

  if (body.entidade === 'produto') {
    const nome = texto(body.nome);
    if (!nome) {
      return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
    }
    const idsValidos = new Set(store.materiais.map((m) => m.id));
    const produto: Produto = {
      id: `prod-${crypto.randomUUID()}`,
      nome,
      descricao: texto(body.descricao),
      materiais: listaDeIds(body.materialIds).filter((id) => idsValidos.has(id)),
    };
    salvarProduto(produto);
    return NextResponse.json(produto, { status: 201 });
  }

  return NextResponse.json(
    { error: "entidade deve ser 'material' ou 'produto'" },
    { status: 400 },
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('materialId');
  if (!id || !removerMaterial(id)) {
    return NextResponse.json({ error: 'material não encontrado' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
