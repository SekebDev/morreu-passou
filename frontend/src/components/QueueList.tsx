import type { RoomState } from '@/lib/types';
import { Icon } from './Icon';

export function QueueList({ room, me }: { room: RoomState; me: string }) {
  const byId = new Map(room.players.map((p) => [p.id, p]));
  // Mostra a fila a partir de quem joga agora, dando a volta.
  const order = room.queue.map((_, i) => room.queue[(room.current + i) % room.queue.length]);
  return (
    <section className="box p-4">
      <h2 className="font-display mb-3 flex items-center justify-between text-[calc(11px*var(--dz))] uppercase">
        <span>Fila</span>
        <span className="text-muted">rodada {room.round}</span>
      </h2>
      <ol className="flex flex-col gap-1">
        {order.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          const now = i === 0;
          return (
            <li
              key={id}
              className={`flex items-center gap-3 px-2 py-1 text-2xl ${now ? 'queue-now' : ''} ${p.connected ? '' : 'opacity-50'}`}
            >
              <span className="w-5">{now ? <Icon name="arrow" size={3} className="blink" /> : null}</span>
              <span className="font-display w-8 text-[calc(11px*var(--dz))] text-muted">{i === 0 ? 'JÁ' : `${i}º`}</span>
              <span className="flex-1 truncate">
                {p.name}
                {id === me && <span className="text-muted"> (você)</span>}
              </span>
              {id === room.ownerId && <Icon name="crown" size={2} title="dono da sala" />}
              {!p.connected && <span className="text-lg text-muted">offline</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
