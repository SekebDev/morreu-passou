'use client';

import { useEffect, useState } from 'react';
import { useTick } from '@/hooks/useNow';
import { useWakeLock } from '@/hooks/useWakeLock';
import { clock } from '@/lib/format';
import { emit } from '@/lib/socket';
import { unlockAudio } from '@/lib/sound';
import type { RoomState } from '@/lib/types';
import { BlockBar } from './BlockBar';
import { DeathSplash } from './DeathSplash';
import { Icon } from './Icon';
import { QueueList } from './QueueList';

interface Props {
  room: RoomState;
  me: string;
  serverNow: () => number;
  onError: (m: string) => void;
}

export function Party({ room, me, serverNow, onError }: Props) {
  useTick(true, 250);
  const currentId = room.queue[room.current];
  const myTurn = currentId === me;
  const left = room.phaseEndsAt ? room.phaseEndsAt - serverNow() : 0;
  const total = room.phaseEndsAt && room.phaseStartedAt ? room.phaseEndsAt - room.phaseStartedAt : 1;
  useWakeLock(myTurn);
  const [dead, setDead] = useState(false);

  async function act(event: string) {
    unlockAudio();
    const res = await emit(event);
    if (!res.ok) onError(res.error);
  }

  return (
    <div className="flex flex-col gap-6">
      {myTurn ? (
        room.phase === 'prep' ? (
          <GetReady left={left} total={total} onStart={() => act('turn:start')} />
        ) : (
          <Playing left={left} total={total} onDied={() => {
            setDead(true);
            void act('turn:died');
          }} />
        )
      ) : (
        <Waiting room={room} me={me} left={left} />
      )}

      <QueueList room={room} me={me} />

      {room.ownerId === me && <OwnerTools room={room} me={me} act={act} />}

      {dead && <DeathSplash onDone={() => setDead(false)} />}
    </div>
  );
}

function GetReady({ left, total, onStart }: { left: number; total: number; onStart: () => void }) {
  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <p className="section-title font-display bob text-[calc(22px*var(--dz))] leading-snug text-danger">Sua vez!</p>
      <p className="text-3xl">Pega o controle. O tempo começa sozinho em</p>
      <p className="timer-num font-display text-[calc(56px*var(--dz))] leading-none" aria-live="off">
        {Math.max(0, Math.ceil(left / 1000))}
      </p>
      <div className="w-full">
        <BlockBar value={left / total} tone="hi" blocks={10} />
      </div>
      <button className="px-btn green w-[calc(100%-8px)] py-6 text-[calc(15px*var(--dz))]" onClick={onStart}>
        <Icon name="pad" size={3} />
        Começar agora
      </button>
    </section>
  );
}

function Playing({ left, total, onDied }: { left: number; total: number; onDied: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  const low = left < 60_000;
  const critical = left < 10_000;

  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <p className="eyebrow font-display text-[calc(12px*var(--dz))] uppercase text-muted">Você está jogando</p>
      <p className={`timer-num font-display text-[calc(54px*var(--dz))] leading-none tabular-nums ${low ? 'text-danger' : ''} ${critical ? 'blink' : ''}`} role="timer" aria-live="off">
        {clock(left)}
      </p>
      <div className="w-full">
        <BlockBar value={left / total} tone={low ? 'danger' : 'ok'} />
      </div>
      <button
        className={`px-btn red mt-4 w-[calc(100%-8px)] flex-col !gap-3 py-8 text-[calc(22px*var(--dz))] ${armed ? 'shake' : ''}`}
        onClick={() => (armed ? onDied() : setArmed(true))}
      >
        <Icon name="skull" size={6} />
        {armed ? 'Toca de novo' : 'Morri'}
      </button>
      <p className="h-6 text-xl text-muted">{armed ? 'Confirma pra passar a vez.' : 'Morreu? Aperta aí e passa a vez.'}</p>
    </section>
  );
}

function Waiting({ room, me, left }: { room: RoomState; me: string; left: number }) {
  const current = room.players.find((p) => p.id === room.queue[room.current]);
  const myPos = room.queue.indexOf(me);
  const ahead = myPos === -1 ? -1 : (myPos - room.current + room.queue.length) % room.queue.length;

  return (
    <section className="box flex flex-col items-center gap-3 p-5 text-center">
      <Icon name="hourglass" size={6} className="bob" />
      <p className="section-title font-display text-[calc(14px*var(--dz))] leading-relaxed">Espere a sua vez</p>
      <p className="text-3xl">
        Agora é <strong className="text-danger">{current?.name ?? '…'}</strong>
        {room.phase === 'prep' ? ' pegando o controle' : ' jogando'}
      </p>
      <p className="font-display text-[calc(24px*var(--dz))] tabular-nums">
        {room.phase === 'prep' ? `${Math.max(0, Math.ceil(left / 1000))}s` : clock(left)}
      </p>
      {ahead === 1 && <p className="font-display blink mt-1 text-[calc(12px*var(--dz))] text-ok">Você é o próximo!</p>}
      {ahead === 2 && <p className="text-2xl text-muted">Só mais 1 pessoa antes de você.</p>}
      {ahead > 2 && <p className="text-2xl text-muted">Mais {ahead - 1} pessoas antes de você.</p>}
    </section>
  );
}

function OwnerTools({ room, me, act }: { room: RoomState; me: string; act: (e: string) => void }) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const current = room.players.find((p) => p.id === room.queue[room.current]);
  const someoneElse = room.queue[room.current] !== me;
  return (
    <details className="box p-4 box-sunk">
      <summary className="eyebrow font-display flex cursor-pointer items-center gap-2 text-[calc(11px*var(--dz))] uppercase">
        <Icon name="crown" size={2} /> Controles do dono
      </summary>
      <div className="mt-4 flex flex-col gap-2">
        {someoneElse && (
          <button className="px-btn ghost text-[calc(11px*var(--dz))]" onClick={() => act('turn:died')}>
            Pular {current?.name ?? 'vez'}
          </button>
        )}
        {confirmEnd ? (
          <div className="flex gap-2">
            <button className="px-btn red flex-1 text-[calc(11px*var(--dz))]" onClick={() => act('party:end')}>
              Encerrar
            </button>
            <button className="px-btn ghost flex-1 text-[calc(11px*var(--dz))]" onClick={() => setConfirmEnd(false)}>
              Voltar
            </button>
          </div>
        ) : (
          <button className="px-btn ghost text-[calc(11px*var(--dz))]" onClick={() => setConfirmEnd(true)}>
            Encerrar party
          </button>
        )}
      </div>
    </details>
  );
}
