'use client';
/**
 * Dev check for T8: open this page in two tabs, publish in one, watch it arrive in the other.
 * Shows end-to-end latency (receive time − event timestamp; same machine clock).
 */
import { useEffect, useRef, useState } from 'react';
import type { ClinicEvent } from '@/lib/contracts';
import { connectClinicSync, type ClinicConnection } from '@/lib/clinic-sync/connect';
import { mockEmergency, mockTelemetryRed, mockTranscriptLine } from '@/lib/mocks';

interface Row {
  type: ClinicEvent['event_type'];
  latencyMs: number;
  at: string;
}

const MOCKS: ClinicEvent[] = [mockTelemetryRed, mockTranscriptLine, mockEmergency];

export default function DevSyncPage() {
  const conn = useRef<ClinicConnection | null>(null);
  const [status, setStatus] = useState('conectando…');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    connectClinicSync()
      .then(async (c) => {
        if (cancelled) return c.close();
        conn.current = c;
        off = await c.sync.subscribe(
          (ev) => {
            const latencyMs = Date.now() - Date.parse(ev.timestamp);
            console.info(`[clinic-sync] ${ev.event_type} received in ${latencyMs} ms`);
            setRows((r) => [{ type: ev.event_type, latencyMs, at: new Date().toLocaleTimeString() }, ...r].slice(0, 20));
          },
          { onInvalid: (e) => console.warn('[clinic-sync] invalid message', e) },
        );
        setStatus(`conectado como uid ${c.uid}`);
      })
      .catch((e: unknown) => setStatus(`erro: ${e instanceof Error ? e.message : String(e)}`));
    return () => {
      cancelled = true;
      off?.();
      conn.current?.close();
    };
  }, []);

  const publish = (ev: ClinicEvent) =>
    conn.current?.sync.publish({ ...ev, timestamp: new Date().toISOString() }).catch((e) => setStatus(`erro: ${e}`));

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6 font-sans">
      <h1 className="text-2xl font-bold">clinic-sync · teste entre abas</h1>
      <p data-testid="status">{status}</p>
      <div className="flex flex-wrap gap-2">
        {MOCKS.map((ev) => (
          <button key={ev.event_type} className="rounded bg-blue-600 px-3 py-2 text-white" onClick={() => publish(ev)}>
            Publicar {ev.event_type}
          </button>
        ))}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th>Recebido</th>
            <th>Evento</th>
            <th>Latência</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.at}</td>
              <td>{r.type}</td>
              <td className={r.latencyMs < 1000 ? 'text-green-700' : 'text-red-700'}>{r.latencyMs} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
