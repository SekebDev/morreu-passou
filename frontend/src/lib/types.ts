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
  status: 'lobby' | 'playing';
  queue: string[];
  current: number;
  phase: Phase;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  round: number;
  lastEvent: string | null;
  serverNow: number;
}

export type Ack = { ok: true; code?: string } | { ok: false; error: string };

export const TURN_OPTIONS = [
  { minutes: 10, label: '10 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hora' },
];
