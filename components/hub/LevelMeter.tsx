'use client';
/**
 * Giant vertical loudness meter for the patient hub (high contrast, no small text).
 * The green band starts at the therapist's target above the patient's habitual voice:
 * "fill the bar into the green" is the whole instruction.
 */
import { meterReading, type MeterZone } from '@/lib/hub/meter-scale';

const ZONE_STYLE: Record<MeterZone, { bar: string; label: string }> = {
  quiet: { bar: 'bg-gray-500', label: 'Mais forte!' },
  habitual: { bar: 'bg-sky-400', label: 'Mais forte!' },
  almost: { bar: 'bg-yellow-300', label: 'Quase lá!' },
  target: { bar: 'bg-green-400', label: 'Isso! Forte!' },
};

export interface LevelMeterProps {
  /** Smoothed current level, dBFS */
  levelDb: number;
  habitualDb: number;
  targetEffortDb: number;
  /** Show the live zone label (only while measuring an attempt) */
  active?: boolean;
  className?: string;
}

export function LevelMeter({ levelDb, habitualDb, targetEffortDb, active = false, className = '' }: LevelMeterProps) {
  const r = meterReading(levelDb, habitualDb, targetEffortDb);
  const style = ZONE_STYLE[r.zone];
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <div className={`flex items-end gap-6 ${className}`}>
      <div
        role="meter"
        aria-label="Força da voz"
        aria-valuemin={-12}
        aria-valuemax={18}
        aria-valuenow={r.effortDb}
        aria-valuetext={`${style.label} ${r.effortDb >= targetEffortDb ? 'meta atingida' : 'abaixo da meta'}`}
        className="relative h-[55vh] min-h-64 w-36 overflow-hidden rounded-3xl border-4 border-gray-600 bg-gray-900"
      >
        {/* target band */}
        <div
          className="absolute inset-x-0 top-0 border-b-4 border-dashed border-green-300 bg-green-900/50"
          style={{ height: pct(1 - r.targetAt) }}
        />
        {/* live bar */}
        <div className={`absolute inset-x-0 bottom-0 transition-[height] duration-75 ${style.bar}`} style={{ height: pct(r.fill) }} />
        {/* habitual voice line */}
        <div className="absolute inset-x-0 border-t-4 border-white/70" style={{ bottom: pct(r.habitualAt) }} />
      </div>
      <div className="relative h-[55vh] min-h-64 w-56 text-left text-2xl">
        <span className="absolute -translate-y-1/2 font-bold text-green-300" style={{ bottom: pct(r.targetAt) }}>
          Meta
        </span>
        <span className="absolute translate-y-1/2 text-gray-300" style={{ bottom: pct(r.habitualAt) }}>
          Voz de costume
        </span>
        {active && (
          <span
            className={`absolute left-0 top-0 text-4xl font-bold ${r.zone === 'target' ? 'text-green-300' : 'text-yellow-200'}`}
            aria-live="polite"
          >
            {style.label}
          </span>
        )}
      </div>
    </div>
  );
}
