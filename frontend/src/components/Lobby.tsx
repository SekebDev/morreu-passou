'use client';

import { useState } from 'react';
import { emit } from '@/lib/socket';
import { TURN_OPTIONS, type RoomState } from '@/lib/types';
import { PixelIcon } from './PixelIcon';

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
      <section className="px-box flex flex-col items-center gap-2 p-5 text-center">
        <span className="font-pixel text-[11px] uppercase text-ink-2">Código da sala</span>
        <span className="font-pixel text-[44px] leading-none tracking-[0.18em] text-blood" aria-label={`Código ${room.code.split('').join(' ')}`}>
          {room.code}
        </span>
        <button className="px-btn ghost mt-2 text-[11px]" onClick={share}>
          {copied ? 'Link copiado!' : 'Chamar a galera'}
        </button>
      </section>

      <section className="px-box p-4">
        <h2 className="font-pixel mb-3 flex justify-between text-[11px] uppercase">
          <span>Na sala</span>
          <span className="text-ink-2">{room.players.length}/16</span>
        </h2>
        <ul className="flex flex-col gap-1">
          {room.players.map((p) => (
            <li key={p.id} className={`flex items-center gap-3 px-2 py-1 text-2xl ${p.connected ? '' : 'opacity-50'}`}>
              <span className={`h-3 w-3 ${p.connected ? 'bg-moss' : 'bg-ink-2/40'}`} aria-hidden />
              <span className="flex-1 truncate">
                {p.name}
                {p.id === me && <span className="text-ink-2"> (você)</span>}
              </span>
              {p.id === room.ownerId && <PixelIcon name="crown" size={2} title="dono da sala" />}
              {isOwner && p.id !== me && (
                <button
                  className="font-pixel px-2 text-[10px] text-blood underline decoration-2 underline-offset-4"
                  onClick={() => act('room:kick', { playerId: p.id })}
                  aria-label={`Remover ${p.name}`}
                >
                  tirar
                </button>
              )}
            </li>
          ))}
        </ul>
        {!enough && <p className="mt-3 text-xl text-ink-2">Precisa de pelo menos mais uma pessoa pra começar.</p>}
      </section>

      <section className="px-box p-4">
        <h2 className="font-pixel mb-3 text-[11px] uppercase">Tempo de cada vez</h2>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Tempo de cada vez">
          {TURN_OPTIONS.map((opt) => {
            const active = room.turnMinutes === opt.minutes;
            return (
              <button
                key={opt.minutes}
                role="radio"
                aria-checked={active}
                disabled={!isOwner}
                onClick={() => act('room:config', { minutes: opt.minutes })}
                className={`px-btn !m-1 !px-1 !text-[10px] ${active ? 'blue' : 'ghost'} ${!isOwner && !active ? 'opacity-50' : ''} disabled:cursor-default`}
                style={!isOwner && active ? ({ '--btn-bg': 'var(--color-sky)', '--btn-shade': 'var(--color-sky-dark)', '--btn-fg': '#fff6e8' } as React.CSSProperties) : undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {!isOwner && <p className="mt-2 text-xl text-ink-2">Só {owner?.name ?? 'o dono'} muda o tempo.</p>}
      </section>

      {isOwner ? (
        <button className="px-btn red w-[calc(100%-8px)] py-5 text-[14px]" disabled={!enough} onClick={() => act('party:start')}>
          <PixelIcon name="pad" size={3} />
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
