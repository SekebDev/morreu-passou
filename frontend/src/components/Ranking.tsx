import { played } from '@/lib/format';
import type { PlayerStats, RoomState } from '@/lib/types';
import { Icon } from './Icon';

type Row = { id: string; name: string; value: string };

function top(entries: [string, PlayerStats][], score: (s: PlayerStats) => number | null, show: (s: PlayerStats) => string, asc = false): Row[] {
  return entries
    .filter(([, s]) => {
      const v = score(s);
      return v !== null && v > 0;
    })
    .sort(([, a], [, b]) => (asc ? score(a)! - score(b)! : score(b)! - score(a)!))
    .slice(0, 3)
    .map(([id, s]) => ({ id, name: s.name, value: show(s) }));
}

/** Ranking da última party: aparece no lobby depois que ela acaba. */
export function Ranking({ room }: { room: RoomState }) {
  const entries = Object.entries(room.stats ?? {});
  if (!entries.some(([, s]) => s.playedMs > 0)) return null;

  const categories = [
    { title: 'Mais tempo jogando', rows: top(entries, (s) => s.playedMs, (s) => played(s.playedMs)) },
    { title: 'Morreu mais', rows: top(entries, (s) => s.deaths, (s) => `${s.deaths}x`) },
    {
      title: 'Morte mais rápida',
      rows: top(entries, (s) => (s.fastestDeathMs === null ? null : s.fastestDeathMs + 1), (s) => played(s.fastestDeathMs ?? 0), true),
    },
  ].filter((c) => c.rows.length > 0);

  return (
    <section className="box p-4">
      <h2 className="eyebrow font-display mb-3 flex items-center gap-2 text-[calc(11px*var(--dz))] uppercase">
        <Icon name="star" size={2} />
        <span>Ranking da última party</span>
      </h2>
      <div className="flex flex-col gap-4">
        {categories.map((c) => (
          <div key={c.title}>
            <h3 className="font-display mb-1 text-[calc(10px*var(--dz))] uppercase text-muted">{c.title}</h3>
            <ol className="flex flex-col">
              {c.rows.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-3 px-2 py-0.5 text-2xl ${i === 0 ? 'queue-now' : ''}`}>
                  <span className="font-display w-8 text-[calc(11px*var(--dz))] text-muted">{i + 1}º</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="tabular-nums">{r.value}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
