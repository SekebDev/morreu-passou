export type ThemeId = 'cartucho' | 'vice' | 'cinzas' | 'neon';

export interface Theme {
  id: ThemeId;
  name: string;
  /** de onde veio a ideia, mostrado no seletor */
  vibe: string;
  /** texto que aparece na tela de quem morreu */
  deathText: string;
  /** cores pra amostra no seletor */
  swatch: [string, string, string];
  /** cor da barra do navegador no celular */
  themeColor: string;
  /** ícones em pixel ou em traço */
  icons: 'pixel' | 'line';
}

export const THEMES: Theme[] = [
  {
    id: 'cartucho',
    name: 'Cartucho',
    vibe: '8 bits, manual de papel',
    deathText: 'GAME OVER',
    swatch: ['#efe4cc', '#c8352c', '#4f8a3c'],
    themeColor: '#efe4cc',
    icons: 'pixel',
  },
  {
    id: 'vice',
    name: 'Vice',
    vibe: 'pôr do sol na Flórida, estilo GTA 6',
    deathText: 'JÁ ERA',
    swatch: ['#2a0f3d', '#ff3d8b', '#ffb347'],
    themeColor: '#2a0f3d',
    icons: 'line',
  },
  {
    id: 'cinzas',
    name: 'Cinzas',
    vibe: 'fogueira e castelo, estilo soulslike',
    deathText: 'VOCÊ MORREU',
    swatch: ['#100e0c', '#9b1b1b', '#c9a45c'],
    themeColor: '#100e0c',
    icons: 'line',
  },
  {
    id: 'neon',
    name: 'Neon',
    vibe: 'cidade cyberpunk à noite',
    deathText: 'FLATLINE',
    swatch: ['#0a0d12', '#fcee0a', '#00e5ff'],
    themeColor: '#0a0d12',
    icons: 'line',
  },
];

export const DEFAULT_THEME: ThemeId = 'cartucho';
export const THEME_KEY = 'mp:theme';

export const getTheme = (id: string | undefined | null) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Roda antes do React pra não piscar o tema errado. */
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_KEY}');if(t&&${JSON.stringify(
  ['cartucho', 'vice', 'cinzas', 'neon'],
)}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}`;
