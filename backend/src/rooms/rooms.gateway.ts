import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomError, RoomsService } from './rooms.service';

interface SocketData {
  code?: string;
  playerId?: string;
}

type Ack = { ok: true; code?: string } | { ok: false; error: string };

const origins = (process.env.CORS_ORIGIN ?? '*').split(',');

@WebSocketGateway({ cors: { origin: origins.length === 1 ? origins[0] : origins } })
export class RoomsGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly log = new Logger(RoomsGateway.name);
  @WebSocketServer() server: Server;

  constructor(private readonly rooms: RoomsService) {}

  afterInit() {
    this.rooms.subscribe((room) => {
      this.server.to(room.code).emit('room:state', this.rooms.toPublic(room));
    });
  }

  handleDisconnect(socket: Socket) {
    const { code, playerId } = socket.data as SocketData;
    if (!code || !playerId) return;
    // Só marca offline se não houver outra aba do mesmo jogador na sala.
    const others = [...(this.server.sockets.adapter.rooms.get(code) ?? [])]
      .map((id) => this.server.sockets.sockets.get(id))
      .some((s) => s && s.id !== socket.id && (s.data as SocketData).playerId === playerId);
    if (!others) this.rooms.setConnected(code, playerId, false);
  }

  @SubscribeMessage('room:create')
  create(@ConnectedSocket() s: Socket, @MessageBody() b: { playerId: string; name: string }): Ack {
    return this.run(() => {
      const room = this.rooms.create(cleanId(b?.playerId), cleanName(b?.name));
      this.bind(s, room.code, room.ownerId);
      s.emit('room:state', this.rooms.toPublic(room));
      return room.code;
    });
  }

  @SubscribeMessage('room:join')
  join(@ConnectedSocket() s: Socket, @MessageBody() b: { code: string; playerId: string; name: string }): Ack {
    return this.run(() => {
      const code = String(b?.code ?? '').trim();
      const playerId = cleanId(b?.playerId);
      this.bind(s, code, playerId);
      this.rooms.join(code, playerId, cleanName(b?.name));
      return code;
    });
  }

  @SubscribeMessage('room:leave')
  leave(@ConnectedSocket() s: Socket): Ack {
    return this.run(() => {
      const { code, playerId } = s.data as SocketData;
      if (code && playerId) this.rooms.leave(code, playerId);
      if (code) s.leave(code);
      s.data = {};
    });
  }

  @SubscribeMessage('room:config')
  config(@ConnectedSocket() s: Socket, @MessageBody() b: { minutes: number }): Ack {
    return this.act(s, (code, me) => this.rooms.setTurnMinutes(code, me, Number(b?.minutes)));
  }

  @SubscribeMessage('room:queue-mode')
  queueMode(@ConnectedSocket() s: Socket, @MessageBody() b: { mode: string }): Ack {
    return this.act(s, (code, me) => this.rooms.setQueueMode(code, me, String(b?.mode)));
  }

  @SubscribeMessage('room:kick')
  kick(@ConnectedSocket() s: Socket, @MessageBody() b: { playerId: string }): Ack {
    return this.act(s, (code, me) => this.rooms.kick(code, me, String(b?.playerId)));
  }

  @SubscribeMessage('party:start')
  start(@ConnectedSocket() s: Socket): Ack {
    return this.act(s, (code, me) => this.rooms.start(code, me));
  }

  @SubscribeMessage('party:end')
  end(@ConnectedSocket() s: Socket): Ack {
    return this.act(s, (code, me) => this.rooms.end(code, me));
  }

  @SubscribeMessage('turn:start')
  startTurn(@ConnectedSocket() s: Socket): Ack {
    return this.act(s, (code, me) => this.rooms.startTurn(code, me));
  }

  @SubscribeMessage('turn:died')
  died(@ConnectedSocket() s: Socket): Ack {
    return this.act(s, (code, me) => this.rooms.died(code, me));
  }

  private bind(s: Socket, code: string, playerId: string) {
    const prev = (s.data as SocketData).code;
    if (prev && prev !== code) s.leave(prev);
    s.data = { code, playerId } satisfies SocketData;
    s.join(code);
  }

  private act(s: Socket, fn: (code: string, me: string) => void): Ack {
    const { code, playerId } = s.data as SocketData;
    if (!code || !playerId) return { ok: false, error: 'Você não está em nenhuma sala.' };
    return this.run(() => fn(code, playerId));
  }

  private run(fn: () => string | void): Ack {
    try {
      const code = fn();
      return code ? { ok: true, code } : { ok: true };
    } catch (e) {
      if (e instanceof RoomError) return { ok: false, error: e.message };
      this.log.error(e);
      return { ok: false, error: 'Deu ruim no servidor. Tenta de novo.' };
    }
  }
}

function cleanName(raw: unknown): string {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!name) throw new RoomError('Escolhe um nome primeiro.');
  return name;
}

function cleanId(raw: unknown): string {
  const id = String(raw ?? '');
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) throw new RoomError('Identificação inválida. Recarrega a página.');
  return id;
}
