# Transiett Vouchers — Monorepo (Server + Client)

Manage voucher campaigns with a TypeScript backend and a React frontend.
Implements the Transiett assignment end-to-end, including CSV export and a performance test that generates & downloads 100k vouchers within a reasonable time.

## Assignment checklist

* Create a voucher campaign
* Create batch vouchers inside a campaign
* List campaigns
* List vouchers in a campaign
* Delete a campaign (cascade)
* Download CSV of vouchers for a campaign 
* Backend tests (unit, integration, perf)
* Docker / docker-compose (Postgres + Adminer)
* 100k vouchers: generate & download in reasonable time (measured ~6–7s locally)
* Frontend (React, optional in the spec)

Frontend tests were not implemented (optional).

## Tech stack

* Backend: Node 20, Express 5, Prisma, PostgreSQL 16
* Frontend: React (Vite) in client/transiett-voucher
* Lang/Tooling: TypeScript, Zod, Jest + ts-jest, Supertest
* Infra: Docker Compose (Postgres + Adminer)
* Monorepo: npm workspaces, concurrently

## Project layout

.
├─ server/

│  ├─ src/

│  │  ├─ app.ts                 # buildApp(): middlewares, routes, error handler

│  │  ├─ server.ts              # boots app (PORT, listen, graceful shutdown)

│  │  ├─ prisma.ts              # Prisma client (single instance)

│  │  ├─ repositories/          # FP repos (Campaign/Voucher/GenerationBatch)

│  │  ├─ services/              # makeVoucherService (FP + DI)

│  │  ├─ controllers/           # CSV download handlers

│  │  ├─ utils/csv.ts           # csvEscape (RFC 4180)

│  │  └─ middlewares/           # error handling etc.

│  ├─ prisma/schema.prisma

│  ├─ tests/                    # unit, integration, perf; Jest setup

│  └─ docker-compose.yml

└─ client/
   └─ transiett-voucher/        # React app (Vite)


## Getting started

**Prerequisites**
* Node 18+ (Node 20 recommended)
* Docker + Docker Compose
* npm 7+ (for workspaces)

**1) Start the database (Docker)**
From repo root:

```bash
npm run db:up

```
This starts Postgres (db) and Adminer UI (adminer).

* Adminer: http://localhost:8080
(Server: db • Authentication: use the POSTGRES_* envs set for the container)

> We don’t hardcode credentials here. See the next step to derive your DATABASE_URL from the running container.

**2) Create _server/.env_ without hardcoding secrets**

Bash(macOS/Linus WSL)
```
# Host port mapped from container
PORT=$(docker compose port db 5432 | awk -F: '{print $2}')

# Read DB credentials from the running container (no echo in repo)
USER=$(docker compose exec -T db printenv POSTGRES_USER)
PASS=$(docker compose exec -T db printenv POSTGRES_PASSWORD)
NAME=$(docker compose exec -T db printenv POSTGRES_DB)

# Write .env with DATABASE_URL targeting the "voucher" schema
cat > server/.env <<EOF
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://${USER}:${PASS}@localhost:${PORT}/${NAME}?schema=voucher
EOF

echo "server/.env written. DATABASE_URL points to schema 'voucher'."
```
PowerShell(Windows)
```
$port = (docker compose port db 5432).Split(':')[-1].Trim()
$user = (docker compose exec -T db printenv POSTGRES_USER).Trim()
$pass = (docker compose exec -T db printenv POSTGRES_PASSWORD).Trim()
$name = (docker compose exec -T db printenv POSTGRES_DB).Trim()

@"
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://$user:$pass@localhost:$port/$name?schema=voucher
"@ | Out-File -Encoding utf8 server/.env

Write-Host "server/.env written. DATABASE_URL points to schema 'voucher'."
```
If the _voucher_ schema doesn't exist yet, the next step (db push) will create it.

**3) Initialize DB schema (Prisma)**
``` bash
npm -w server exec prisma db push
```
You should see:
``` pgsql
Datasource "db": PostgreSQL database "<db>", schema "voucher" at "localhost:<port>"
```

**4) Install & run (monorepo)**
``` bash
# install workspaces
npm install

# dev: DB + server + client (concurrently)
npm run dev
```
* API: http://localhost:8000
* Web: http://localhost:3000

_**Production preview**_
```bash
npm run build
npm run start
```

## API Overview

Base path: /api

**Campaigns**

* Create — POST /api/campaigns
* List — GET /api/campaigns?search=...&limit=...&cursor=...
* Delete — DELETE /api/campaigns/:id

**Vouchers**

* Generate batch — POST /api/campaigns/:id/vouchers with { "count": 5000 }
* List (per campaign) — GET /api/campaigns/:id/vouchers?search=...&limit=...&cursor=...
* Export CSV (campaign) — GET /api/campaigns/:id/vouchers/export
* Export CSV (all) — GET /api/vouchers/export/all

**CSV header:**
code,campaignId,prefix,amountCents,currency,createdAt

>Pagination contract: Stable cursor pagination using
orderBy: [{ createdAt: 'desc' }, { id: 'desc' }].
nextCursor points to the last returned item (not the lookahead).

## Tests
All tests live under `server/tests.`

Run tests:
```bash
npm run test
```
Performance(100k vouchers), gated:
```bash
# PowerShell
$env:RUN_HEAVY="1"; npm test -- tests/perf/

# macOS/Linux
RUN_HEAVY=1 npm test -- tests/perf/
```
**DB isolation in tests:** Jest `globalSetup` creates a random schema (e.g., `test_<uuid>`), runs `prisma db push`, and `globalTeardown` drops it.
`.env.test` deliberately omits `?schema=...`; the setup appends it dynamically.

## Frontend (client/transiett-voucher)

* React (Vite)
* Dev: `http://localhost:3000`
* Proxy: `/api → http://localhost:8000` (configured in `vite.config.ts`)
* Use `fetch('/api/...')` from the client without CORS hassles.

Scripts:
```bash
npm --workspace client/transiett-voucher run dev
npm --workspace client/transiett-voucher run build
npm --workspace client/transiett-voucher run start
```

___

## Development notes

* **Functional architecture + DI:** repositories/services are factories receiving dependencies (Prisma client, RNG, clock) for testability and decoupling.
* **Voucher generation:** `PREFIX-XXXXXX` (A–Z). Uses `createMany({ skipDuplicates: true })` and retries only the missing items (collision-safe).
* **CSV export:** streaming with `res.write(...)`; fields escaped via `csvEscape` (RFC 4180).
* **Pagination stability:** always `createdAt desc, id desc`; `nextCursor` set to the last returned item.


## Troubleshooting

* **Server looks at `public` schema:** ensure `server/.env` sets `?schema=voucher` in `DATABASE_URL`, then `npm -w server exec prisma db push`.
* **Jest says `DATABASE_URL` missing:** ensure `server/.env.test` exists; run with `DEBUG_ENV=1` to trace env loading.
* **CSV line count off:** verify stable ordering and `nextCursor` logic (last returned item), and that clients pass the returned cursor unmodified.


## Scripts (root)

* dev — docker DB + server + client (concurrently)
* start — production preview (concurrently)
* db:up / db:down — docker compose helpers
* build — build server and client
* test — server tests


## License

MIT
