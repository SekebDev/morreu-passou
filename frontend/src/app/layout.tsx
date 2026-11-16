import type { Metadata, Viewport } from 'next';
import {
  Chakra_Petch,
  Cinzel,
  EB_Garamond,
  Oswald,
  Outfit,
  Press_Start_2P,
  Rajdhani,
  VT323,
} from 'next/font/google';
import { Backdrop } from '@/components/Backdrop';
import { ThemeProvider } from '@/hooks/useTheme';
import { themeBootScript } from '@/lib/themes';
import './globals.css';

// Cartucho (padrão)
const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-press-start' });
const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323' });
// Vice
const oswald = Oswald({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-oswald', preload: false });
const outfit = Outfit({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-outfit', preload: false });
// Cinzas
const cinzel = Cinzel({ weight: ['500', '700'], subsets: ['latin'], variable: '--font-cinzel', preload: false });
const garamond = EB_Garamond({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-garamond', preload: false });
// Neon
const rajdhani = Rajdhani({ weight: ['600', '700'], subsets: ['latin'], variable: '--font-rajdhani', preload: false });
const chakra = Chakra_Petch({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-chakra', preload: false });

const fonts = [pressStart, vt323, oswald, outfit, cinzel, garamond, rajdhani, chakra].map((f) => f.variable).join(' ');

export const metadata: Metadata = {
  title: 'Morreu, Passou',
  description: 'Fila de quem joga agora. Um controle, vários amigos: morreu, passa a vez.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#efe4cc',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="cartucho" className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>
          <Backdrop />
          <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[448px] flex-col px-4 pt-6 pb-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
