import { PixelIcon } from './PixelIcon';

export function Logo({ small = false }: { small?: boolean }) {
  if (small) {
    return (
      <span className="font-pixel inline-flex items-center gap-2 text-[11px] leading-none">
        <PixelIcon name="skull" size={2} />
        Morreu, <span className="text-blood">Passou</span>
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center select-none">
      <PixelIcon name="skull" size={7} className="bob" />
      <h1 className="font-pixel text-[26px] leading-[1.35] tracking-tight drop-shadow-[4px_4px_0_rgb(35_26_28_/_0.2)]">
        Morreu,
        <br />
        <span className="text-blood">Passou</span>
      </h1>
    </div>
  );
}
