'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { ScoreBadge, scoreColor } from '@/components/shared/ScoreBadge';
import {
  listarAvaliacoesDoVendedor,
  listarCenarios,
} from '@/lib/data-provider';
import { VENDEDOR_ATUAL_ID } from '@/lib/sessao-demo';
import { cn } from '@/lib/utils';
import type { Avaliacao, Cenario } from '@/lib/types';

type EvolucaoCriterio = {
  nome: string;
  notas: number[];
};

function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function media(valores: number[]) {
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const arredondado = Math.round(valor);
  return (
    <span
      className={cn(
        'text-xs font-semibold',
        arredondado > 0 && 'text-success',
        arredondado < 0 && 'text-rose-400',
        arredondado === 0 && 'text-muted-foreground',
      )}
    >
      {arredondado > 0 ? `+${arredondado}` : arredondado}
    </span>
  );
}

function Resumo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <p className="type-label">{titulo}</p>
      <div className="mt-2 font-display text-3xl font-semibold leading-none">{children}</div>
    </Card>
  );
}

const W = 600;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

function GraficoEvolucao({ avaliacoes }: { avaliacoes: Avaliacao[] }) {
  const larguraUtil = W - PAD.left - PAD.right;
  const alturaUtil = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left +
    (avaliacoes.length === 1 ? larguraUtil / 2 : (i / (avaliacoes.length - 1)) * larguraUtil);
  const y = (nota: number) => PAD.top + (1 - nota / 100) * alturaUtil;

  const pontos = avaliacoes.map((a, i) => ({ a, cx: x(i), cy: y(a.notaFinal) }));
  const linha = pontos.map((p) => `${p.cx},${p.cy}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Nota final por simulação, da mais antiga para a mais recente"
    >
      {[0, 60, 80, 100].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            className={cn(
              'stroke-border',
              v === 60 && 'stroke-amber-500/40',
              v === 80 && 'stroke-success/40',
            )}
            strokeDasharray={v === 0 || v === 100 ? undefined : '4 4'}
          />
          <text
            x={PAD.left - 6}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {v}
          </text>
        </g>
      ))}

      {pontos.length > 1 && (
        <polyline
          points={linha}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
        />
      )}

      {pontos.map(({ a, cx, cy }, i) => (
        <g key={a.id}>
          <Link href={`/vendedor/resultado/${a.id}`}>
            <circle cx={cx} cy={cy} r={5} className="fill-primary stroke-background" strokeWidth={2}>
              <title>{`Simulação ${i + 1} · ${dataCurta(a.realizadaEm)} · nota ${Math.round(a.notaFinal)}`}</title>
            </circle>
          </Link>
          <text
            x={cx}
            y={H - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function DesempenhoPage() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listarAvaliacoesDoVendedor(VENDEDOR_ATUAL_ID),
      listarCenarios(),
    ]).then(([av, c]) => {
      setAvaliacoes(av);
      setCenarios(c);
      setLoading(false);
    });
  }, []);

  const cenarioNome = (id: string) =>
    cenarios.find((c) => c.id === id)?.titulo ?? id;

  const ordenadas = useMemo(
    () =>
      [...avaliacoes].sort(
        (a, b) => new Date(a.realizadaEm).getTime() - new Date(b.realizadaEm).getTime(),
      ),
    [avaliacoes],
  );

  const criterios = useMemo<EvolucaoCriterio[]>(() => {
    const porNome = new Map<string, number[]>();
    for (const a of ordenadas) {
      for (const n of a.notasPorCriterio) {
        porNome.set(n.criterioNome, [...(porNome.get(n.criterioNome) ?? []), n.nota]);
      }
    }
    return [...porNome].map(([nome, notas]) => ({ nome, notas }));
  }, [ordenadas]);

  const notas = ordenadas.map((a) => a.notaFinal);
  const primeira = notas[0];
  const ultima = notas[notas.length - 1];
  const vendasFechadas = ordenadas.filter((a) => a.analise?.desfecho === 'fechou').length;
  const ligacoes = ordenadas.filter((a) => a.analise).length;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Desempenho"
        description="Como sua nota evoluiu ao longo das simulações."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : ordenadas.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação ainda"
          description="Conclua uma simulação para acompanhar sua evolução aqui."
        />
      ) : (
        <div className="page-sections">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <Resumo titulo="Simulações">{ordenadas.length}</Resumo>
            <Resumo titulo="Média">
              <span className={scoreColor(media(notas))}>{Math.round(media(notas))}</span>
            </Resumo>
            <Resumo titulo="Última nota">
              <span className={scoreColor(ultima)}>{Math.round(ultima)}</span>
            </Resumo>
            <Resumo titulo="Desde a primeira">
              {notas.length > 1 ? (
                <Variacao valor={ultima - primeira} />
              ) : (
                <span className="text-xs text-muted-foreground">Faça mais uma</span>
              )}
            </Resumo>
          </div>

          <section>
            <SectionHeader
              title="Nota final por simulação"
              description={
                <>
                  Da mais antiga para a mais recente. Linhas tracejadas em 60 e 80.
                  {ligacoes > 0 && ` Vendas fechadas: ${vendasFechadas} de ${ligacoes} ligações.`}
                </>
              }
            />
            <Card className="p-4">
              <GraficoEvolucao avaliacoes={ordenadas} />
            </Card>
          </section>

          {criterios.length > 0 && (
            <section>
              <SectionHeader title="Evolução por critério" />
              <Card className="divide-y divide-border p-0">
                {criterios.map((c) => {
                  const atual = c.notas[c.notas.length - 1];
                  return (
                    <div key={c.nome} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="min-w-0 truncate text-sm text-foreground">{c.nome}</p>
                        <div className="flex shrink-0 items-center gap-3">
                          <Variacao
                            valor={c.notas.length > 1 ? atual - c.notas[0] : null}
                          />
                          <ScoreBadge nota={atual} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-end gap-1">
                        {c.notas.map((n, i) => (
                          <div
                            key={i}
                            title={`${Math.round(n)}`}
                            className={cn(
                              'w-3 rounded-sm',
                              n >= 80 ? 'bg-success' : n >= 60 ? 'bg-amber-400' : 'bg-rose-400',
                            )}
                            style={{ height: `${Math.max(4, (n / 100) * 24)}px` }}
                          />
                        ))}
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {c.notas.length} {c.notas.length === 1 ? 'avaliação' : 'avaliações'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          <section>
            <SectionHeader title="Simulações" />
            <Card className="divide-y divide-border p-0">
              {[...ordenadas].reverse().map((a) => (
                <Link
                  key={a.id}
                  href={`/vendedor/resultado/${a.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-card"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {cenarioNome(a.cenarioId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.realizadaEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ScoreBadge nota={a.notaFinal} />
                </Link>
              ))}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
