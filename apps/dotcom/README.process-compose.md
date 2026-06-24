# Dotcom dev orchestration

`yarn dev-app` brings up the whole dotcom dev stack — client, the four Cloudflare workers, zero-cache,
and postgres — with [process-compose](https://github.com/F1bonacc1/process-compose), from
[`process-compose.yaml`](process-compose.yaml). process-compose is "docker-compose for processes": the
same declarative `depends_on` + readiness model, but the services run as **host processes** (native
HMR, shared `node_modules`, working worker↔worker service bindings); only postgres runs in a container.

This replaces a hand-rolled supervisor (`zero-cache/dev.ts` and friends, ~960 lines) that spawned the
processes, polled for readiness, sequenced migrations, and reaped the process tree by hand.

## Why

**1. Cleaner management of many processes, with real dependencies between them.** Each service declares
what it waits for — `depends_on` + a readiness probe — instead of the imperative `waitForPostgres` /
`waitForHttpOk` / process-tree-reaping the old orchestrator open-coded. The migrate→zero-cache ordering,
the schema bundle, the "start sync-worker before the workers that bind it" rule are all a few lines of
YAML, so adding or reordering a service is a local edit rather than a change to a 300-line supervisor.

**2. A real control surface for automation (including AI agents).** A running stack is a client/server:
it exposes a REST API and a scriptable CLI with JSON output. So a script — or Claude — can boot it
headless, introspect per-process status and logs, and restart a single service:

```bash
process-compose process list                  # status / health / restarts of every service (JSON available)
process-compose process logs zero-cache --tail 200
process-compose process restart sync-worker
```

The old stdout-blob supervisor allowed none of this — you couldn't restart just `zero-cache`, and logs
were one interleaved stream. (Run headless with `--tui=false` / `PC_DISABLE_TUI=1` if you prefer that
interleaved-logs feel à la `concurrently`; otherwise the default TUI gives a per-process view.)

**3. A clean path to docker-compose if we ever want it.** The config is the same `depends_on` /
readiness shape as Compose, and postgres already runs via `docker compose`. If full containerization
ever becomes worth it for reproducibility or CI-parity, the model and most of the config carry straight
over. (#9296 is that exploration; the current preference is host/metal for the inner loop — native HMR,
no multi-GB linux `node_modules`, and worker bindings that just work on one shared host.)

**4. A clean path to parallel stacks.** The commands and ports are env-parameterizable, so multiple
worktrees / parallel Claude sessions can run their own copy of dotcom side by side by handing each a
distinct port block (the follow-up in #9302). The old singleton orchestrator pinned the stack to fixed
ports and couldn't.

## Running it

With the Clerk secrets in place (`sync-worker/.dev.vars` + `client/.env.local`), from the repo root:

```bash
yarn dev-app          # process-compose up; client on http://localhost:3000
```

- `yarn dev-app:doctor` — `process-compose process list`
- `yarn dev-app:clean` — tear the postgres container + dev state (volume, zero replica, wrangler state) down
- Quit with `F10` / `Ctrl-C` — graceful: stops every process and runs postgres's `docker compose down` hook

No install step: process-compose has no npm package, so `yarn dev-app` runs the `process-compose` bin of
`@tldraw/scripts` ([`process-compose-bin.cjs`](../../internal/scripts/process-compose-bin.cjs)), which
downloads the pinned binary into a gitignored `.process-compose/` the first time it's used. (Yarn
doesn't run a workspace's postinstall, so the fetch is lazy on first `dev-app` rather than eager — only
people who run the stack pay the one-time download.)

## What runs

[`process-compose.yaml`](process-compose.yaml) defines the dependency graph: **postgres** (the one
container) → **migrate** (one-shot) → **zero-cache** → **sync-worker** → **image-resize / usercontent /
asset workers** → **client**. sync-worker comes up before the workers that bind it, so their service
bindings resolve through the shared wrangler dev registry; readiness is a TCP probe per service.

Net, it removes ~960 lines of bespoke orchestration — `zero-cache/dev.ts`, `dev-env.ts`,
`wait-for-dev-readiness.ts`, `dev-clean.ts`, `dev-doctor.ts`, the docker wrapper, `sync-worker/dev.ts`,
and their `package.json` scripts — and keeps `migrate.ts` + `migrations/` + `bundle-schema`
(schema/deploy) and the shared worker runner (`internal/scripts/workers/dev.ts`, also used by
bemo/analytics/examples).
