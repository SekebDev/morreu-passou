'use client';

import { useState, type FormEvent } from 'react';
import { minutesLabel } from '@/lib/format';
import { emit } from '@/lib/socket';
import { QUEUE_MODES, TURN_MAX, TURN_MIN, TURN_OPTIONS, type RoomState } from '@/lib/types';
import { Icon } from './Icon';
import { Ranking } from './Ranking';

export function Lobby({ room, me, onError }: { room: RoomState; me: string; onError: (m: string) => void }) {
  const isOwner = room.ownerId === me;
  const owner = room.players.find((p) => p.id === room.ownerId);
  const [copied, setCopied] = useState(false);
  const enough = room.players.length >= 2;

  async function share() {
    const url = `${window.location.origin}/sala/${room.code}`;
    const text = `Bora? Entra na sala ${room.code} do Morreu, Passou`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Morreu, Passou', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  }

  async function act(event: string, body?: object) {
    const res = await emit(event, body);
    if (!res.ok) onError(res.error);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="box flex flex-col items-center gap-2 p-5 text-center">
        <span className="eyebrow font-display text-[calc(11px*var(--dz))] uppercase text-muted">Código da sala</span>
        <span className="font-display text-[calc(44px*var(--dz))] leading-none tracking-[0.18em] text-danger" aria-label={`Código ${room.code.split('').join(' ')}`}>
          {room.code}
        </span>
        <button className="px-btn ghost mt-2 text-[calc(11px*var(--dz))]" onClick={share}>
          {copied ? 'Link copiado!' : 'Chamar a galera'}
        </button>
      </section>

      <section className="box p-4">
        <h2 className="eyebrow font-display mb-3 flex justify-between text-[calc(11px*var(--dz))] uppercase">
          <span>Na sala</span>
          <span className="text-muted">{room.players.length}/16</span>
        </h2>
        <ul className="flex flex-col gap-1">
          {room.players.map((p) => (
            <li key={p.id} className={`flex items-center gap-3 px-2 py-1 text-2xl ${p.connected ? '' : 'opacity-50'}`}>
              <span className={`h-3 w-3 ${p.connected ? 'bg-ok' : 'bg-muted/40'}`} aria-hidden />
              <span className="flex-1 truncate">
                {p.name}
                {p.id === me && <span className="text-muted"> (você)</span>}
              </span>
              {p.id === room.ownerId && <Icon name="crown" size={2} title="dono da sala" />}
              {isOwner && p.id !== me && (
                <button
                  className="font-display px-2 text-[calc(10px*var(--dz))] text-danger underline decoration-2 underline-offset-4"
                  onClick={() => act('room:kick', { playerId: p.id })}
                  aria-label={`Remover ${p.name}`}
                >
                  tirar
                </button>
              )}
            </li>
          ))}
        </ul>
        {!enough && <p className="mt-3 text-xl text-muted">Precisa de pelo menos mais uma pessoa pra começar.</p>}
      </section>

      <Ranking room={room} />

      <TurnTime room={room} isOwner={isOwner} ownerName={owner?.name} act={act} />
      <QueueMode room={room} isOwner={isOwner} ownerName={owner?.name} act={act} />

      {isOwner ? (
        <button className="px-btn red w-[calc(100%-8px)] py-5 text-[calc(14px*var(--dz))]" disabled={!enough} onClick={() => act('party:start')}>
          <Icon name="pad" size={3} />
          Começar a party
        </button>
      ) : (
        <p className="text-center text-2xl">
          Esperando {owner?.name ?? 'o dono'} começar<span className="blink">…</span>
        </p>
      )}
    </div>
  );
}

type Act = (event: string, body?: object) => Promise<void>;
interface ConfigProps {
  room: RoomState;
  isOwner: boolean;
  ownerName?: string;
  act: Act;
}

function choiceClass(active: boolean, isOwner: boolean) {
  return `px-btn !m-1 !px-1 !text-[calc(10px*var(--dz))] ${active ? 'blue' : 'ghost'} ${!isOwner ? 'cursor-default' : ''} ${!isOwner && !active ? 'opacity-50' : ''}`;
}

function TurnTime({ room, isOwner, ownerName, act }: ConfigProps) {
  const isPreset = TURN_OPTIONS.some((o) => o.minutes === room.turnMinutes);
  const [custom, setCustom] = useState(!isPreset);
  const [value, setValue] = useState(isPreset ? '' : String(room.turnMinutes));
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= TURN_MIN && n <= TURN_MAX;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (valid) void act('room:config', { minutes: n });
  }

  return (
    <section className="box p-4">
      <h2 className="eyebrow font-display mb-3 flex justify-between text-[calc(11px*var(--dz))] uppercase">
        <span>Tempo de cada vez</span>
        {!isPreset && <span className="text-muted">{minutesLabel(room.turnMinutes)}</span>}
      </h2>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Tempo de cada vez">
        {TURN_OPTIONS.map((opt) => {
          const active = room.turnMinutes === opt.minutes && !custom;
          return (
            <button
              key={opt.minutes}
              role="radio"
              aria-checked={active}
              aria-disabled={!isOwner}
              onClick={() => {
                if (!isOwner) return;
                setCustom(false);
                void act('room:config', { minutes: opt.minutes });
              }}
              className={choiceClass(active, isOwner)}
            >
              {opt.label}
            </button>
          );
        })}
        <button
          role="radio"
          aria-checked={custom || !isPreset}
          aria-disabled={!isOwner}
          onClick={() => {
            if (!isOwner) return;
            setCustom(true);
            if (!value) setValue(String(room.turnMinutes));
          }}
          className={choiceClass(custom || !isPreset, isOwner)}
        >
          Outro
        </button>
      </div>
      {isOwner && custom && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <label htmlFor="turn-custom" className="sr-only">
            Minutos por vez
          </label>
          <input
            id="turn-custom"
            className="px-input !w-28 text-center tabular-nums"
            type="number"
            inputMode="numeric"
            min={TURN_MIN}
            max={TURN_MAX}
            step={1}
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
          />
          <span className="text-2xl">min</span>
          <button className="px-btn green ml-auto !text-[calc(10px*var(--dz))]" disabled={!valid || n === room.turnMinutes}>
            Usar
          </button>
        </form>
      )}
      {isOwner && custom && value !== '' && !valid && (
        <p className="mt-2 text-xl text-danger">
          De {TURN_MIN} a {TURN_MAX} minutos.
        </p>
      )}
      {!isOwner && <p className="mt-2 text-xl text-muted">Só {ownerName ?? 'o dono'} muda o tempo.</p>}
    </section>
  );
}

function QueueMode({ room, isOwner, ownerName, act }: ConfigProps) {
  const current = QUEUE_MODES.find((m) => m.mode === room.queueMode) ?? QUEUE_MODES[0];
  return (
    <section className="box p-4">
      <h2 className="eyebrow font-display mb-3 text-[calc(11px*var(--dz))] uppercase">Estilo da fila</h2>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Estilo da fila">
        {QUEUE_MODES.map((m) => {
          const active = room.queueMode === m.mode;
          return (
            <button
              key={m.mode}
              role="radio"
              aria-checked={active}
              aria-disabled={!isOwner}
              onClick={() => isOwner && act('room:queue-mode', { mode: m.mode })}
              className={`${choiceClass(active, isOwner)} leading-snug`}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xl text-muted">{current.hint}</p>
      {!isOwner && <p className="mt-1 text-xl text-muted">Só {ownerName ?? 'o dono'} muda a fila.</p>}
    </section>
  );
}
