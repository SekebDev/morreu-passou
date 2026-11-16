'use client';

import { useEffect, useState } from 'react';

/** Faixa que sobe da base quando algo acontece ("Fulano morreu"). */
export function Toast({ message, stamp }: { message: string | null; stamp: number }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    setShown(message);
    const id = setTimeout(() => setShown(null), 3500);
    return () => clearTimeout(id);
  }, [message, stamp]);

  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]" aria-live="polite">
      <div className="box drop-in max-w-md px-4 py-2 text-center text-2xl box-dark">{shown}</div>
    </div>
  );
}
