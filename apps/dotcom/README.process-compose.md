# Dotcom dev orchestration via process-compose (spike)

This is an **exploratory spike**: replace the hand-rolled dev orchestrator (`zero-cache/dev.ts` and
friends) with a declarative [`process-compose`](https://github.com/F1bonacc1/process-compose) config
([`process-compose.yaml`](process-compose.yaml)) — keeping everything **host-native** (the way dev
runs today), just declaratively orchestrated.

> **This branch also implements parallel worktrees** (per-worktree port blocks) on top of that — the
> original motivation for the whole exploration. Skip to
> [Multiple instances / parallel worktrees](#multiple-instances--parallel-worktrees--built-here-this-is-the-real-cost)
> for the real cost, which is the most useful thing here.

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
still need port offsets (#9273's job), and you don't get container reproducibility / CI-parity. You
also add one tool to install (a single static binary).

If the team's priority is **fast daily inner loop + less hand-rolled orchestration**, this wins. If
it's **reproducibility / onboarding / parallel stacks**, lean toward #9296 / #9273.

## How to run

Install process-compose once (single static binary — [docs](https://github.com/F1bonacc1/process-compose#installation)):

```bash
brew install f1bonacc1/tap/process-compose      # or: the get-pc.sh script, or a release binary
```

Then, from the repo root (same secrets as before — `sync-worker/.dev.vars` + `client/.env.local`):

```bash
yarn dev-app          # = process-compose -f apps/dotcom/process-compose.yaml up
```

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

### Multiple instances / parallel worktrees — **built here; this is the real cost**

> This is the original motivation behind the whole exploration, so this spike actually **implements**
> it (commit "add per-worktree port blocks") rather than hand-waving. The point is to show how much
> machinery it takes — because Docker's network isolation makes almost all of it vanish.

process-compose is a process supervisor, not a network namespace, so two stacks on one host collide on
`3000`/`8787`/`6543`/… It _can_ carry a port offset, but you have to compute and thread that offset
through **everything**. What it took:

- **A port-allocation wrapper** ([`internal/scripts/dotcom-dev-parallel.ts`](../../internal/scripts/dotcom-dev-parallel.ts),
  ~120 lines) that `yarn dev-app` now runs. It gives each worktree a stable **block index** and shifts
  every service's existing default port by **index × 100** — so worktree 0 uses the unchanged default
  ports, worktree 1 adds 100 to each, etc. (The ports stay scattered — client 3000, zero 4848,
  postgres 6543 — they're not a contiguous 3100–3199 block; only the per-worktree _spacing_ is 100.)
  From that one offset it derives **~25 env values**. _Deleting `dev.ts` bought us out of supervision;
  parallel support hands a chunk of bespoke config logic right back._
- **A persistent allocation registry** (`~/.tldraw-dotcom-dev-ports.json`, worktree → block) so blocks
  are stable across runs and don't collide. (Needing this at all is part of the cost.)
- **Every service port** offset and passed through (`--port` / `--inspector-port` for the 4 workers,
  `ZERO_PORT` for zero, published ports for postgres/pgbouncer) — _plus process-compose's own API port_
  (`:8080`), which collides too.
- **Every inter-service URL rewired** to the block: the sync-worker's `--var` postgres/asset/usercontent
  URLs, `ZERO_MUTATE_URL`/`ZERO_QUERY_URL`, and the client's baked `MULTIPLAYER_SERVER`/`ZERO_SERVER`/
  `USER_CONTENT_URL`.
- **Host-global state made per-worktree**: a per-worktree `WRANGLER_REGISTRY_PATH` (without it, two
  worktrees' identically-named `dev-tldraw-multiplayer` workers clobber each other in the shared
  registry and service bindings cross-talk between stacks), the zero replica file, and the postgres
  docker **compose project** (distinct project ⇒ distinct volume + ports).
- **Four committed files had to change** to honor the offset:
  - `wrangler.toml` ports/vars — overridden at runtime via `--port`/`--var` (not edited).
  - [`client/scripts/dev-app.ts`](client/scripts/dev-app.ts) — read `CLIENT_PORT` from env.
  - [`client/src/utils/config.ts`](client/src/utils/config.ts) — dev `ZERO_SERVER` was hard-coded to
    `localhost:4848`; now honors the offset env.
  - [`client/src/utils/csp.ts`](client/src/utils/csp.ts) — the **dev Content-Security-Policy hard-codes
    the worker/zero ports**, so an offset worktree's browser silently blocks its own workers until you
    widen `connect-src` to `http://localhost:*` in dev. (This one is easy to miss and produces
    confusing "it loads but nothing connects" failures.)

**Verified:** the allocator produces correct, non-colliding blocks (block 0 = 3000/8787/4848/6543…,
block 1 = 3100/8887/4948/6643…); the parameterized `process-compose.yaml` validates with a block's env
(`--dry-run`: 10 processes); and **two parallel postgres booted on offset ports (6643 + 6743) with
isolated volumes**, each answering independently. Not booted as two _full_ stacks end-to-end (would
collide with a running host stack), but the stateful tier + the wiring are proven.

**The contrast with Docker (#9296) is the whole point.** There, parallel = a second compose project;
internal ports and every inter-service URL stay **fixed** (network isolation), and you template only
the handful of **published** host ports. No URL rewiring, no registry isolation, no CSP problem, no
allocation registry. So: process-compose wins the single-stack inner loop; **Docker wins parallel
stacks** decisively — this spike is the evidence for exactly how decisively.

### CI — **install one binary**

The dotcom e2e workflow gains a single "Install process-compose" step; everything else is unchanged
(the stack is host-native, exactly what CI already runs). Compare the Docker spike, which had to
build images + install a linux `node_modules` volume in CI.

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
| Extra tooling               | process-compose binary               | Docker (already have)      | none                               |
| Postgres                    | 1 container                          | container                  | 1 container                        |
