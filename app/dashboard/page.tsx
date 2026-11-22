'use client';
/**
 * Tela 2 — Painel da fonoaudióloga (B2B).
 * The therapist sends the protocol to the patient's hub and follows each attempt live,
 * both over Agora Signaling (clinic-sync). The 14-day history is SIMULATED and labelled.
 */
import { useEffect, useReducer, useRef, useState } from 'react';
import type { ClinicEvent, PracticeProtocol, ProtocolUpdate } from '@/lib/contracts';
import { connectClinicSync, type ClinicConnection } from '@/lib/clinic-sync/connect';
import { applyEvent, initialDashboardState } from '@/lib/dashboard/state';
import {
  HELENA_V2,
  mockPracticeFinal,
  mockPracticeInProgress,
  mockProtocolAck,
  mockTranscriptLineV2,
} from '@/lib/mocks';
import { THERAPIST } from '@/data/seed-practice';
import { EffortChart } from '@/components/dashboard/EffortChart';
import { ProtocolEditor } from '@/components/dashboard/ProtocolEditor';
import { AlertFeed, LiveSession, PatientList, PatientSummary, STATUS_UI, TranscriptPanel } from '@/components/dashboard/parts';

/** Short two-tone chime via WebAudio (no asset needed). */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.12;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.18);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // audio blocked until the user interacts with the page — visual alert still shows
  }
}

const DEV_EVENTS: Array<[string, () => ClinicEvent]> = [
  ['Telemetria: "Aaa" fraco (em andamento)', () => mockPracticeInProgress],
  ['Telemetria: sessão concluída na meta', () => mockPracticeFinal],
  ['Transcrição do Gabriel', () => mockTranscriptLineV2],
  [
    'Telemetria: relato de engasgo',
    () => ({
      ...mockPracticeInProgress,
      status: 'REVIEW',
      reasons: ['Relato de engasgo — risco de aspiração, avaliar com a fono'],
      reported_symptoms: ['engasgo'],
    }),
  ],
  ['ACK do aparelho (protocolo v2)', () => mockProtocolAck],
];

export default function DashboardPage() {
  const [state, dispatch] = useReducer(applyEvent, undefined, initialDashboardState);
  const [selectedId, setSelectedId] = useState<string>(HELENA_V2.id);
  const [link, setLink] = useState<'conectando' | 'conectado' | 'erro'>('conectando');
  const [dev, setDev] = useState(false);
  const conn = useRef<ClinicConnection | null>(null);
  const lastAlerts = useRef(0);

  useEffect(() => {
    setDev(new URLSearchParams(window.location.search).has('dev'));
    let off: (() => void) | undefined;
    let cancelled = false;
    connectClinicSync()
      .then(async (c) => {
        if (cancelled) return c.close();
        conn.current = c;
        off = await c.sync.subscribe(
          (ev, meta) => {
            console.info(`[dashboard] ${ev.event_type} transit=${meta.transitMs ?? '?'}ms`);
            dispatch(ev);
          },
          { onInvalid: (e) => console.warn('[dashboard] invalid message', e) },
        );
        setLink('conectado');
      })
      .catch((e) => {
        console.error('[dashboard] signaling connection failed', e);
        setLink('erro');
      });
    return () => {
      cancelled = true;
      off?.();
      void conn.current?.close();
      conn.current = null;
    };
  }, []);

  // New alert → chime + focus on that patient
  useEffect(() => {
    if (state.alerts.length > lastAlerts.current && state.alerts[0]) {
      chime();
      setSelectedId(state.alerts[0].patientId);
    }
    lastAlerts.current = state.alerts.length;
  }, [state.alerts]);

  const patients = Object.values(state.patients).sort((a, b) => STATUS_UI[a.status].order - STATUS_UI[b.status].order);
  const selected = state.patients[selectedId];

  const sendProtocol = async (protocol: PracticeProtocol) => {
    if (!selected) return;
    const event: ProtocolUpdate = {
      event_type: 'PROTOCOL_UPDATE',
      timestamp: new Date().toISOString(),
      patient_id: selected.id,
      protocol_version: selected.protocolVersion + 1,
      protocol,
      updated_by: THERAPIST,
    };
    if (!conn.current) throw new Error('sem conexão com a Agora Signaling');
    await conn.current.sync.publish(event);
    dispatch(event);
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Painel da Fonoaudiologia · UNMUTE</h1>
          <p className="text-lg text-slate-400">
            Reabilitação vocal domiciliar · {THERAPIST} · {patients.length} pacientes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-base">
          <span className="rounded-full border border-amber-500 px-3 py-1 text-amber-300">Histórico: dados simulados</span>
          <span className="rounded-full border border-slate-600 px-3 py-1 text-slate-300">Limiares não validados clinicamente</span>
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1 ${link === 'conectado' ? 'bg-green-900 text-green-200' : link === 'erro' ? 'bg-red-900 text-red-200' : 'bg-slate-800'}`}
          >
            <span className={`h-3 w-3 rounded-full ${link === 'conectado' ? 'bg-green-400' : link === 'erro' ? 'bg-red-400' : 'bg-slate-400'}`} />
            Agora Signaling {link}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[18rem_1fr_24rem]">
        <aside>
          <h2 className="mb-2 text-xl font-semibold text-slate-300">Pacientes</h2>
          <PatientList patients={patients} selectedId={selectedId} onSelect={setSelectedId} />
        </aside>

        {selected && (
          <section className="space-y-4">
            <PatientSummary patient={selected} />
            <div className="rounded-xl bg-slate-900 p-4">
              <h3 className="mb-3 text-xl font-semibold">Sessão de hoje (ao vivo)</h3>
              <LiveSession patient={selected} />
            </div>
            <div className="rounded-xl bg-slate-900 p-4">
              <h3 className="text-xl font-semibold">Evolução — 14 dias (simulado) + hoje (ao vivo)</h3>
              <EffortChart patient={selected} />
            </div>
          </section>
        )}

        <aside className="space-y-4">
          {selected && (
            <div className="rounded-xl bg-slate-900 p-4">
              <ProtocolEditor patient={selected} onSend={sendProtocol} disabled={link !== 'conectado'} />
            </div>
          )}
          <div className="rounded-xl bg-slate-900 p-4">
            <h3 className="mb-2 text-xl font-semibold">Transcrição ao vivo</h3>
            <TranscriptPanel lines={state.transcripts[selectedId] ?? []} />
          </div>
          <div className="rounded-xl bg-slate-900 p-4">
            <h3 className="mb-2 text-xl font-semibold">Alertas</h3>
            <AlertFeed alerts={state.alerts} />
          </div>
          {dev && (
            <div className="rounded-xl border border-amber-600 p-4">
              <h3 className="mb-2 text-lg font-semibold text-amber-300">Dev: injetar eventos simulados</h3>
              <div className="flex flex-col gap-2">
                {DEV_EVENTS.map(([label, make]) => (
                  <button
                    key={label}
                    className="rounded bg-amber-700 px-3 py-2 text-left"
                    onClick={() => dispatch({ ...make(), timestamp: new Date().toISOString() })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
