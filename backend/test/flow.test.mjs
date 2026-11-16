// Teste de ponta a ponta: sobe o servidor com tempos curtos e simula 3 jogadores.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { io } from 'socket.io-client';
import { randomUUID } from 'node:crypto';

const PORT = 3999;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const sockets = [];
test('fluxo completo da party', async () => {
  const srv = spawn('node', ['dist/main.js'], {
    env: { ...process.env, PORT: String(PORT), MINUTE_MS: '400', PREP_MS: '300' },
    stdio: 'ignore',
  });
  try {
    await wait(1500);
    const mk = () => {
      const s = io(`http://localhost:${PORT}`, { transports: ['websocket'], reconnection: false });
      s.state = null;
      s.on('room:state', (st) => (s.state = st));
      s.id_ = randomUUID();
      sockets.push(s);
      return s;
    };
    const emit = (s, ev, body) => new Promise((r) => s.emit(ev, body ?? {}, r));
    const [a, b, c] = [mk(), mk(), mk()];

    const created = await emit(a, 'room:create', { playerId: a.id_, name: 'Ana' });
    assert.equal(created.ok, true);
    assert.match(created.code, /^\d{4}$/);
    const code = created.code;

    assert.equal((await emit(b, 'room:join', { code: '0000x', playerId: b.id_, name: 'Bia' })).ok, false);
    assert.equal((await emit(b, 'room:join', { code, playerId: b.id_, name: 'Bia' })).ok, true);
    assert.equal((await emit(c, 'room:join', { code, playerId: c.id_, name: 'ana' })).ok, false, 'nome repetido');
    assert.equal((await emit(c, 'room:join', { code, playerId: c.id_, name: 'Caio' })).ok, true);

    assert.equal((await emit(b, 'room:config', { minutes: 10 })).ok, false, 'só dono configura');
    assert.equal((await emit(a, 'room:config', { minutes: 10 })).ok, true);
    assert.equal((await emit(a, 'party:start')).ok, true);
    await wait(50);
    const st = a.state;
    assert.equal(st.status, 'playing');
    assert.equal(st.phase, 'prep');
    assert.equal(new Set(st.queue).size, 3);

    const byId = { [a.id_]: a, [b.id_]: b, [c.id_]: c };
    const first = byId[st.queue[0]];
    const second = byId[st.queue[1]];
    assert.equal((await emit(second, 'turn:start')).ok, false, 'não é a vez');
    assert.equal((await emit(first, 'turn:start')).ok, true);
    await wait(50);
    assert.equal(a.state.phase, 'playing');

    assert.equal((await emit(first, 'turn:died')).ok, true);
    await wait(50);
    assert.equal(a.state.current, 1);
    assert.equal(a.state.phase, 'prep');

    // 30s (aqui 300ms) passam sem ninguém apertar: começa sozinho
    await wait(400);
    assert.equal(a.state.phase, 'playing');
    // tempo do turno (10 "min" = 4s) acaba sozinho
    await wait(4200);
    assert.equal(a.state.current, 2);
    assert.match(a.state.lastEvent, /Acabou o tempo/);

    // reconexão com mesmo playerId mantém o lugar
    second.disconnect();
    await wait(100);
    assert.equal(a.state.players.find((p) => p.id === second.id_).connected, false);
    const again = mk(); again.id_ = second.id_;
    assert.equal((await emit(again, 'room:join', { code, playerId: second.id_, name: 'X' })).ok, true);
    await wait(50);
    assert.equal(a.state.players.length, 3);

    [a, b, c, again].forEach((s) => s.disconnect());
  } finally {
    sockets.forEach((s) => s.disconnect());
    srv.kill();
  }
});
