export const TURN_OPTIONS = [10, 20, 30, 60] as const;
/** Sala sem ninguém conectado some depois disso. */
export const ROOM_TTL_MS = 30 * 60_000;

export type Phase = 'idle' | 'prep' | 'playing';

export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface Room {
  code: string;
  ownerId: string;
  players: Player[];
  turnMinutes: number;
  status: 'lobby' | 'playing';
  /** Ordem sorteada (ids dos jogadores). */
  queue: string[];
  /** Índice na fila de quem joga agora. */
  current: number;
  phase: Phase;
  phaseEndsAt: number | null;
  round: number;
  lastEvent: string | null;
  touchedAt: number;
}

export type PublicRoom = Omit<Room, 'touchedAt'> & { serverNow: number };
