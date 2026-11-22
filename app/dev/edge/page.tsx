'use client';
/**
 * Dev check for T5/T6: on-device keyword + impact detection.
 * Verify in DevTools → Network that nothing is requested after the model download.
 */
import { useEffect, useRef, useState } from 'react';
import type { EdgeTrigger } from '@/lib/contracts';
import { startEdgeListener, type EdgeListener, type EdgeStatus } from '@/lib/edge-listener/listener';

export default function DevEdgePage() {
  const listener = useRef<EdgeListener | null>(null);
  const [status, setStatus] = useState<EdgeStatus | 'idle'>('idle');
  const [detail, setDetail] = useState('');
  const [heard, setHeard] = useState('');
  const [level, setLevel] = useState(0);
  const [triggers, setTriggers] = useState<Array<EdgeTrigger & { label: string }>>([]);

  const record = (t: EdgeTrigger, label: string) => {
    console.info('[edge-listener] trigger', t);
    setTriggers((list) => [{ ...t, label }, ...list].slice(0, 20));
  };

  const start = async () => {
    try {
      listener.current = await startEdgeListener({
        onTrigger: (t) => record(t, 'detectado localmente'),
        onStatus: (s, d) => {
          setStatus(s);
          setDetail(d ?? '');
        },
        onHeard: setHeard,
        onLevel: setLevel,
      });
    } catch (e) {
      setStatus('error');
      setDetail(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => () => void listener.current?.stop(), []);

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 font-sans">
      <h1 className="text-2xl font-bold">Escuta Edge Local · teste</h1>
      <p>
        Status: <strong>{status}</strong> {detail && <span className="text-red-700">({detail})</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={start} disabled={status !== 'idle'}>
          Iniciar escuta local
        </button>
        <button className="rounded bg-gray-600 px-3 py-2 text-white" onClick={() => listener.current?.pause()}>
          Pausar
        </button>
        <button className="rounded bg-gray-600 px-3 py-2 text-white" onClick={() => listener.current?.resume()}>
          Retomar
        </button>
        <button
          className="rounded border border-amber-600 px-3 py-2 text-amber-800"
          onClick={() => record({ kind: 'keyword', keyword: 'treinar', at: Date.now() }, 'SIMULADO')}
        >
          Simular palavra-chave detectada localmente (simulado)
        </button>
      </div>
      <div>
        Nível do microfone (RMS): {level.toFixed(3)}
        <div className="h-3 w-full rounded bg-gray-200">
          <div className="h-3 rounded bg-green-600" style={{ width: `${Math.min(100, level * 300)}%` }} />
        </div>
      </div>
      <p>
        Vosk ouviu (gramática restrita): <code>{heard || '—'}</code>
      </p>
      <ul className="space-y-1">
        {triggers.map((t, i) => (
          <li key={i}>
            {new Date(t.at).toLocaleTimeString()} · <strong>{t.kind}</strong> {t.keyword ?? ''} · {t.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
