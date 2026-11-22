'use client';

/**
 * Gráfico longitudinal de 14 dias (SVG puro, sem dependências).
 * Mostra a evolução diária do esforço relativo médio, com linha tracejada na
 * meta do fonoaudiólogo. O ponto do dia atual aparece assim que a sessão é
 * concluída.
 */

import type { DailyProgressPoint } from '@/types/vozativa';

interface ProgressChartProps {
  points: DailyProgressPoint[];
  targetMultiplier: number;
}

const W = 720;
const H = 240;
const PAD = { top: 20, right: 16, bottom: 32, left: 40 };
const Y_MIN = 1.0;
const Y_MAX = 1.6;

function x(i: number, n: number): number {
  const inner = W - PAD.left - PAD.right;
  if (n <= 1) return PAD.left;
  return PAD.left + (i / (n - 1)) * inner;
}

function y(value: number): number {
  const inner = H - PAD.top - PAD.bottom;
  const clamped = Math.max(Y_MIN, Math.min(Y_MAX, value));
  return PAD.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * inner;
}

export function ProgressChart({ points, targetMultiplier }: ProgressChartProps) {
  const completed = points.filter((p) => p.completed && p.avgMultiplier > 0);
  const n = points.length;

  const linePath = completed
    .map((p) => {
      const i = points.indexOf(p);
      return `${i === points.indexOf(completed[0]) ? 'M' : 'L'} ${x(i, n).toFixed(
        1,
      )} ${y(p.avgMultiplier).toFixed(1)}`;
    })
    .join(' ');

  const yTicks = [1.0, 1.2, 1.4, 1.6];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Evolução do esforço vocal relativo nos últimos 14 dias"
    >
      {/* Grade horizontal + rótulos do eixo Y */}
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 8}
            y={y(t) + 4}
            textAnchor="end"
            className="fill-slate-400"
            fontSize={11}
          >
            {t.toFixed(1)}x
          </text>
        </g>
      ))}

      {/* Linha de meta (tracejada) */}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(targetMultiplier)}
        y2={y(targetMultiplier)}
        stroke="#0d9488"
        strokeWidth={1.5}
        strokeDasharray="6 5"
      />
      <text
        x={W - PAD.right}
        y={y(targetMultiplier) - 6}
        textAnchor="end"
        className="fill-teal-600"
        fontSize={11}
        fontWeight={600}
      >
        Meta {targetMultiplier.toFixed(2)}x
      </text>

      {/* Linha de evolução */}
      {completed.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke="#0f766e"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Pontos */}
      {points.map((p, i) => {
        if (!p.completed || p.avgMultiplier <= 0) return null;
        const hit = p.avgMultiplier >= targetMultiplier;
        const isLast = i === n - 1;
        return (
          <circle
            key={p.date}
            cx={x(i, n)}
            cy={y(p.avgMultiplier)}
            r={isLast ? 5 : 3.5}
            className={hit ? 'fill-emerald-500' : 'fill-amber-500'}
            stroke="#ffffff"
            strokeWidth={isLast ? 2 : 1}
          />
        );
      })}

      {/* Rótulos do eixo X (a cada 2 dias p/ não poluir) */}
      {points.map((p, i) =>
        i % 2 === 0 || i === n - 1 ? (
          <text
            key={`lbl-${p.date}`}
            x={x(i, n)}
            y={H - PAD.bottom + 18}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize={10}
          >
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
