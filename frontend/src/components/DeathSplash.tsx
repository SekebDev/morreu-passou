'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

/** Tela cheia rápida quando você aperta "morri". */
export function DeathSplash({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  useEffect(() => {
    const id = setTimeout(onDone, 1900);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <div className="death-splash" role="status" aria-live="assertive" onClick={onDone}>
      <span className="death-text" data-text={theme.deathText}>
        {theme.deathText}
      </span>
    </div>
  );
}
