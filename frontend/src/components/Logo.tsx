'use client';

import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';

export function Logo({ small = false }: { small?: boolean }) {
  const { theme } = useTheme();

  if (small) {
    return (
      <span className="logo-small font-display inline-flex items-center gap-2 text-[calc(11px*var(--dz))] leading-none">
        <Icon name="skull" size={2} />
        <span>
          Morreu, <span className="logo-accent">Passou</span>
        </span>
      </span>
    );
  }

  if (theme.id === 'vice') {
    return (
      <div className="flex flex-col items-center text-center select-none">
        <h1 className="vice-logo">
          <span className="vice-logo-top">Morreu,</span>
          <span className="vice-logo-script">Passou</span>
        </h1>
      </div>
    );
  }

  if (theme.id === 'cinzas') {
    return (
      <div className="flex flex-col items-center gap-3 text-center select-none">
        <Icon name="skull" size={6} className="text-hi" />
        <h1 className="cinzas-logo">
          Morreu,
          <br />
          Passou
        </h1>
        <span className="cinzas-rule" aria-hidden />
      </div>
    );
  }

  if (theme.id === 'neon') {
    return (
      <div className="flex flex-col items-start gap-2 select-none">
        <h1 className="neon-logo" data-text="MORREU, PASSOU">
          Morreu,
          <br />
          <span className="neon-logo-hi">Passou</span>
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center select-none">
      <Icon name="skull" size={7} className="bob" />
      <h1 className="font-display text-[calc(26px*var(--dz))] leading-[1.35] tracking-tight drop-shadow-[4px_4px_0_rgb(35_26_28_/_0.2)]">
        Morreu,
        <br />
        <span className="text-danger">Passou</span>
      </h1>
    </div>
  );
}
