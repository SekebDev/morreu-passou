'use client';

import { useTheme } from '@/hooks/useTheme';

/** Cenário atrás do conteúdo. Fica parado e não recebe toque. */
export function Backdrop() {
  const { theme } = useTheme();
  if (theme.id === 'vice') {
    return (
      <div className="backdrop vice-backdrop" aria-hidden>
        <div className="vice-sun" />
        <svg className="vice-palms" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice">
          <g fill="currentColor">
            {/* palmeira da esquerda */}
            <path d="M58 300c6-60 10-120 4-178l7-1c6 60 3 120-3 179z" />
            <path d="M64 122c-22-14-48-16-70-4 22-2 44 4 62 14zM64 122c-8-24-28-40-52-44 18 10 32 26 42 46zM64 122c10-24 32-38 58-40-22 8-40 22-50 42zM64 122c24-8 50-4 70 12-22-6-44-6-64 0zM64 122c-2-26 6-50 24-66-10 20-14 42-14 64zM64 122c-26 2-46 18-56 40 14-16 34-28 54-30z" />
            {/* palmeira da direita, mais alta */}
            <path d="M318 300c-10-80-6-160 12-232l7 2c-16 72-20 150-11 230z" />
            <path d="M332 70c-24-12-52-10-74 6 24-6 48-2 68 10zM332 70c-4-26-22-46-46-54 16 14 28 34 34 56zM332 70c14-22 38-32 64-30-24 6-44 18-56 36zM332 70c22-4 46 6 62 24-20-10-42-14-62-12zM332 70c4-24 18-44 38-56-14 18-22 38-24 60zM332 70c-22 8-36 26-40 48 10-18 26-32 46-38z" />
            {/* morros e prédios no horizonte */}
            <path d="M0 300v-46l30-4 0-14h18v10l26-2v-22h14v20l40-2v-30h22v28l30 0v-12h12v12l60 2v-26h16v26l40 2v-16h20v18l72 4v52z" opacity=".9" />
          </g>
        </svg>
      </div>
    );
  }
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
