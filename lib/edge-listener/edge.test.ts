import { describe, expect, it } from 'vitest';
import { KEYWORD_GRAMMAR, matchKeyword } from './keywords';
import { createImpactDetector } from './impact';

describe('matchKeyword (v2 start command)', () => {
  it.each(['gabriel vamos treinar', 'vamos treinar', '[unk] vamos treinar', 'treinar', 'Gabriel, treinar'])(
    '"%s" → treinar',
    (text) => {
      expect(matchKeyword(text)).toBe('treinar');
    },
  );

  it.each(['', '[unk]', '[unk] [unk]', 'gabriel', 'bom dia', 'socorro', 'treino'])('ignores "%s"', (text) => {
    expect(matchKeyword(text)).toBeNull();
  });

  it('grammar restricts Vosk to the start command plus [unk]', () => {
    const g = JSON.parse(KEYWORD_GRAMMAR) as string[];
    expect(g).toContain('vamos treinar');
    expect(g).toContain('[unk]');
    expect(g).not.toContain('socorro');
  });
});

describe('createImpactDetector', () => {
  const opts = { spikeRms: 0.3, floorRms: 0.02, silenceMs: 2000 };
  /** feeds frames every 100 ms; returns the times at which the detector fired */
  function run(levels: number[]) {
    const d = createImpactDetector(opts);
    const fired: number[] = [];
    levels.forEach((rms, i) => {
      if (d.feed({ t: i * 100, rms })) fired.push(i * 100);
    });
    return fired;
  }
  const quiet = (n: number) => Array(n).fill(0.005);

  it('fires once after a spike followed by 2 s of silence', () => {
    expect(run([...quiet(5), 0.6, ...quiet(25)])).toEqual([2500]);
  });

  it('does not fire when sound continues after the spike (normal activity)', () => {
    expect(run([...quiet(5), 0.6, ...Array(25).fill(0.1)])).toEqual([]);
  });

  it('does not fire on moderate sounds without a spike', () => {
    expect(run([...Array(10).fill(0.15), ...quiet(30)])).toEqual([]);
  });

  it('re-arms on a new spike during the silence window', () => {
    expect(run([0.6, ...quiet(10), 0.7, ...quiet(25)])).toEqual([3100]);
  });

  it('can fire again after a later, separate event', () => {
    expect(run([0.6, ...quiet(25), 0.6, ...quiet(25)])).toHaveLength(2);
  });
});
