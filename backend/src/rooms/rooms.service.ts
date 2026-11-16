import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  Phase,
  Player,
  PublicRoom,
  Room,
  ROOM_TTL_MS,
  TURN_OPTIONS,
} from './room.types';

export class RoomError extends Error {}

/** Quanto vale "um minuto" (dá pra encurtar em teste via MINUTE_MS). */
const MINUTE_MS = Number(process.env.MINUTE_MS ?? 60_000);
/** Tempo que o próximo jogador tem pra pegar o controle. */
const PREP_MS = Number(process.env.PREP_MS ?? 30_000);

type Listener = (room: Room) => void;

@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly log = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, Room>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly sweeper: NodeJS.Timeout;
  private onChange: Listener = () => {};

  constructor() {
    this.sweeper = setInterval(() => this.sweep(), 60_000);
    this.sweeper.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweeper);
    this.timers.forEach((t) => clearTimeout(t));
  }

  /** O gateway registra aqui pra saber quando mandar estado novo pra sala. */
  subscribe(fn: Listener) {
    this.onChange = fn;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  create(playerId: string, name: string): Room {
    const code = this.newCode();
    const room: Room = {
      code,
      ownerId: playerId,
      players: [this.makePlayer(playerId, name)],
      turnMinutes: 30,
      status: 'lobby',
      queue: [],
      current: 0,
      phase: 'idle',
      phaseStartedAt: null,
      phaseEndsAt: null,
      round: 1,
      lastEvent: null,
      touchedAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.log.log(`sala ${code} criada`);
    return room;
  }

  join(code: string, playerId: string, name: string): Room {
    const room = this.mustGet(code);
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.name = name || existing.name;
      existing.connected = true;
    } else {
      if (room.players.length >= 16) throw new RoomError('Sala lotada (16 pessoas).');
      const taken = room.players.some(
        (p) => p.name.toLowerCase() === name.toLowerCase(),
      );
      if (taken) throw new RoomError('Já tem alguém com esse nome na sala.');
      room.players.push(this.makePlayer(playerId, name));
      // Chegou com a party rolando: entra no fim da fila.
      if (room.status === 'playing') room.queue.push(playerId);
    }
    this.touch(room);
    return room;
  }

  setConnected(code: string, playerId: string, connected: boolean) {
    const room = this.rooms.get(code);
    const p = room?.players.find((x) => x.id === playerId);
    if (!room || !p) return;
    p.connected = connected;
    this.touch(room);
  }

  leave(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (!room) return;
    this.removePlayer(room, playerId, `${this.nameOf(room, playerId)} saiu`);
  }

  kick(code: string, by: string, target: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    if (target === by) throw new RoomError('Você não pode se expulsar.');
    this.removePlayer(room, target, `${this.nameOf(room, target)} foi removido`);
  }

  setTurnMinutes(code: string, by: string, minutes: number) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    if (!TURN_OPTIONS.includes(minutes as (typeof TURN_OPTIONS)[number])) {
      throw new RoomError('Tempo inválido.');
    }
    room.turnMinutes = minutes;
    this.touch(room);
  }

  start(code: string, by: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    if (room.status === 'playing') throw new RoomError('A party já começou.');
    if (room.players.length < 2) throw new RoomError('Precisa de pelo menos 2 pessoas.');
    room.queue = shuffle(room.players.map((p) => p.id));
    room.status = 'playing';
    room.current = 0;
    room.round = 1;
    room.lastEvent = 'Fila sorteada!';
    this.enterPrep(room);
  }

  /** Jogador da vez aperta "começar" antes dos 30s acabarem. */
  startTurn(code: string, by: string) {
    const room = this.mustGet(code);
    if (room.status !== 'playing' || room.phase !== 'prep') return;
    if (room.queue[room.current] !== by) throw new RoomError('Não é a sua vez.');
    this.enterPlaying(room);
  }

  died(code: string, by: string) {
    const room = this.mustGet(code);
    if (room.status !== 'playing') return;
    const isCurrent = room.queue[room.current] === by;
    if (!isCurrent && room.ownerId !== by) throw new RoomError('Não é a sua vez.');
    const who = this.nameOf(room, room.queue[room.current]);
    this.advance(room, isCurrent ? `${who} morreu` : `${who} foi pulado`);
  }

  end(code: string, by: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    this.clearTimer(code);
    room.status = 'lobby';
    room.queue = [];
    room.current = 0;
    room.phase = 'idle';
    room.phaseStartedAt = null;
    room.phaseEndsAt = null;
    room.lastEvent = 'Party encerrada';
    this.touch(room);
  }

  toPublic(room: Room): PublicRoom {
    return {
      code: room.code,
      ownerId: room.ownerId,
      players: room.players.map(({ id, name, connected }) => ({ id, name, connected })),
      turnMinutes: room.turnMinutes,
      status: room.status,
      queue: room.queue,
      current: room.current,
      phase: room.phase,
      phaseStartedAt: room.phaseStartedAt,
      phaseEndsAt: room.phaseEndsAt,
      round: room.round,
      lastEvent: room.lastEvent,
      serverNow: Date.now(),
    };
  }

  // ---- internos ----

  private enterPrep(room: Room) {
    this.setPhase(room, 'prep', PREP_MS, () => this.enterPlaying(room));
  }

  private enterPlaying(room: Room) {
    this.setPhase(room, 'playing', room.turnMinutes * MINUTE_MS, () => {
      const who = this.nameOf(room, room.queue[room.current]);
      this.advance(room, `Acabou o tempo de ${who}`);
    });
  }

  private setPhase(room: Room, phase: Phase, ms: number, onEnd: () => void) {
    this.clearTimer(room.code);
    room.phase = phase;
    room.phaseStartedAt = Date.now();
    room.phaseEndsAt = room.phaseStartedAt + ms;
    const t = setTimeout(() => {
      this.timers.delete(room.code);
      if (this.rooms.get(room.code) === room) onEnd();
    }, ms);
    this.timers.set(room.code, t);
    this.touch(room);
  }

  private advance(room: Room, event: string) {
    room.lastEvent = event;
    if (room.queue.length === 0) return this.end(room.code, room.ownerId);
    const next = (room.current + 1) % room.queue.length;
    if (next === 0) room.round += 1;
    room.current = next;
    this.enterPrep(room);
  }

  private removePlayer(room: Room, playerId: string, event: string) {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    room.players.splice(idx, 1);

    if (room.players.length === 0) {
      this.destroy(room.code);
      return;
    }
    if (room.ownerId === playerId) room.ownerId = room.players[0].id;

    const qIdx = room.queue.indexOf(playerId);
    if (qIdx !== -1 && room.status === 'playing') {
      const wasCurrent = qIdx === room.current;
      room.queue.splice(qIdx, 1);
      if (room.queue.length < 2) {
        this.clearTimer(room.code);
        room.status = 'lobby';
        room.queue = [];
        room.current = 0;
        room.phase = 'idle';
        room.phaseStartedAt = null;
        room.phaseEndsAt = null;
        room.lastEvent = `${event}. Pouca gente pra continuar.`;
        this.touch(room);
        return;
      }
      if (qIdx < room.current) room.current -= 1;
      room.lastEvent = event;
      if (wasCurrent) {
        room.current = room.current % room.queue.length;
        this.enterPrep(room);
        return;
      }
    }
    room.lastEvent = event;
    this.touch(room);
  }

  private destroy(code: string) {
    this.clearTimer(code);
    this.rooms.delete(code);
    this.log.log(`sala ${code} fechada`);
  }

  private sweep() {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      const anyone = room.players.some((p) => p.connected);
      if (!anyone && now - room.touchedAt > ROOM_TTL_MS) this.destroy(room.code);
    }
  }

  private touch(room: Room) {
    room.touchedAt = Date.now();
    this.onChange(room);
  }

  private clearTimer(code: string) {
    const t = this.timers.get(code);
    if (t) clearTimeout(t);
    this.timers.delete(code);
  }

  private newCode(): string {
    if (this.rooms.size > 8000) throw new RoomError('Servidor cheio, tenta de novo já já.');
    let code: string;
    do code = String(randomInt(0, 10_000)).padStart(4, '0');
    while (this.rooms.has(code));
    return code;
  }

  private makePlayer(id: string, name: string): Player {
    return { id, name, connected: true };
  }

  private mustGet(code: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new RoomError('Sala não encontrada. Confere o código.');
    return room;
  }

  private assertOwner(room: Room, playerId: string) {
    if (room.ownerId !== playerId) throw new RoomError('Só quem criou a sala pode fazer isso.');
  }

  private nameOf(room: Room, id: string) {
    return room.players.find((p) => p.id === id)?.name ?? 'Alguém';
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
