'use client';

import { useTheme } from '@/hooks/useTheme';
import { PixelIcon, type IconName } from './PixelIcon';

// Versão em traço dos mesmos ícones, pros temas que não são pixel art.
const LINE: Record<IconName, React.ReactNode> = {
  skull: (
    <>
      <path d="M12 3a7.5 7.5 0 0 0-7.5 7.5v2.8L6.5 15v3.5h3V17h5v1.5h3V15l2-1.7v-2.8A7.5 7.5 0 0 0 12 3Z" />
      <circle cx="9" cy="11" r="1.6" fill="currentColor" />
      <circle cx="15" cy="11" r="1.6" fill="currentColor" />
      <path d="m12 13.2-.9 1.8h1.8z" fill="currentColor" />
    </>
  ),
  heart: <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />,
  crown: <path d="M3 18.5h18M3.5 7l4.2 4.8L12 5l4.3 6.8L20.5 7l-1.8 9.5H5.3Z" />,
  pad: (
    <>
      <rect x="2" y="7" width="20" height="11" rx="5.5" />
      <path d="M6.5 12.5h4M8.5 10.5v4" />
      <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="17.8" cy="13.8" r="1" fill="currentColor" />
    </>
  ),
  hourglass: <path d="M6 2.5h12M6 21.5h12M7.5 2.5v3.8L12 12l4.5-5.7V2.5M7.5 21.5v-3.8L12 12l4.5 5.7v3.8" />,
  arrow: <path d="m9 6 6 6-6 6" />,
  palette: (
    <>
      <path d="M12 2.5a9.5 9.5 0 1 0 0 19c1.3 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8h2.2a5 5 0 0 0 5-5c0-4.3-4.3-7.8-10-7.8Z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10" cy="7" r="1.2" fill="currentColor" />
      <circle cx="15" cy="7" r="1.2" fill="currentColor" />
    </>
  ),
  star: <path d="m12 2.8 2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9Z" />,
  door: <path d="M9.5 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4.5M16 17l5-5-5-5M21 12H9.5" />,
};

export function Icon({ name, size = 4, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  const { theme } = useTheme();
  if (theme.icons === 'pixel') return <PixelIcon name={name} size={size} className={className} title={title} />;
  const px = Math.round(size * 8.5);
  return (
    <svg
      viewBox="0 0 24 24"
      width={px}
      height={px}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon-line ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {LINE[name]}
    </svg>
  );
}
