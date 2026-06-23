# Dotcom dev orchestration via process-compose (spike)

This is an **exploratory spike**: replace the hand-rolled dev orchestrator (`zero-cache/dev.ts` and
friends) with a declarative [`process-compose`](https://github.com/F1bonacc1/process-compose) config
([`process-compose.yaml`](process-compose.yaml)) — keeping everything **host-native** (the way dev
runs today), just declaratively orchestrated.

It's the **lighter-weight sibling** of the full-Docker spike
([#9296](https://github.com/tldraw/tldraw/pull/9296)). Both delete the same ~1,000 lines of
hand-rolled supervision; the difference is what you run on:

- **This spike:** processes on the host (native HMR, shared `node_modules`, working service bindings),
  orchestrated by process-compose. Only postgres stays in a container.
- **#9296:** every service in a container (reproducibility / CI-parity), at the cost of a 2.6 GB linux
  `node_modules` and macOS bind-mount HMR latency.

## Bottom line

**This is the best-value option for day-to-day local dev.** It captures the main structural win of
the Docker path — _delete the bespoke supervisor, get `depends_on` + readiness gating + lifecycle +
log multiplexing for free_ — **without** any of the container taxes. The inner loop stays exactly as
fast as today (it _is_ today's host execution).

What it does **not** give you (and #9296 does): network isolation. So parallel multi-worktree stacks
still need port offsets (#9273's job), and you don't get container reproducibility / CI-parity. (The
one ergonomic wrinkle — process-compose has no npm package — is handled by fetching the binary on
first `yarn dev-app`, so there's no separate install step.)

If the team's priority is **fast daily inner loop + less hand-rolled orchestration**, this wins. If
it's **reproducibility / onboarding / parallel stacks**, lean toward #9296 / #9273.

## How to run

No install step — from the repo root (same secrets as before — `sync-worker/.dev.vars` +
`client/.env.local`):

```bash
yarn dev-app          # fetches process-compose on first use, then runs apps/dotcom/process-compose.yaml
```

`process-compose` here is the `bin` of the `@tldraw/scripts` workspace
([`internal/scripts/process-compose-bin.cjs`](../../internal/scripts/process-compose-bin.cjs)) — a tiny
wrapper that downloads the pinned binary into a gitignored `.process-compose/` on first use, then execs
it. process-compose has no npm package, so this vendors the "install" into a normal workspace bin (Yarn
doesn't run a workspace's postinstall, so the fetch is lazy on first `dev-app` rather than eager). Only
people who run the dotcom stack pay the one-time download.

That opens the process-compose TUI: every service with its status, logs, and health. `yarn
dev-app:doctor` lists process state; `yarn dev-app:clean` tears the postgres container + dev state
down.

## What it replaces

`process-compose.yaml` encodes — declaratively — what `dev.ts` did imperatively:

| Hand-rolled (deleted)                                                | process-compose equivalent                                        |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `dev.ts` spawning + supervising N processes                          | `processes:` map                                                  |
| `waitForPostgres`, `waitForHttpOk`, `wait-for-dev-readiness.ts`      | `depends_on` + `readiness_probe`                                  |
| migrate→Zero sequencing (the `--signal-success` + `:7654` handshake) | `migrate` one-shot → `depends_on: process_completed_successfully` |
| `killChildren` / `descendantPids` / `pgrep` process-tree reaping     | process-compose owns the process tree                             |
| `reconcileDockerStacks`, port reconciliation                         | n/a (single fixed stack)                                          |
| manual `stdio: inherit` log prefixing                                | built-in log multiplexing + TUI                                   |
| `dev-doctor.ts`                                                      | `process-compose process list` / the TUI                          |

Deleted in this spike (~1,000 lines): `zero-cache/dev.ts`, `dev-env.ts` (+test),
`wait-for-dev-readiness.ts`, `dev-clean.ts`, `dev-doctor.ts`, `docker-compose.ts`, `clean.sh`,
`sync-worker/dev.ts`, and the `package.json` dev/clean/doctor scripts they backed.

**Kept**: `zero-cache/docker/` (process-compose runs it for postgres), `migrate.ts` + `migrations/` +
`bundle-schema` (schema/deploy), and the shared worker runner `internal/scripts/workers/dev.ts`
(bemo/analytics/examples still use it — and process-compose runs the workers through it).

## How this compares — the axes that actually differ from #9296

### Inter-service wiring — **nothing to rewire**

Because every service runs on the host, all the existing URLs are already correct: workers talk to
`localhost:6543` / `localhost:8787`, the browser hits `localhost:*`, zero connects to
`127.0.0.1:6543`. The Docker spike had to repoint server-to-server URLs at compose service names and
add `/etc/hosts` aliases for the browser; **here that whole class of work disappears** — the env in
`process-compose.yaml` is just the same values `zero-cache/.env` already used.

### Worker→worker service bindings — **they work**

The single biggest thing the Docker spike _couldn't_ do: `image-resize` and `tldrawusercontent` bind
the sync-worker by name through wrangler's dev registry, which doesn't span containers. Here every
worker runs on one host sharing one registry, so the bindings resolve. The config just orders them
(`image-resize`/`usercontent` `depends_on` `sync-worker`) so the bindee is registered first.

### node_modules / HMR — **no tax**

Native `node_modules` (shared with the host — no second 2.6 GB linux copy), native FSEvents file
watching, native reads. Vite HMR and wrangler rebuilds are exactly as fast as running them by hand
today. This is the whole point.

### Postgres — **still one container**

The `wal2json` / logical-replication image is the one piece that genuinely wants a container.
process-compose runs `docker compose up` for it as a managed process (with a `shutdown:` hook to
`docker compose down`), and gates `migrate` on a TCP readiness probe against `:6543`.

### Multiple instances — **same problem as today (#9273)**

process-compose is a process supervisor, not a network namespace. Two stacks on one host collide on
`3000`/`8787`/`6543`/… exactly as they do now. process-compose can _carry_ a port offset cleanly
(env-templated commands), but you still renumber every port + rewrite every inter-service URL — i.e.
it's still #9273. This is the one axis where Docker's isolation is structurally better.

### CI — **nothing extra**

The dotcom e2e workflow is unchanged: `yarn dev-app` fetches process-compose on first use, so there's
no install step, and the stack is host-native — exactly what CI already runs. Compare the Docker
spike, which had to build images + install a linux `node_modules` volume in CI.

## Status — verified

- **process-compose installed** (v1.116.0) and the config **validates** (`--dry-run`: "Validated 10
  configured processes").
- **Readiness gating proven** on this machine with a minimal demo: a dependent process only started
  after its dependency's readiness probe passed — i.e. the `depends_on: process_healthy` /
  `process_completed_successfully` mechanism that replaces `wait-for-dev-readiness.ts` works.
- **Not run end-to-end here**: the full stack would collide with a running host `yarn dev-app`, so I
  verified the mechanism rather than booting all 10 processes. The per-service commands are the same
  ones the host flow already runs, so the risk is in the orchestration (verified), not the services.

## Trade-off summary (three options)

|                             | host-native + process-compose (this) | full Docker (#9296)        | host-native bespoke (today / main) |
| --------------------------- | ------------------------------------ | -------------------------- | ---------------------------------- |
| Hand-rolled orchestration   | **deleted** (declarative yaml)       | deleted (compose)          | ~1,000 lines of `dev.ts` etc.      |
| Inner-loop / HMR            | native (fast)                        | VM bind-mount latency      | native (fast)                      |
| node_modules                | shared host                          | +2.6 GB linux volume       | shared host                        |
| Worker service bindings     | **work**                             | broken (need 1-container)  | work                               |
| URL rewiring                | none                                 | service names + /etc/hosts | none                               |
| Parallel stacks             | needs #9273 port offsets             | compose projects (easy)    | needs #9273                        |
| Reproducibility / CI-parity | weak                                 | strong                     | weak                               |
| Extra tooling               | process-compose (auto-fetched)       | Docker (already have)      | none                               |
| Postgres                    | 1 container                          | container                  | 1 container                        |
