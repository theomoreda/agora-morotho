'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { VerdictCard } from '@/components/veredito/VerdictCard';
import { avaliarTexto } from '@/lib/veredito';
import type { Veredito } from '@/lib/types';

/** Conversa de exemplo: o vendedor promete 30% e deve sair como "não apto". */
const EXEMPLO_30 = `Cliente: Olha, eu até gostei, mas tá caro. Só fecho se você melhorar bastante o preço.
Vendedor: Entendo. Deixa eu ver o que consigo fazer por você.
Cliente: Preciso de pelo menos uns 30% de desconto pra fechar hoje.
Vendedor: Fechado, eu te dou 30% de desconto então.
Cliente: Ótimo, assim a gente fecha.`;

export default function VeredictoPage() {
  const [texto, setTexto] = useState('');
  const [veredito, setVeredito] = useState<Veredito | null>(null);

  const avaliar = () => {
    setVeredito(avaliarTexto(texto));
  };

  const carregarExemplo = () => {
    setTexto(EXEMPLO_30);
    setVeredito(null);
  };

  const limpar = () => {
    setTexto('');
    setVeredito(null);
  };

  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Início
          </Link>
          <h1 className="type-page-title mt-3">Veredito da conversa</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Cole a conversa (ou use o exemplo) e avalie. O veredito diz se o
            vendedor está apto, qual dos dois critérios falhou e a frase que
            causou a reprovação. Funciona sem microfone.
          </p>
        </div>

        <Card className="space-y-4">
          <label htmlFor="conversa" className="text-xs text-muted-foreground">
            Conversa (formato “Vendedor: ...” / “Cliente: ...”)
          </label>
          <textarea
            id="conversa"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            placeholder={'Vendedor: ...\nCliente: ...'}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={avaliar} disabled={texto.trim().length === 0}>
              Avaliar
            </Button>
            <Button variant="outline" onClick={carregarExemplo}>
              Carregar exemplo (30%)
            </Button>
            {texto && (
              <Button variant="ghost" onClick={limpar}>
                Limpar
              </Button>
            )}
          </div>
        </Card>

        {veredito && (
          <div className="mt-10">
            <VerdictCard veredito={veredito} />
          </div>
        )}
      </div>
    </main>
  );
}
