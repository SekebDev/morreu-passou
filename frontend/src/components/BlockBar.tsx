'use client';

import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';

type Tone = 'ok' | 'hi' | 'danger';

/** Barra de tempo. Cada tema tem a sua: blocos, estrelas, fio dourado ou segmentos. */
export function BlockBar({ value, blocks = 12, tone = 'ok' }: { value: number; blocks?: number; tone?: Tone }) {
  const { theme } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  const a11y = { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v * 100) } as const;
  const fill = { ok: 'bg-ok', hi: 'bg-hi', danger: 'bg-danger' }[tone];

  if (theme.id === 'vice') {
    const stars = 5;
    const lit = Math.ceil(v * stars);
    return (
      <div className="flex justify-center gap-2" {...a11y}>
        {Array.from({ length: stars }, (_, i) => (
          <span key={i} className={`vice-star ${i < lit ? (tone === 'danger' ? 'is-hot' : 'is-lit') : ''}`}>
            <Icon name="star" size={4} />
          </span>
        ))}
      </div>
    );
  }

  if (theme.id === 'cinzas') {
    return (
      <div className="cinzas-bar" {...a11y}>
        <span className={`cinzas-bar-fill ${tone === 'danger' ? 'is-low' : ''}`} style={{ width: `${v * 100}%` }} />
      </div>
    );
  }

  const n = theme.id === 'neon' ? 24 : blocks;
  const filled = Math.ceil(v * n);
  return (
    <div className="box box-track flex gap-1 p-2" {...a11y}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`bar-cell h-5 flex-1 ${i < filled ? fill : 'bar-empty'}`} />
      ))}
    </div>
  );
}
