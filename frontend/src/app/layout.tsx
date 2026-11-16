import type { Metadata, Viewport } from 'next';
import { Press_Start_2P, VT323 } from 'next/font/google';
import './globals.css';

const pressStart = Press_Start_2P({ weight: '400', subsets: ['latin'], variable: '--font-press-start' });
const vt323 = VT323({ weight: '400', subsets: ['latin'], variable: '--font-vt323' });

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
    <html lang="pt-BR" className={`${pressStart.variable} ${vt323.variable}`}>
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-10">{children}</main>
      </body>
    </html>
  );
}
