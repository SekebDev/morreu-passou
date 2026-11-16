'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { THEMES } from '@/lib/themes';
import { Icon } from './Icon';

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        className="link-btn font-display flex items-center gap-2 text-[calc(10px*var(--dz))] uppercase"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="palette" size={2} />
        {compact ? 'Tema' : `Tema: ${theme.name}`}
      </button>
      {open && (
        <ul role="listbox" aria-label="Escolher tema" className="box theme-menu absolute right-0 z-40 mt-3 flex w-72 flex-col gap-1 p-2">
          {THEMES.map((t) => {
            const active = t.id === theme.id;
            return (
              <li key={t.id}>
                <button
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`theme-option flex w-full items-center gap-3 px-3 py-2 text-left ${active ? 'is-active' : ''}`}
                >
                  <span className="flex shrink-0" aria-hidden>
                    {t.swatch.map((c) => (
                      <span key={c} className="h-6 w-3" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="font-display text-[calc(12px*var(--dz))] uppercase leading-tight">{t.name}</span>
                    <span className="truncate text-lg leading-tight text-muted">{t.vibe}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
