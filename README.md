# PING.COM — Projeto 1.2: aplicação full-stack

Monitoramento ICMP em rede local com front-end HTML/CSS/JS e API REST Express + TypeScript + SQLite.

## Requisitos
- Node.js **22+**, npm e utilitário `ping` do SO (no Arch Linux: `sudo pacman -S iputils`).
- Acesso à rede para `npm ci` na primeira instalação. O ZIP não contém `node_modules`.

## Executar (Linux/macOS)
```bash
cp .env.example .env
# Edite .env e substitua JWT_SECRET por um segredo aleatório seguro.
# Exemplo para gerar: node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
npm ci
npm run dev
```
No Windows PowerShell, use `Copy-Item .env.example .env` e edite o `.env`.
Abra **http://localhost:3000**. Para execução compilada: `npm run build && npm start`.

## Arquitetura
- `public/`: interface original adaptada para API e JWT.
- `src/routes/`: rotas e métodos HTTP; `src/controllers/`: validações e operações.
- `src/models/`: acesso parametrizado ao **cliente SQLite better-sqlite3** (client SQL, em vez de ORM).
- `src/middleware/auth.ts`: autorização Bearer JWT.
- `src/utils/jwt.ts`: JWT HS256 com `node:crypto` e expiração de 8 horas.
- `src/utils/errors.ts`: `ApiError`, wrapper async e handler centralizado.
- `src/migrations/001_initial.sql`: schema versionado; `src/database.ts` aplica novas migrations em transação.
- `src/services/monitoring.ts`: ICMP via `execFile` e validação de IP privado.
- `src/config.ts`: leitura do `.env`, validação de porta e segredo; dados no diretório `data/` ignorado pelo Git.

## Entidades e relacionamentos
`users` (1:N) `devices`; `users` (1:N) `checks`; `devices` (1:N) `checks`.
Ao excluir dispositivo, `checks.device_id` fica NULL; nome/IP históricos são preservados. Ao excluir conta, dispositivos e histórico são removidos pela FK de cascata.

## Endpoints
| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/auth/register` | cadastro, recebe JWT |
| POST | `/api/auth/login` | login, recebe JWT |
| GET | `/api/auth/session` | perfil autenticado |
| POST | `/api/auth/logout` | revoga tokens do usuário |
| GET | `/api/devices` | lista do usuário |
| GET | `/api/devices/:id` | detalhe do usuário |
| POST | `/api/devices` | cria e executa primeiro ping |
| PUT | `/api/devices/:id` | atualiza nome/IP/tipo |
| DELETE | `/api/devices/:id` | remove dispositivo |
| POST | `/api/devices/:id/check` | verificação manual |
| GET | `/api/dashboard` | contadores e estados |
| GET | `/api/problems` | dispositivos com problemas |
| GET | `/api/history?deviceId=1` | histórico do usuário |

Todas as rotas fora de `register` e `login` exigem `Authorization: Bearer TOKEN`.
Exemplo:
```bash
curl -s http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"name":"Teste","email":"teste@example.com","password":"senhaSegura123"}'
```
Copie o `token` recebido e teste:
```bash
curl http://localhost:3000/api/devices -H 'Authorization: Bearer SEU_TOKEN'
```

## Apresentação — cinco critérios
1. **Express (20):** mostre `routes`, `controllers`, `models`, validação de IP e `utils/errors` (erros 400/401/404/409/500).
2. **Integração (20):** autentique na interface, veja a aba Network do navegador e explique `fetch`, `Authorization`, `sessionStorage` e mensagens de erros.
3. **Banco (20):** mostre `001_initial.sql`, FK/índices e `schema_migrations` (migration automática), crie/edite/exclua dispositivo, mostre histórico. Foi usado **cliente SQL parametrizado better-sqlite3** (alternativa ao ORM prevista no enunciado).
4. **JWT (20):** crie usuário, explique bcrypt (12 rounds), HS256, expiração, `auth` e logout que incrementa `token_version`.
5. **Config (20):** mostre `.env.example`, `.gitignore`, `src/config.ts` e variáveis `PORT`, `DB_PATH`, `JWT_SECRET` e `MONITOR_CRON`.

## Segurança e observações
- JWT fica em `sessionStorage` (não persiste após fechar a aba; cuidado com XSS). Para produção, avaliar cookies HttpOnly+SameSite e CSRF.
- Logout revoga **todos** os tokens já emitidos para a conta; JWT expira em 8h.
- O monitoramento só aceita IPv4 privado ou loopback, evitando execução arbitrária de comandos (usa `execFile` sem shell).
- Execute localmente ou numa rede confiável. **Não publique o painel de ping na Internet** sem firewall, rate limiting e HTTPS/revisão de segurança.
- O cron executa ping nos dispositivos cadastrados a cada minuto, por padrão.
- A migration inicial atende a instalações novas; para importar um banco de uma versão antiga manualmente, faça backup e migração específica antes de executar.
- Dependências não estão embutidas no ZIP. Instalação e teste end-to-end exigem npm acessível.


## Correções de exibição do histórico (revisão 1.2.1)

- `/api/history` agora utiliza aliases SQL para devolver `deviceName`, `checkedAt`, `latencyMs` e `packetLossPercent`, no mesmo contrato JSON do dashboard.
- A tabela de detalhes exibe quatro células por registro, correspondendo exatamente às quatro colunas do cabeçalho; o histórico geral mantém seis.
- Informações de perda ausentes ou inválidas aparecem como `—`, não `undefined%`. `0%` é preservado.
- Medições sem latência numérica não são apresentadas como 'Latência elevada'. Gráficos ignoram pontos sem medições válidas.
- O JavaScript inclui compatibilidade de leitura com nomes em `snake_case` para dados de APIs antigas; o schema SQLite não foi alterado. Nenhuma migração de dados é necessária para esta correção.

**Para aplicar:** substitua os arquivos da aplicação pelo conteúdo deste ZIP, preserve o seu `.env` e o banco `data/pingcom.db`, reinicie `npm run dev` e force atualização do navegador (`Ctrl+Shift+R`).
