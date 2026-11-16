'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getName, getPlayerId } from '@/lib/identity';
import { emit, getSocket } from '@/lib/socket';
import type { RoomState } from '@/lib/types';

export type RoomStatus = 'need-name' | 'connecting' | 'in-room' | 'error' | 'kicked' | 'left';

export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  /** diferença entre o relógio do servidor e o nosso */
  const offset = useRef(0);
  const joined = useRef(false);
  const me = typeof window === 'undefined' ? '' : getPlayerId();

  const join = useCallback(
    async (name: string) => {
      setStatus('connecting');
      const res = await emit('room:join', { code, playerId: getPlayerId(), name });
      if (res.ok) {
        joined.current = true;
        setStatus('in-room');
      } else {
        setError(res.error);
        setStatus('error');
      }
    },
    [code],
  );

  useEffect(() => {
    const s = getSocket();
    const onState = (st: RoomState) => {
      if (st.code !== code) return;
      offset.current = st.serverNow - Date.now();
      if (joined.current && !st.players.some((p) => p.id === getPlayerId())) {
        joined.current = false;
        setStatus('kicked');
        void emit('room:leave');
        return;
      }
      setRoom(st);
    };
    const onConnect = () => {
      setOnline(true);
      if (joined.current) void join(getName());
    };
    const onDisconnect = () => setOnline(false);

    s.on('room:state', onState);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    setOnline(s.connected);

    const name = getName();
    if (name) void join(name);
    else setStatus('need-name');

    return () => {
      s.off('room:state', onState);
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
    };
  }, [code, join]);

  const leave = useCallback(async () => {
    joined.current = false;
    await emit('room:leave');
    setStatus('left');
  }, []);

  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return { room, status, error, online, me, join, leave, serverNow };
}
