'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_THEME, getTheme, THEME_KEY, type Theme, type ThemeId } from '@/lib/themes';

const Ctx = createContext<{ theme: Theme; setTheme: (id: ThemeId) => void }>({
  theme: getTheme(DEFAULT_THEME),
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    setId(getTheme(document.documentElement.dataset.theme).id);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setId(next);
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getTheme(next).themeColor);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* sem storage */
    }
  }, []);

  return <Ctx.Provider value={{ theme: getTheme(id), setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
