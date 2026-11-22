'use client';

import { UploadCloud } from 'lucide-react';

/**
 * Área de upload de materiais (placeholder visual).
 *
 * O envio real depende do back-end. Por ora mostra o alvo de drop e explica o
 * papel da biblioteca como fonte de verdade do agente.
 */
export function KnowledgeUploader() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
      <UploadCloud className="h-7 w-7 text-muted-foreground" />
      <p className="text-sm font-medium text-white">
        Adicione materiais da empresa
      </p>
      <p className="max-w-md text-xs text-muted-foreground">
        Catálogos, apresentações, manuais e políticas. O conteúdo vira a fonte
        de verdade do cliente virtual. (Upload será habilitado com o back-end.)
      </p>
    </div>
  );
}
