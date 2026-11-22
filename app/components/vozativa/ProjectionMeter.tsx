'use client';

/**
 * Medidor visual de projeção RELATIVA (0.5x..2.0x), compartilhado entre o hub
 * do paciente e o monitor clínico.
 *
 * A escala é sempre relativa à linha de base habitual do paciente. Marca em
 * 1.0x (tom normal) e marca destacada na meta do fonoaudiólogo.
 */

import { cn } from '@/lib/utils';

const SCALE_MIN = 0.5;
const SCALE_MAX = 2.0;

function toPercent(multiplier: number): number {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, multiplier));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

interface ProjectionMeterProps {
  liveMultiplier: number;
  targetMultiplier: number;
  /** 'patient' = barra gigante acessível; 'clinic' = mini medidor. */
  variant?: 'patient' | 'clinic';
  className?: string;
}

export function ProjectionMeter({
  liveMultiplier,
  targetMultiplier,
  variant = 'patient',
  className,
}: ProjectionMeterProps) {
  const hitTarget = liveMultiplier >= targetMultiplier;
  const fillPct = toPercent(liveMultiplier);
  const normalPct = toPercent(1.0);
  const targetPct = toPercent(targetMultiplier);

  const isPatient = variant === 'patient';

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative w-full overflow-hidden',
          isPatient ? 'h-14 rounded-xl bg-slate-800' : 'h-6 rounded-md bg-slate-200',
        )}
        role="meter"
        aria-valuemin={SCALE_MIN}
        aria-valuemax={SCALE_MAX}
        aria-valuenow={Number(liveMultiplier.toFixed(2))}
        aria-label="Projeção vocal relativa à linha de base"
      >
        {/* Preenchimento proporcional ao multiplicador ao vivo. */}
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-[width,background-color] duration-150 ease-out',
            hitTarget ? 'bg-emerald-500' : 'bg-amber-500',
          )}
          style={{ width: `${fillPct}%` }}
        />

        {/* Marca do tom normal (1.0x). */}
        <Marker
          pct={normalPct}
          color={isPatient ? 'bg-slate-400' : 'bg-slate-500'}
          strong={false}
        />

        {/* Marca destacada da meta do fonoaudiólogo. */}
        <Marker
          pct={targetPct}
          color={isPatient ? 'bg-slate-50' : 'bg-teal-700'}
          strong
        />
      </div>

      {isPatient && (
        <div className="mt-2 flex justify-between text-base font-medium text-slate-300">
          <span style={{ marginLeft: `calc(${normalPct}% - 3rem)` }}>
            Tom Normal (1.0x)
          </span>
          <span
            className="font-semibold text-slate-50"
            style={{ marginRight: `calc(${100 - targetPct}% - 3rem)` }}
          >
            Meta do Fono ({targetMultiplier.toFixed(2)}x)
          </span>
        </div>
      )}

      {isPatient ? (
        <p
          className={cn(
            'mt-4 text-center text-2xl font-bold md:text-3xl',
            hitTarget ? 'text-emerald-400' : 'text-amber-400',
          )}
        >
          {hitTarget
            ? 'Ótima projeção! Meta atingida'
            : 'Projete um pouco mais a voz'}
        </p>
      ) : (
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>1.0x</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              hitTarget ? 'text-emerald-600' : 'text-amber-600',
            )}
          >
            {liveMultiplier.toFixed(2)}x / {targetMultiplier.toFixed(2)}x
          </span>
          <span>2.0x</span>
        </div>
      )}
    </div>
  );
}

function Marker({
  pct,
  color,
  strong,
}: {
  pct: number;
  color: string;
  strong: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-y-0 -translate-x-1/2',
        strong ? 'w-1' : 'w-0.5',
        color,
      )}
      style={{ left: `${pct}%` }}
      aria-hidden
    />
  );
}
