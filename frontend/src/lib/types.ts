export type Phase = 'idle' | 'prep' | 'playing';

export interface Player {
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomState {
  code: string;
  ownerId: string;
  players: Player[];
  turnMinutes: number;
  queueMode: QueueMode;
  status: 'lobby' | 'playing';
  /** queue[0] joga agora; o resto é a previsão de quem vem depois. */
  queue: string[];
  /** Conta quantas vezes a vez já passou. */
  turn: number;
  phase: Phase;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  round: number;
  stats: Record<string, { playedMs: number; turns: number }>;
  lastEvent: string | null;
  serverNow: number;
}

export type Ack = { ok: true; code?: string } | { ok: false; error: string };

export type QueueMode = 'rodizio' | 'menos-tempo' | 'sorteio';

export const QUEUE_MODES: { mode: QueueMode; label: string; hint: string }[] = [
  { mode: 'rodizio', label: 'Rodízio', hint: 'Ordem sorteada no começo. Morreu, vai pro fim da fila.' },
  { mode: 'menos-tempo', label: 'Quem jogou menos', hint: 'Quem tem menos tempo de jogo no total vai na frente.' },
  { mode: 'sorteio', label: 'Sorteio por rodada', hint: 'Todo mundo joga uma vez por rodada, numa ordem nova a cada rodada.' },
];

export const TURN_MIN = 1;
export const TURN_MAX = 240;

export const TURN_OPTIONS = [
  { minutes: 10, label: '10 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hora' },
];
