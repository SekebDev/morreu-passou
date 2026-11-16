// Ícones desenhados em grade. Cada letra é uma cor da paleta, '.' é vazio.
const PALETTE: Record<string, string> = {
  k: '#231a1c', // tinta
  w: '#fff6e8', // osso
  r: '#c8352c', // sangue
  d: '#8e1f1a', // sangue escuro
  g: '#f0b429', // ouro
  o: '#b07a0c', // ouro escuro
  m: '#4f8a3c', // musgo
  b: '#3d6db3', // azul
  s: '#cfc3a8', // cinza
};

const ICONS = {
  skull: [
    '..kkkkkk..',
    '.kwwwwwwk.',
    'kwwwwwwwwk',
    'kwkkwwkkwk',
    'kwkkwwkkwk',
    'kwwwkkwwwk',
    '.kwwwwwwk.',
    '..kwkwkk..',
    '..kkkkkk..',
  ],
  heart: [
    '.kk...kk.',
    'krrk.kwrk',
    'krrrkrrrk',
    'krrrrrrrk',
    '.krrrrrk.',
    '..krrrk..',
    '...krk...',
    '....k....',
  ],
  crown: [
    'k...k...k',
    'kk.kgk.kk',
    'kgkgggkgk',
    'kgggggggk',
    'kgrgggbgk',
    'kgggggggk',
    'kkkkkkkkk',
  ],
  pad: [
    '.kkkkkkkkkk.',
    'kssssssssssk',
    'ksksssssrsk.',
    'kkkksssrsrsk',
    'ksksssssrssk',
    'kssssssssssk',
    '.kkk....kkk.',
  ],
  hourglass: [
    'kkkkkkk',
    'kwwwwwk',
    '.kgggk.',
    '..kgk..',
    '.kwgwk.',
    'kwgggwk',
    'kkkkkkk',
  ],
  arrow: ['kk...', 'kgk..', 'kggk.', 'kgggk', 'kggk.', 'kgk..', 'kk...'],
  palette: [
    '..kkkkk..',
    '.kwwwwwk.',
    'kwrwwgwwk',
    'kwwwwwwmk',
    'kwbwwkkwk',
    'kwwwk..k.',
    '.kwwk....',
    '..kk.....',
  ],
  star: ['....k....', '...kgk...', 'kkkkgkkkk', 'kgggggggk', '.kgggggk.', '.kggkggk.', 'kgk...kgk', 'kk.....kk'],
  door: [
    'kkkkkk',
    'kooook',
    'kooook',
    'koooko',
    'kooook',
    'kooook',
    'kkkkkk',
  ],
} as const;

export type IconName = keyof typeof ICONS;

export function PixelIcon({
  name,
  size = 4,
  className,
  title,
}: {
  name: IconName;
  /** tamanho de cada "pixel" em px */
  size?: number;
  className?: string;
  title?: string;
}) {
  const rows = ICONS[name];
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      shapeRendering="crispEdges"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          PALETTE[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[c]} /> : null,
        ),
      )}
    </svg>
  );
}
