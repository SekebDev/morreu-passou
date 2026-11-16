/** Barra de progresso em blocos, tipo vida de chefão. */
export function BlockBar({ value, blocks = 12, tone = 'moss' }: { value: number; blocks?: number; tone?: 'moss' | 'gold' | 'blood' }) {
  const filled = Math.ceil(Math.max(0, Math.min(1, value)) * blocks);
  const color = { moss: 'bg-moss', gold: 'bg-gold', blood: 'bg-blood' }[tone];
  return (
    <div className="px-box flex gap-1 p-2 [--box-bg:#2b2224]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      {Array.from({ length: blocks }, (_, i) => (
        <span key={i} className={`h-5 flex-1 ${i < filled ? color : 'bg-ink-2/40'}`} />
      ))}
    </div>
  );
}
