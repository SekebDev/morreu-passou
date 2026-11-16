import type { RoomState } from '@/lib/types';
import { PixelIcon } from './PixelIcon';

export function QueueList({ room, me }: { room: RoomState; me: string }) {
  const byId = new Map(room.players.map((p) => [p.id, p]));
  // Mostra a fila a partir de quem joga agora, dando a volta.
  const order = room.queue.map((_, i) => room.queue[(room.current + i) % room.queue.length]);
  return (
    <section className="px-box p-4">
      <h2 className="font-pixel mb-3 flex items-center justify-between text-[11px] uppercase">
        <span>Fila</span>
        <span className="text-ink-2">rodada {room.round}</span>
      </h2>
      <ol className="flex flex-col gap-1">
        {order.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          const now = i === 0;
          return (
            <li
              key={id}
              className={`flex items-center gap-3 px-2 py-1 text-2xl ${now ? 'bg-gold/50' : ''} ${p.connected ? '' : 'opacity-50'}`}
            >
              <span className="w-5">{now ? <PixelIcon name="arrow" size={3} className="blink" /> : null}</span>
              <span className="font-pixel w-8 text-[11px] text-ink-2">{i === 0 ? 'JÁ' : `${i}º`}</span>
              <span className="flex-1 truncate">
                {p.name}
                {id === me && <span className="text-ink-2"> (você)</span>}
              </span>
              {id === room.ownerId && <PixelIcon name="crown" size={2} title="dono da sala" />}
              {!p.connected && <span className="text-lg text-ink-2">offline</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
