'use client';

import { useTheme } from '@/hooks/useTheme';

/** Cenário atrás do conteúdo. Fica parado e não recebe toque. */
export function Backdrop() {
  const { theme } = useTheme();
  if (theme.id === 'vice') return <div className="backdrop vice-backdrop" aria-hidden />;
  if (theme.id === 'cinzas') {
    return (
      <div className="backdrop cinzas-backdrop" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className="ember" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.83) % 7}s`, animationDuration: `${7 + (i % 5)}s` }} />
        ))}
      </div>
    );
  }
  if (theme.id === 'neon') return <div className="backdrop neon-backdrop" aria-hidden />;
  return null;
}
