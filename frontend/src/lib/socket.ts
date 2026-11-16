import { io, Socket } from 'socket.io-client';
import type { Ack } from './types';

let socket: Socket | null = null;

function serverUrl() {
  if (process.env.NEXT_PUBLIC_SERVER_URL) return process.env.NEXT_PUBLIC_SERVER_URL;
  // Em dev pelo celular na mesma rede, usa o IP de quem serviu a página.
  return `${window.location.protocol}//${window.location.hostname}:3001`;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(serverUrl(), { transports: ['websocket', 'polling'], autoConnect: true });
  }
  return socket;
}

export function emit(event: string, body: object = {}): Promise<Ack> {
  const s = getSocket();
  return new Promise((resolve) => {
    s.timeout(8000).emit(event, body, (err: Error | null, res: Ack) => {
      if (err) resolve({ ok: false, error: 'Sem resposta do servidor. Confere a conexão.' });
      else resolve(res);
    });
  });
}
