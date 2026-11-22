'use client';
/**
 * The therapist owns the protocol: 3 functional phrases, loudness target and "Aaa" target.
 * "Enviar ao paciente" publishes PROTOCOL_UPDATE over Agora Signaling; the hub answers PROTOCOL_ACK.
 */
import { useEffect, useState } from 'react';
import { PROTOCOL_LIMITS, protocolErrors, type PracticeProtocol } from '@/lib/contracts';
import type { PatientCard } from '@/lib/dashboard/state';

interface Draft {
  phrases: string[];
  targetEffortDb: string;
  sustainS: string;
  attempts: string;
}

const toDraft = (p: PracticeProtocol): Draft => ({
  phrases: [...p.phrases],
  targetEffortDb: String(p.target_effort_db),
  sustainS: String(p.sustain.target_duration_ms / 1000),
  attempts: String(p.sustain.attempts),
});

const fromDraft = (d: Draft): PracticeProtocol => ({
  phrases: d.phrases.map((f) => f.trim()),
  target_effort_db: Number(d.targetEffortDb.replace(',', '.')),
  sustain: { target_duration_ms: Math.round(Number(d.sustainS.replace(',', '.')) * 1000), attempts: Number(d.attempts) },
});

/** Field-by-field comparison (JSON.stringify would depend on key order). */
function sameProtocol(a: PracticeProtocol, b: PracticeProtocol): boolean {
  return (
    a.target_effort_db === b.target_effort_db &&
    a.sustain.target_duration_ms === b.sustain.target_duration_ms &&
    a.sustain.attempts === b.sustain.attempts &&
    a.phrases.length === b.phrases.length &&
    a.phrases.every((f, i) => f === b.phrases[i])
  );
}

export function ProtocolEditor({
  patient,
  onSend,
  disabled,
}: {
  patient: PatientCard;
  onSend: (protocol: PracticeProtocol) => Promise<void>;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(patient.protocol));
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Reset the form when another patient is selected or a new protocol version lands.
  useEffect(() => {
    setDraft(toDraft(patient.protocol));
    setSendError('');
  }, [patient.id, patient.protocolVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const protocol = fromDraft(draft);
  const errors = protocolErrors(protocol);
  const dirty = !sameProtocol(protocol, patient.protocol);

  const send = async () => {
    setSending(true);
    setSendError('');
    try {
      await onSend(protocol);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-lg focus:border-sky-400 focus:outline-none';
  const L = PROTOCOL_LIMITS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold">Protocolo da fono</h3>
        <span className="text-sm text-slate-400">
          v{patient.protocolVersion} · {patient.therapist}
        </span>
      </div>

      {draft.phrases.map((f, i) => (
        <label key={i} className="block">
          <span className="text-sm text-slate-400">Frase {i + 1}</span>
          <input
            className={input}
            value={f}
            maxLength={L.phraseMaxChars}
            onChange={(e) => setDraft({ ...draft, phrases: draft.phrases.map((x, j) => (j === i ? e.target.value : x)) })}
          />
        </label>
      ))}

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-sm text-slate-400">Meta (dB)</span>
          <input
            className={input}
            inputMode="decimal"
            value={draft.targetEffortDb}
            onChange={(e) => setDraft({ ...draft, targetEffortDb: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Meta do &quot;Aaa&quot; (s)</span>
          <input className={input} inputMode="decimal" value={draft.sustainS} onChange={(e) => setDraft({ ...draft, sustainS: e.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Tentativas &quot;Aaa&quot;</span>
          <input className={input} inputMode="numeric" value={draft.attempts} onChange={(e) => setDraft({ ...draft, attempts: e.target.value })} />
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="list-disc pl-5 text-base text-red-300">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={send}
          disabled={disabled || sending || !dirty || errors.length > 0}
          className="rounded-lg bg-sky-500 px-4 py-2 text-lg font-semibold text-slate-950 disabled:opacity-40"
        >
          {sending ? 'Enviando…' : 'Enviar ao paciente'}
        </button>
        {dirty && (
          <button onClick={() => setDraft(toDraft(patient.protocol))} className="text-base text-slate-400 underline">
            Desfazer
          </button>
        )}
        <span aria-live="polite" className="text-base">
          {sendError ? (
            <span className="text-red-300">Falha ao enviar: {sendError}</span>
          ) : patient.protocolPending !== null ? (
            <span className="text-yellow-300">v{patient.protocolPending} enviado — aguardando o aparelho do paciente…</span>
          ) : patient.protocolAck?.version === patient.protocolVersion ? (
            <span className="text-green-300">
              ✓ v{patient.protocolAck.version} recebido pelo aparelho às {new Date(patient.protocolAck.at).toLocaleTimeString('pt-BR')}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
