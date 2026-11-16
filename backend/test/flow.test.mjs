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
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://localhost:${PORT}/health`)).ok) break; } catch {}
      await wait(200);
    }
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
    assert.equal((await emit(a, 'room:config', { minutes: 0 })).ok, false, 'tempo mínimo');
    assert.equal((await emit(a, 'room:config', { minutes: 241 })).ok, false, 'tempo máximo');
    assert.equal((await emit(a, 'room:config', { minutes: 7.5 })).ok, false, 'só minutos inteiros');
    assert.equal((await emit(a, 'room:config', { minutes: 45 })).ok, true, 'tempo livre');
    assert.equal((await emit(a, 'room:config', { minutes: 10 })).ok, true);
    assert.equal((await emit(a, 'room:queue-mode', { mode: 'xyz' })).ok, false);
    assert.equal((await emit(b, 'room:queue-mode', { mode: 'sorteio' })).ok, false, 'só dono muda a fila');
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
    assert.equal(a.state.queue[0], st.queue[1]);
    assert.equal(a.state.queue.at(-1), st.queue[0], 'rodízio: quem morreu vai pro fim');
    assert.equal(a.state.turn, 1);
    assert.equal(a.state.phase, 'prep');

    // 30s (aqui 300ms) passam sem ninguém apertar: começa sozinho
    await wait(400);
    assert.equal(a.state.phase, 'playing');
    // tempo do turno (10 "min" = 4s) acaba sozinho
    await wait(4200);
    assert.equal(a.state.queue[0], st.queue[2]);
    assert.equal(a.state.round, 1);
    assert.match(a.state.lastEvent, /Acabou o tempo/);

    // reconexão com mesmo playerId mantém o lugar
    const watcher = [a, b, c].find((s) => s !== second);
    second.disconnect();
    await wait(300);
    assert.equal(watcher.state.players.find((p) => p.id === second.id_).connected, false);
    const again = mk(); again.id_ = second.id_;
    assert.equal((await emit(again, 'room:join', { code, playerId: second.id_, name: 'X' })).ok, true);
    await wait(50);
    assert.equal(watcher.state.players.length, 3);

    [a, b, c, again].forEach((s) => s.disconnect());
  } finally {
    sockets.forEach((s) => s.disconnect());
    srv.kill();
  }
});

async function server(port) {
  const srv = spawn('node', ['dist/main.js'], {
    env: { ...process.env, PORT: String(port), MINUTE_MS: '1000', PREP_MS: '5000' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(`http://localhost:${port}/health`)).ok) break; } catch {}
    await wait(200);
  }
  const mk = () => {
    const s = io(`http://localhost:${port}`, { transports: ['websocket'], reconnection: false });
    s.state = null;
    s.on('room:state', (st) => (s.state = st));
    s.id_ = randomUUID();
    sockets.push(s);
    return s;
  };
  return { srv, mk };
}
const emit2 = (s, ev, body) => new Promise((r) => s.emit(ev, body ?? {}, r));

/** Cria sala com N jogadores e começa no modo dado. */
async function party(mk, n, mode) {
  const ps = Array.from({ length: n }, () => mk());
  const { code } = await emit2(ps[0], 'room:create', { playerId: ps[0].id_, name: 'P0' });
  for (let i = 1; i < n; i++) await emit2(ps[i], 'room:join', { code, playerId: ps[i].id_, name: `P${i}` });
  assert.equal((await emit2(ps[0], 'room:queue-mode', { mode })).ok, true);
  await emit2(ps[0], 'party:start');
  await wait(50);
  const byId = Object.fromEntries(ps.map((s) => [s.id_, s]));
  const cur = () => byId[ps[0].state.queue[0]];
  /** quem está na vez joga `ms` e morre */
  const play = async (ms) => {
    const p = cur();
    await emit2(p, 'turn:start');
    await wait(ms);
    await emit2(p, 'turn:died');
    await wait(40);
    return p.id_;
  };
  return { ps, cur, play, state: () => ps[0].state, code };
}

test('fila: quem jogou menos vai na frente', async () => {
  const { srv, mk } = await server(3998);
  try {
    const { play, state } = await party(mk, 3, 'menos-tempo');
    const x = await play(600); // jogou bastante
    const y = await play(100);
    const z = await play(300);
    // y jogou menos, depois z, depois x
    assert.deepEqual(state().queue, [y, z, x]);
    assert.ok(state().stats[x].playedMs > state().stats[y].playedMs);
    // y joga muito pouco de novo, mas não pode jogar duas seguidas
    await play(50);
    assert.notEqual(state().queue[0], y);
    assert.equal(state().queue[0], z);
  } finally {
    sockets.forEach((s) => s.disconnect());
    srv.kill();
  }
});

test('fila: sorteio a cada rodada, todo mundo joga uma vez por rodada', async () => {
  const { srv, mk } = await server(3997);
  try {
    const { play, state } = await party(mk, 4, 'sorteio');
    for (let r = 1; r <= 3; r++) {
      assert.equal(state().round, r);
      const seen = new Set();
      let last;
      for (let i = 0; i < 4; i++) {
        last = await play(20);
        seen.add(last);
      }
      assert.equal(seen.size, 4, 'cada um jogou uma vez na rodada');
      assert.notEqual(state().queue[0], last, 'quem fechou a rodada não abre a próxima');
    }
  } finally {
    sockets.forEach((s) => s.disconnect());
    srv.kill();
  }
});

test('fila: quem chega no meio entra antes de quem já jogou', async () => {
  const { srv, mk } = await server(3996);
  try {
    const { play, state, code } = await party(mk, 3, 'rodizio');
    const first = await play(20);
    const late = mk();
    await emit2(late, 'room:join', { code, playerId: late.id_, name: 'Late' });
    await wait(40);
    const q = state().queue;
    assert.equal(q.at(-1), first);
    assert.equal(q.at(-2), late.id_);
  } finally {
    sockets.forEach((s) => s.disconnect());
    srv.kill();
  }
});
