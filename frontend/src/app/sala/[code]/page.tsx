'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Lobby } from '@/components/Lobby';
import { Logo } from '@/components/Logo';
import { ThemePicker } from '@/components/ThemePicker';
import { Party } from '@/components/Party';
import { Icon } from '@/components/Icon';
import { Toast } from '@/components/Toast';
import { useRoom } from '@/hooks/useRoom';
import { getName, saveName } from '@/lib/identity';
import { buzz, sfx, unlockAudio } from '@/lib/sound';
import type { RoomState } from '@/lib/types';

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { room, status, error, online, me, join, leave, serverNow } = useRoom(code);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashStamp, setFlashStamp] = useState(0);

  const notify = useCallback((m: string) => {
    setFlash(m);
    setFlashStamp(Date.now());
  }, []);

  useRoomEffects(room, me, notify);

  useEffect(() => {
    if (status === 'left') router.push('/');
  }, [status, router]);

  if (status === 'need-name') return <NameGate code={code} onJoin={(n) => join(n)} />;

  if (status === 'error' || status === 'kicked') {
    return (
      <Screen>
        <Icon name="skull" size={8} />
        <p className="font-display text-[calc(16px*var(--dz))] leading-relaxed">{status === 'kicked' ? 'Você saiu da sala' : 'Ih, deu ruim'}</p>
        <p className="text-3xl">{status === 'kicked' ? 'O dono te tirou da sala.' : error}</p>
        <Link href="/" className="px-btn mt-4">
          Voltar pro início
        </Link>
      </Screen>
    );
  }

  if (!room || status === 'connecting') {
    return (
      <Screen>
        <Icon name="pad" size={6} className="bob" />
        <p className="font-display text-[calc(12px*var(--dz))]">
          Entrando na sala {code}
          <span className="blink">…</span>
        </p>
      </Screen>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Toast message={flash} stamp={flashStamp} />
      <header className="flex items-center justify-between">
        <Logo small />
        <div className="flex items-center gap-4">
          <ThemePicker compact />
          <button className="link-btn font-display flex items-center gap-2 text-[calc(10px*var(--dz))] uppercase" onClick={leave}>
            <Icon name="door" size={2} />
            Sair
          </button>
        </div>
      </header>

      {!online && (
        <p className="box p-2 text-center text-xl box-alert">Sem conexão. Tentando voltar…</p>
      )}

      {room.status === 'lobby' ? (
        <Lobby room={room} me={me} onError={notify} />
      ) : (
        <Party room={room} me={me} serverNow={serverNow} onError={notify} />
      )}
    </div>
  );
}

/** Sons, vibração, título da aba e avisos quando o estado muda. */
function useRoomEffects(room: RoomState | null, me: string, notify: (m: string) => void) {
  const prev = useRef<RoomState | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = room;
    if (!room) return;

    const current = room.queue[room.current];
    const myTurn = room.status === 'playing' && current === me;
    document.title = myTurn ? '▶ SUA VEZ · Morreu, Passou' : `Sala ${room.code} · Morreu, Passou`;

    if (!before) return;
    const turnChanged =
      before.status !== room.status || before.current !== room.current || before.round !== room.round || before.phase !== room.phase;
    if (room.lastEvent && turnChanged && room.lastEvent !== before.lastEvent) notify(room.lastEvent);
    else if (room.lastEvent && before.status === 'playing' && room.status === 'lobby') notify(room.lastEvent);

    if (room.status === 'playing' && turnChanged && room.phase === 'prep') {
      if (/morreu/i.test(room.lastEvent ?? '')) sfx.died();
      if (myTurn) {
        setTimeout(() => sfx.yourTurn(), 450);
        buzz([120, 80, 120, 80, 300]);
      }
    }
    if (before.phase === 'playing' && before.queue[before.current] === me && /tempo/i.test(room.lastEvent ?? '') && turnChanged) {
      sfx.timeUp();
      buzz(500);
    }
  }, [room, me, notify]);
}

function NameGate({ code, onJoin }: { code: string; onJoin: (name: string) => void }) {
  const [name, setName] = useState(getName());
  function submit(e: FormEvent) {
    e.preventDefault();
    unlockAudio();
    const n = name.trim();
    if (!n) return;
    saveName(n);
    onJoin(n);
  }
  return (
    <div className="flex flex-1 flex-col gap-8 pt-4">
      <Logo />
      <form onSubmit={submit} className="box flex flex-col gap-4 p-4">
        <p className="text-3xl">
          Te chamaram pra sala <strong className="font-display text-[calc(18px*var(--dz))] text-danger">{code}</strong>.
        </p>
        <label htmlFor="gate-name" className="eyebrow font-display text-[calc(11px*var(--dz))] uppercase">
          Seu nome
        </label>
        <input id="gate-name" className="px-input" value={name} maxLength={16} autoFocus placeholder="ex: Vitão" onChange={(e) => setName(e.target.value)} />
        <button className="px-btn green" disabled={!name.trim()}>
          Entrar na sala
        </button>
      </form>
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">{children}</div>;
}
