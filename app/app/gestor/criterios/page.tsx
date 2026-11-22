'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { RubricEditor } from '@/components/gestor/RubricEditor';
import { obterRubricaPadrao, salvarRubricaPadrao } from '@/lib/data-provider';
import type { Criterio } from '@/lib/types';

export default function CriteriosPage() {
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obterRubricaPadrao().then((c) => {
      setCriterios(c);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Critérios de avaliação"
        description="Rubrica padrão aplicada às simulações. Edite, adicione ou remova critérios e ajuste os pesos — a soma precisa fechar em 100%."
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <RubricEditor criterios={criterios} onSalvar={salvarRubricaPadrao} />
      )}
    </div>
  );
}
