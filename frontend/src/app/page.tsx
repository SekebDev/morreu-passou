'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { PixelIcon } from '@/components/PixelIcon';
import { getName, getPlayerId, saveName } from '@/lib/identity';
import { emit } from '@/lib/socket';
import { unlockAudio } from '@/lib/sound';

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(getName()), []);

  const trimmed = name.trim();

  function needName() {
    if (trimmed) return false;
    setError('Primeiro diz como a galera te chama.');
    document.getElementById('name')?.focus();
    return true;
  }

  async function create() {
    unlockAudio();
    if (needName()) return;
    setBusy('create');
    setError(null);
    saveName(trimmed);
    const res = await emit('room:create', { playerId: getPlayerId(), name: trimmed });
    if (res.ok && res.code) router.push(`/sala/${res.code}`);
    else {
      setError(res.ok ? 'Algo deu errado.' : res.error);
      setBusy(null);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    unlockAudio();
    if (needName()) return;
    if (code.length !== 4) {
      setError('O código tem 4 números.');
      return;
    }
    setBusy('join');
    setError(null);
    saveName(trimmed);
    const res = await emit('room:join', { code, playerId: getPlayerId(), name: trimmed });
    if (res.ok) router.push(`/sala/${code}`);
    else {
      setError(res.error);
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <header className="pt-4">
        <Logo />
        <p className="mt-5 text-center text-2xl text-ink-2">
          Um controle, vários amigos.
          <br />
          Morreu? Passa a vez.
        </p>
      </header>

      <section className="px-box flex flex-col gap-3 p-4">
        <label htmlFor="name" className="font-pixel text-[11px] uppercase">
          Seu nome
        </label>
        <input
          id="name"
          className="px-input"
          value={name}
          maxLength={16}
          autoComplete="nickname"
          placeholder="ex: Vitão"
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <button className="px-btn green w-[calc(100%-8px)] py-5 text-[14px]" onClick={create} disabled={busy !== null}>
          <PixelIcon name="crown" size={3} />
          {busy === 'create' ? 'Criando…' : 'Criar sala'}
        </button>
      </section>

      <div className="flex items-center gap-3 text-xl text-ink-2" aria-hidden>
        <span className="h-1 flex-1 bg-ink/20" />
        ou entra numa
        <span className="h-1 flex-1 bg-ink/20" />
      </div>

      <form onSubmit={join} className="px-box flex flex-col gap-3 p-4">
        <label htmlFor="code" className="font-pixel text-[11px] uppercase">
          Código da sala
        </label>
        <div className="flex items-stretch gap-3">
          <input
            id="code"
            className="px-input font-pixel !text-[22px] tracking-[0.5em]"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="0000"
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <button type="submit" className="px-btn blue shrink-0" disabled={busy !== null}>
            {busy === 'join' ? '…' : 'Entrar'}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="px-box flex items-center gap-3 p-3 text-2xl [--box-bg:#f8d7cf]">
          <PixelIcon name="heart" size={3} />
          {error}
        </p>
      )}

      <footer className="mt-auto pt-6 text-center text-lg text-ink-2/70">sem cadastro, sem login. só jogar.</footer>
    </div>
  );
}
