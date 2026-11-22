'use client';

import { useRef, useState, type DragEvent } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { adicionarMaterial } from '@/lib/data-provider';
import type { Material, Produto, TipoMaterial } from '@/lib/types';

export const TIPO_LABEL: Record<TipoMaterial, string> = {
  catalogo: 'Catálogo',
  apresentacao: 'Apresentação',
  manual: 'Manual',
  politica: 'Política',
  processo: 'Processo',
};

/** Só formatos que o navegador lê como texto puro; PDF e DOCX precisam de parser. */
const EXTENSOES_ACEITAS = ['.txt', '.md', '.csv', '.json'];
const MAX_CONTEUDO = 20_000;

export const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary';

type KnowledgeUploaderProps = {
  produtos: Produto[];
  onSalvo: (material: Material) => void;
  onCancelar: () => void;
};

export function KnowledgeUploader({ produtos, onSalvo, onCancelar }: KnowledgeUploaderProps) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoMaterial>('catalogo');
  const [conteudo, setConteudo] = useState('');
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [produtoIds, setProdutoIds] = useState<string[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const podeSalvar =
    titulo.trim() !== '' && conteudo.trim() !== '' && conteudo.length <= MAX_CONTEUDO && !salvando;

  async function lerArquivo(file: File) {
    const nome = file.name.toLowerCase();
    if (!EXTENSOES_ACEITAS.some((ext) => nome.endsWith(ext))) {
      setErro(`Formato não suportado. Use ${EXTENSOES_ACEITAS.join(', ')}.`);
      return;
    }
    setErro(null);
    setConteudo(await file.text());
    setArquivo(file.name);
    if (!titulo.trim()) setTitulo(file.name.replace(/\.[^.]+$/, ''));
  }

  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files[0];
    if (file) void lerArquivo(file);
  }

  function removerArquivo() {
    setArquivo(null);
    setConteudo('');
    if (inputArquivo.current) inputArquivo.current.value = '';
  }

  function alternarProduto(id: string) {
    setProdutoIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const material = await adicionarMaterial({
        titulo: titulo.trim(),
        tipo,
        conteudo: conteudo.trim(),
        ...(arquivo ? { arquivo } : {}),
        produtoIds,
      });
      onSalvo(material);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar');
      setSalvando(false);
    }
  }

  return (
    <Card className="space-y-5">
      <h2 className="type-section-title">Novo material de contexto</h2>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do material"
          className={inputClass}
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoMaterial)}
          className={inputClass}
        >
          {Object.entries(TIPO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-6 py-6 text-center',
          arrastando && 'border-primary bg-primary/5',
        )}
      >
        {arquivo ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {arquivo}
            <button
              type="button"
              onClick={removerArquivo}
              aria-label="Remover arquivo"
              className="rounded-md p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground">Arraste um arquivo ou</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputArquivo.current?.click()}
            >
              Escolher arquivo
            </Button>
            <p className="text-xs text-muted-foreground">
              {EXTENSOES_ACEITAS.join(', ')}. Ou escreva o conteúdo abaixo.
            </p>
          </>
        )}
        <input
          ref={inputArquivo}
          type="file"
          accept={EXTENSOES_ACEITAS.join(',')}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void lerArquivo(file);
          }}
        />
      </div>

      <div>
        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          placeholder="Conteúdo que o cliente virtual vai usar como fonte de verdade: preços, regras, condições..."
          rows={8}
          className={cn(inputClass, 'resize-y')}
        />
        <p
          className={cn(
            'mt-1 text-right text-xs',
            conteudo.length > MAX_CONTEUDO ? 'text-rose-400' : 'text-muted-foreground',
          )}
        >
          {conteudo.length.toLocaleString('pt-BR')} / {MAX_CONTEUDO.toLocaleString('pt-BR')}
        </p>
      </div>

      {produtos.length > 0 && (
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Vincular aos produtos</p>
          <div className="flex flex-wrap gap-2">
            {produtos.map((p) => (
              <label
                key={p.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground',
                  produtoIds.includes(p.id) && 'border-primary text-foreground',
                )}
              >
                <input
                  type="checkbox"
                  checked={produtoIds.includes(p.id)}
                  onChange={() => alternarProduto(p.id)}
                  className="accent-primary"
                />
                {p.nome}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {erro && <span className="mr-auto text-xs text-rose-400">{erro}</span>}
        <Button type="button" variant="ghost" size="sm" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={salvar} disabled={!podeSalvar}>
          {salvando ? 'Salvando...' : 'Salvar material'}
        </Button>
      </div>
    </Card>
  );
}
