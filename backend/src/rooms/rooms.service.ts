import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  Phase,
  Player,
  PublicRoom,
  QUEUE_MODES,
  QueueMode,
  Room,
  ROOM_TTL_MS,
  TURN_MAX,
  TURN_MIN,
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
      queueMode: 'rodizio',
      status: 'lobby',
      queue: [],
      turn: 0,
      phase: 'idle',
      phaseStartedAt: null,
      phaseEndsAt: null,
      round: 1,
      playedThisRound: new Set(),
      stats: {},
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
      if (room.status === 'playing') this.addToQueue(room, playerId);
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
    if (!Number.isInteger(minutes) || minutes < TURN_MIN || minutes > TURN_MAX) {
      throw new RoomError(`O tempo tem que ser de ${TURN_MIN} a ${TURN_MAX} minutos.`);
    }
    room.turnMinutes = minutes;
    this.touch(room);
  }

  setQueueMode(code: string, by: string, mode: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    if (!QUEUE_MODES.includes(mode as QueueMode)) throw new RoomError('Estilo de fila inválido.');
    room.queueMode = mode as QueueMode;
    // Com a party rolando, quem joga agora continua; só a previsão do resto muda.
    if (room.status === 'playing' && this.isLeastMode(room)) {
      room.queue = [room.queue[0], ...this.byLeast(room, room.queue.slice(1))];
    }
    this.touch(room);
  }

  start(code: string, by: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    if (room.status === 'playing') throw new RoomError('A party já começou.');
    if (room.players.length < 2) throw new RoomError('Precisa de pelo menos 2 pessoas.');
    room.queue = shuffle(room.players.map((p) => p.id));
    room.status = 'playing';
    room.turn = 0;
    room.round = 1;
    room.playedThisRound = new Set();
    room.stats = Object.fromEntries(room.players.map((p) => [p.id, this.newStats(p.name)]));
    room.lastEvent = 'Fila sorteada!';
    this.enterPrep(room);
  }

  /** Jogador da vez aperta "começar" antes dos 30s acabarem. */
  startTurn(code: string, by: string) {
    const room = this.mustGet(code);
    if (room.status !== 'playing' || room.phase !== 'prep') return;
    if (room.queue[0] !== by) throw new RoomError('Não é a sua vez.');
    this.enterPlaying(room);
  }

  died(code: string, by: string) {
    const room = this.mustGet(code);
    if (room.status !== 'playing') return;
    const isCurrent = room.queue[0] === by;
    if (!isCurrent && room.ownerId !== by) throw new RoomError('Não é a sua vez.');
    const who = this.nameOf(room, room.queue[0]);
    if (isCurrent) this.countDeath(room, by);
    this.advance(room, isCurrent ? `${who} morreu` : `${who} foi pulado`);
  }

  end(code: string, by: string) {
    const room = this.mustGet(code);
    this.assertOwner(room, by);
    this.toLobby(room, 'Party encerrada');
  }

  toPublic(room: Room): PublicRoom {
    return {
      code: room.code,
      ownerId: room.ownerId,
      players: room.players.map(({ id, name, connected }) => ({ id, name, connected })),
      turnMinutes: room.turnMinutes,
      queueMode: room.queueMode,
      status: room.status,
      queue: room.queue,
      turn: room.turn,
      phase: room.phase,
      phaseStartedAt: room.phaseStartedAt,
      phaseEndsAt: room.phaseEndsAt,
      round: room.round,
      stats: room.stats,
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
      const who = this.nameOf(room, room.queue[0]);
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
    if (room.queue.length === 0) return this.toLobby(room, event);
    const [done, ...rest] = room.queue;
    this.closeTurn(room, done);
    const newRound = this.checkRound(room);
    room.queue = this.nextOrder(room, done, rest, newRound);
    room.turn += 1;
    this.enterPrep(room);
  }

  private newStats(name: string, catchUpMs = 0, catchUpTurns = 0) {
    return { name, playedMs: 0, turns: 0, deaths: 0, fastestDeathMs: null, catchUpMs, catchUpTurns };
  }

  private statsOf(room: Room, id: string) {
    return (room.stats[id] ??= this.newStats(this.nameOf(room, id)));
  }

  /** Morte só conta se a pessoa estava jogando (no preparo ela só passou a vez). */
  private countDeath(room: Room, id: string) {
    if (room.phase !== 'playing' || !room.phaseStartedAt) return;
    const st = this.statsOf(room, id);
    const ms = Date.now() - room.phaseStartedAt;
    st.deaths += 1;
    st.fastestDeathMs = st.fastestDeathMs === null ? ms : Math.min(st.fastestDeathMs, ms);
  }

  /** Soma o tempo jogado e marca que a pessoa já teve a vez nesta rodada. */
  private closeTurn(room: Room, id: string) {
    const st = this.statsOf(room, id);
    if (room.phase === 'playing' && room.phaseStartedAt) st.playedMs += Date.now() - room.phaseStartedAt;
    st.turns += 1;
    room.playedThisRound.add(id);
  }

  /** Todo mundo da fila já jogou? Então vira a rodada. */
  private checkRound(room: Room): boolean {
    if (room.queue.length === 0 || !room.queue.every((id) => room.playedThisRound.has(id))) return false;
    room.round += 1;
    room.playedThisRound = new Set();
    return true;
  }

  /** Monta a fila depois que `done` passou a vez. Quem acabou de jogar nunca joga duas seguidas. */
  private nextOrder(room: Room, done: string, rest: string[], newRound: boolean): string[] {
    if (rest.length === 0) return [done];
    switch (room.queueMode) {
      case 'menos-tempo':
      case 'menos-vezes': {
        const [next, ...others] = this.byLeast(room, rest);
        return [next, ...this.byLeast(room, [...others, done])];
      }
      case 'sorteio': {
        if (!newRound) return [...rest, done];
        const order = shuffle([...rest, done]);
        if (order[0] === done) [order[0], order[1]] = [order[1], order[0]];
        return order;
      }
      default:
        return [...rest, done];
    }
  }

  /**
   * Ordena pelo critério do modo: no "menos tempo", menos tempo jogado (empate: menos vezes);
   * no "menos vezes", menos vezes (empate: menos tempo). Empate total mantém a ordem.
   */
  private byLeast(room: Room, ids: string[]): string[] {
    const st = (id: string) => room.stats[id] ?? this.newStats('');
    const ms = (id: string) => st(id).playedMs + st(id).catchUpMs;
    const n = (id: string) => st(id).turns + st(id).catchUpTurns;
    const time = (a: string, b: string) => ms(a) - ms(b);
    const turns = (a: string, b: string) => n(a) - n(b);
    const [first, second] = room.queueMode === 'menos-vezes' ? [turns, time] : [time, turns];
    return ids
      .map((id, i) => ({ id, i }))
      .sort((a, b) => first(a.id, b.id) || second(a.id, b.id) || a.i - b.i)
      .map((x) => x.id);
  }

  private isLeastMode(room: Room) {
    return room.queueMode === 'menos-tempo' || room.queueMode === 'menos-vezes';
  }

  /** Quem chega com a party rolando entra antes de quem já jogou nesta rodada. */
  private addToQueue(room: Room, id: string) {
    if (room.queue.includes(id)) return;
    // Nos modos "menos", começa empatado com quem jogou menos, pra não furar a fila por horas.
    // (Isso só afeta a ordem: o ranking usa só o que a pessoa jogou de verdade.)
    const min = (f: (q: string) => number) => {
      const v = Math.min(...room.queue.map(f));
      return Number.isFinite(v) ? v : 0;
    };
    if (!room.stats[id]) {
      room.stats[id] = this.newStats(
        this.nameOf(room, id),
        min((q) => (room.stats[q] ? room.stats[q].playedMs + room.stats[q].catchUpMs : 0)),
        min((q) => (room.stats[q] ? room.stats[q].turns + room.stats[q].catchUpTurns : 0)),
      );
    }
    if (this.isLeastMode(room)) {
      room.queue = [room.queue[0], ...this.byLeast(room, [...room.queue.slice(1), id])];
      return;
    }
    const firstPlayed = room.queue.findIndex((q, i) => i > 0 && room.playedThisRound.has(q));
    if (firstPlayed === -1) room.queue.push(id);
    else room.queue.splice(firstPlayed, 0, id);
  }

  private toLobby(room: Room, event: string) {
    this.clearTimer(room.code);
    room.status = 'lobby';
    room.queue = [];
    room.phase = 'idle';
    room.phaseStartedAt = null;
    room.phaseEndsAt = null;
    room.playedThisRound = new Set();
    room.lastEvent = event;
    this.touch(room);
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
      room.queue.splice(qIdx, 1);
      room.playedThisRound.delete(playerId);
      if (room.queue.length < 2) {
        this.toLobby(room, `${event}. Pouca gente pra continuar.`);
        return;
      }
      room.lastEvent = event;
      if (qIdx === 0) {
        this.checkRound(room);
        room.turn += 1;
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
