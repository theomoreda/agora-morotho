import { Quote } from 'lucide-react';

export function EvidenceQuote({ texto }: { texto: string }) {
  return (
    <div className="flex gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <p className="text-xs italic text-muted-foreground">{texto}</p>
    </div>
  );
}
