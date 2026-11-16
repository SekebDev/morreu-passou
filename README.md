# Morreu, Passou

Fila de quem joga agora, pra galera que divide um controle (ou um PC) na mesma partida.
Quem cria a sala recebe um código de 4 números, os amigos entram com o código e um nome, sem cadastro.
Quando a party começa, a fila é sorteada. Quem está na vez vê o timer e o botão **Morri**; o resto vê
quem está jogando e quanto falta. Morreu ou acabou o tempo, o próximo tem 30 segundos pra pegar o
controle (ou aperta **Começar agora**) e o timer dele começa.

O dono escolhe o tempo de cada vez (atalhos de 10, 20, 30 min e 1 hora, ou **Outro** pra digitar de
1 a 240 minutos) e o estilo da fila:

| Estilo | Como anda |
|---|---|
| Rodízio | ordem sorteada no começo; morreu, vai pro fim da fila |
| Quem jogou menos | quem tem menos tempo de jogo somado vai na frente (ninguém joga duas seguidas) |
| Sorteio por rodada | todo mundo joga uma vez por rodada, numa ordem nova a cada rodada |

Quem entra com a party rolando joga antes de quem já jogou na rodada. No "quem jogou menos", começa
empatado com quem jogou menos tempo, pra não passar horas na frente de todo mundo.

## Temas

Cada pessoa escolhe o tema no próprio celular (botão **Tema**, no topo). Fica salvo no navegador.

| Tema | Inspiração | Marca registrada |
| --- | --- | --- |
| Cartucho | 8 bits, manual de cartucho | barra de vida em blocos, GAME OVER |
| Vice | site oficial do GTA 6 | azul-marinho liso, títulos condensados creme, rótulos e botões pastel, tempo em estrelas, JÁ ERA em degradê pêssego-rosa |
| Cinzas | soulslike, fogueira e castelo | brasas subindo, fio dourado, VOCÊ MORREU |
| Neon | cidade cyberpunk | cantos cortados, segmentos inclinados, FLATLINE com glitch |

Os temas são inspirados na estética desses jogos, sem usar logos, fontes ou arte oficiais.
Pra criar um tema novo: adicione em `frontend/src/lib/themes.ts`, crie o bloco de tokens
`[data-theme='seu-tema']` em `globals.css` e, se quiser, um cenário em `Backdrop.tsx`.

## Stack

| Parte | O quê |
| --- | --- |
| `backend/` | NestJS 11 + socket.io. Salas ficam em memória, sem banco. |
| `frontend/` | Next.js 16 (App Router) + Tailwind 4, visual pixel art, mobile-first. |

Não tem banco de dados de propósito: uma sala só existe enquanto a party acontece. Se o backend
reiniciar, as salas abertas somem. Salas sem ninguém conectado são apagadas depois de 30 minutos.

## Rodando com Docker

```bash
docker compose up --build
```

- Site: http://localhost:3000
- Backend: http://localhost:3001 (`/health` responde `{"ok":true}`)

**Pelo celular na mesma rede Wi-Fi:** abra `http://IP-DO-SEU-PC:3000`. O site procura o backend no
mesmo IP, porta 3001, então funciona sem configurar nada. Talvez precise liberar as portas 3000 e 3001
no firewall do Windows.

Se o backend estiver em outro endereço (deploy, por exemplo), passe na hora do build:

```bash
NEXT_PUBLIC_SERVER_URL=https://api.seudominio.com docker compose up --build
```

## Rodando sem Docker (dev)

Precisa de Node 22.

```bash
cd backend && npm install && npm run dev      # porta 3001
cd frontend && npm install && npm run dev     # porta 3000
```

### Testes

```bash
cd backend && npm test
```

O teste sobe o servidor com tempos curtos e simula 3 jogadores: criar sala, entrar, nome repetido,
só o dono configura, fila sorteada, morrer, auto-início depois do preparo, fim do tempo e reconexão.
Também testa os estilos de fila e o tempo livre.

Para testar o fluxo à mão sem esperar 10 minutos, encurte os tempos:

```bash
MINUTE_MS=3000 PREP_MS=8000 npm run dev   # 1 "minuto" vira 3s, preparo vira 8s
```

## Deploy

| Parte | Onde | Por quê |
| --- | --- | --- |
| `frontend/` | Vercel, com **Root Directory** = `frontend` | Next.js roda direto, grátis no Hobby |
| `backend/` | Render (`render.yaml` na raiz) | Precisa ser **um processo só e sempre vivo**: as salas e os timers ficam em memória |

O backend não vai pra Vercel porque lá as funções escalam em várias instâncias e fecham as conexões
depois de alguns minutos, aí jogadores da mesma sala cairiam em memórias diferentes.

1. No Render: **New > Blueprint**, escolha este repositório. Ele lê o `render.yaml`. Preencha
   `CORS_ORIGIN` com o endereço do site na Vercel.
2. Na Vercel: importe o repositório com Root Directory `frontend` e a variável
   `NEXT_PUBLIC_SERVER_URL` = endereço do backend no Render (ex.: `https://morreu-passou-backend.onrender.com`).

No plano grátis do Render o backend dorme depois de 15 minutos sem ninguém conectado e leva uns 50
segundos pra acordar na primeira visita.

### Deploy automático (GitHub Actions)

`.github/workflows/deploy.yml` roda em todo PR e push: build e teste do backend, checagem de tipos e
build do frontend. Num push na `main`, se tudo passar, ele dispara o deploy do backend no Render e
publica o frontend na Vercel. O deploy automático nativo dos dois fica desligado
(`autoDeploy: false` no `render.yaml`, `git.deploymentEnabled: false` em `frontend/vercel.json`),
assim nada sobe com teste quebrado e não tem deploy duplo.

Secrets do repositório (Settings > Secrets and variables > Actions):

| Secret | De onde vem |
| --- | --- |
| `RENDER_DEPLOY_HOOK_URL` | Render > serviço do backend > Settings > Deploy Hook |
| `VERCEL_TOKEN` | Vercel > Account Settings > Tokens |
| `VERCEL_ORG_ID` | ID do time na Vercel (`team_...`) |
| `VERCEL_PROJECT_ID` | Vercel > projeto > Settings > General > Project ID |

## Variáveis de ambiente

| Variável | Onde | Padrão | Pra quê |
| --- | --- | --- | --- |
| `PORT` | backend | `3001` | Porta do servidor |
| `CORS_ORIGIN` | backend | `*` | Origens liberadas, separadas por vírgula |
| `MINUTE_MS` | backend | `60000` | Duração de "1 minuto" (só pra teste) |
| `PREP_MS` | backend | `30000` | Tempo pro próximo pegar o controle |
| `NEXT_PUBLIC_SERVER_URL` | frontend | mesmo host, porta 3001 | Endereço do backend |

## Como funciona

- Cada aparelho ganha um id aleatório salvo no navegador. Se a pessoa fechar a aba ou cair a
  internet, ela volta pro mesmo lugar da fila ao reabrir a sala.
- O servidor é quem manda no tempo: ele guarda quando cada fase termina e avança a fila sozinho.
  Os celulares só mostram a contagem, corrigindo a diferença de relógio.
- Quem entra com a party rolando vai pro fim da fila. Se o dono sair, a coroa passa pro próximo.
- O dono pode tirar alguém da sala, pular a vez de quem está jogando e encerrar a party.
- Na sua vez o celular vibra, toca um bipe de 8 bits e a tela fica acesa enquanto você joga.
