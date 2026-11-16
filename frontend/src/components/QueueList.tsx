import { played } from '@/lib/format';
import { QUEUE_MODES, type RoomState } from '@/lib/types';
import { Icon } from './Icon';

export function QueueList({ room, me }: { room: RoomState; me: string }) {
  const byId = new Map(room.players.map((p) => [p.id, p]));
  const order = room.queue;
  const mode = QUEUE_MODES.find((m) => m.mode === room.queueMode);
  return (
    <section className="box p-4">
      <h2 className="eyebrow font-display mb-3 flex items-center justify-between text-[calc(11px*var(--dz))] uppercase">
        <span>Fila</span>
        <span className="text-muted">rodada {room.round}</span>
      </h2>
      {mode && <p className="-mt-2 mb-2 text-lg text-muted">{mode.label}</p>}
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
              {room.queueMode === 'menos-tempo' && (
                <span className="text-lg tabular-nums text-muted" title="tempo jogado">
                  {played(room.stats[id]?.playedMs ?? 0)}
                </span>
              )}
              {room.queueMode === 'menos-vezes' && (
                <span className="text-lg tabular-nums text-muted" title="vezes que jogou">
                  {room.stats[id]?.turns ?? 0}x
                </span>
              )}
              {id === room.ownerId && <Icon name="crown" size={2} title="dono da sala" />}
              {!p.connected && <span className="text-lg text-muted">offline</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
