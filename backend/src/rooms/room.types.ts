/** Atalhos de tempo que aparecem na tela (o dono pode digitar outro). */
export const TURN_PRESETS = [10, 20, 30, 60] as const;
export const TURN_MIN = 1;
export const TURN_MAX = 240;
/** Sala sem ninguém conectado some depois disso. */
export const ROOM_TTL_MS = 30 * 60_000;

export type Phase = 'idle' | 'prep' | 'playing';

/**
 * Como a fila anda:
 * - rodizio: ordem sorteada no começo e mantida (primeiro a entrar, primeiro a jogar).
 * - menos-tempo: quem jogou menos tempo no total vai na frente.
 * - sorteio: a ordem é sorteada de novo a cada rodada.
 */
export const QUEUE_MODES = ['rodizio', 'menos-tempo', 'sorteio'] as const;
export type QueueMode = (typeof QUEUE_MODES)[number];

export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface PlayerStats {
  /** Tempo jogando de verdade (fase "playing"), em ms. */
  playedMs: number;
  turns: number;
}

export interface Room {
  code: string;
  ownerId: string;
  players: Player[];
  turnMinutes: number;
  queueMode: QueueMode;
  status: 'lobby' | 'playing';
  /** queue[0] joga agora; o resto é a previsão de quem vem depois. */
  queue: string[];
  /** Conta quantas vezes a vez passou (serve pro front notar troca de turno). */
  turn: number;
  phase: Phase;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  round: number;
  /** Quem já jogou na rodada atual. */
  playedThisRound: Set<string>;
  stats: Record<string, PlayerStats>;
  lastEvent: string | null;
  touchedAt: number;
}

export type PublicRoom = Omit<Room, 'touchedAt' | 'playedThisRound'> & { serverNow: number };
