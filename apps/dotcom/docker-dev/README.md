# Dotcom full Docker dev stack (spike)

This is an **exploratory spike**, not a shipping setup. It runs the entire tldraw.com (dotcom)
dev stack in containers — client, all four Cloudflare workers, zero-cache, postgres, and pgbouncer —
each on its conventional default port inside the compose network, reaching each other by service
name. It exists to answer one question: _what would full containerization of the dotcom dev stack
look like, and is it worth it?_

This branch now implements the **full end state**: Docker is the only dev path (`yarn dev-app`), CI
e2e included, and the host-native orchestration is deleted (~1,450 lines — see
[what it removes](#what-this-makes-the-default-and-what-it-removes)). The commit history shows the
progression — spike alongside → default with a host fallback → all-in — so you can see the shape and
cost at each step before deciding. It's an alternative to
[#9273](https://github.com/tldraw/tldraw/pull/9273) (`frolic/parallel-dotcom-dev`), which solves a
related problem (parallel stacks) by staying host-native with per-worktree port blocks. See
[How this compares to #9273](#how-this-compares-to-9273) at the bottom.

## Bottom line

**Not worth replacing the host flow with for day-to-day local dev — but worth keeping as an
opt-in target for onboarding, CI-parity, and "works on my machine" reproduction.**

_(This branch implements the all-in version regardless — Docker as the only path — so the end state
is concrete to evaluate. The recommendation below is the analysis that should drive the decision, not
a description of what the branch does.)_

The two things people fear most about containerizing this stack both turned out **fine**:

- **workerd / `wrangler dev` runs in a Linux container** with no drama (verified — see below).
- **Postgres logical replication for Zero works in a container** (verified — `wal_level=logical`,
  replication slots, pgbouncer pooling all good).

What makes it not worth it as the _default_ is the sum of smaller taxes, none fatal but each real:

1. **A second ~2.6 GB Linux `node_modules`** that must be installed and kept separate from the host's
   (you cannot share macOS binaries into Linux). Disk + first-run install time.
2. **macOS bind-mount file-watching latency.** Vite HMR and wrangler rebuilds run over the
   Docker-for-Mac VM's virtiofs/osxfs bridge, which is meaningfully slower than native FS events.
   This is the iteration-speed tax, and it is the main reason not to make it the default.
3. **Worker→worker service bindings don't span containers** (wrangler's dev registry is per-host,
   not per-network). The clean topology — one worker per container — breaks `image-resize` and
   `tldrawusercontent`, which bind the sync-worker by name. The fix is to run all workers in **one**
   container via wrangler multi-config dev, which claws back some of the "clean separation" win.
4. **The browser is always on the host**, so containerization removes _server-to-server_ URL wiring
   but **not** the browser-facing `localhost:<port>` wiring. The win on point #4 of the brief is
   smaller than it looks.

If the goal is **reproducibility / onboarding / CI-parity**, containerization is genuinely
attractive: one `docker compose up`, no host Postgres/Clerk/Node-version fiddling, identical across
machines. If the goal is **fastest inner loop on a Mac**, the host flow (and #9273) wins.

## What's here

| File                                                   | Purpose                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [`docker-compose.yml`](docker-compose.yml)             | The whole stack: client, 4 workers, zero-cache, postgres, pgbouncer, plus a one-shot `install` service.             |
| [`Dockerfile`](Dockerfile)                             | Minimal `node:20` base image for every Node service. No repo copy, no build-time install (deps come from a volume). |
| [`entrypoint-zero-cache.sh`](entrypoint-zero-cache.sh) | Waits for postgres, bundles the Zero schema, migrates, runs `zero-cache-dev`.                                       |
| [`.env.example`](.env.example)                         | Template for the one secret the stack needs from you (Clerk).                                                       |

## How to run

This stack is wired up as the default `yarn dev-app` (from the repo root) — it's the only dev path now;
the host-native stack has been removed. Don't run it alongside another copy (or a leftover host
postgres) — they collide on `6432`/`4848`/… (see [trade-off 5](#5-running-multiple-instances)).

One-time setup:

```bash
cp apps/dotcom/docker-dev/.env.example apps/dotcom/docker-dev/.env   # fill in VITE_CLERK_PUBLISHABLE_KEY
# also create apps/dotcom/sync-worker/.dev.vars with CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
#   (same file the host flow needs; it is bind-mounted into the sync-worker container)
```

Then from the repo root:

```bash
yarn dev-app                   # = docker compose up --build; first run installs a linux node_modules volume (slow)
```

Open http://localhost:3000. (No `/etc/hosts` aliases needed: the browser uses `localhost:<published
port>` for the workers/zero, while the Vite `/api` proxy reaches the sync-worker by compose service
name via `MULTIPLAYER_PROXY_TARGET` — see [trade-off 4](#4-inter-service-wiring-what-actually-simplifies).)

To reset everything (including the DB and the linux `node_modules`):

```bash
yarn dev-app:clean             # = docker compose down --volumes
```

---

## Trade-offs evaluated

### 1. wrangler dev / workerd in Docker — **works**

This was billed as the biggest unknown. It is the least problematic part.

**Verified:** `wrangler@4.76.0 dev` (the version this repo pins) starts workerd in a
`node:20-bookworm-slim` container and serves requests:

```
⛅️ wrangler 4.76.0
⎔ Starting local server...
[wrangler:info] Ready on http://0.0.0.0:8799
$ fetch('http://127.0.0.1:8799/') -> "workerd-ok"
```

On Apple Silicon this runs **native arm64** — `@cloudflare/workerd-linux-arm64` exists, so there's
no emulation tax for the workers themselves. Inspector ports, `--var` overrides, source maps, and
live reload all behave as they do on the host; nothing about workerd needs the host OS.

**The real sync-worker config also boots**, not just a hello-world: `wrangler dev --env dev` loads
all five durable objects (`TLFileDurableObject`, `TLPostgresReplicator`, `TLUserDurableObject`,
`TLLoggerDurableObject`, `TLStatsDurableObject`) in local mode, reaches `Ready on
http://0.0.0.0:8787`, and serves HTTP (a request to `/` returns a routed 404, i.e. workerd is up and
routing — R2/KV/queues/rate-limiter are all simulated locally, no Cloudflare account needed). The
`--var` overrides repointing postgres + asset/usercontent URLs at compose service names apply
cleanly.

**The real catch is service bindings, not workerd itself.** Two workers bind the sync-worker by its
dev name:

```toml
# image-resize-worker & tldrawusercontent-worker
services = [{ binding = "SYNC_WORKER", service = "dev-tldraw-multiplayer" }]
```

In local dev, wrangler wires service bindings through its **dev registry**, which records each
worker's `{ host, port }` and proxies between them. That registry lives under the user's global
config dir and assumes everything is on one host/loopback. It **does not span containers**: each
container has its own registry, and even a shared one would record `127.0.0.1`, which points a
container at itself. So the clean "one worker per container, reach each other by service name"
topology **cannot satisfy worker→worker service bindings** — `sync-worker:8787` over the Docker
network is not how workerd service bindings work.

This compose ships the clean topology anyway (one container per worker) because it's the honest
illustration, and marks `image-resize` / `tldrawusercontent` as **knowingly degraded**: they boot
and serve, but their `SYNC_WORKER` binding is unresolved, so image transforms and usercontent
fetches that hop through the sync-worker won't work. The core loop (client ↔ sync-worker ↔ zero ↔
postgres) does not depend on those bindings.

**The supported fix** is wrangler's multi-worker dev: run every worker from a **single**
`wrangler dev` invocation with multiple `-c` configs, so bindings resolve in-process:

```bash
wrangler dev \
  -c apps/dotcom/sync-worker/wrangler.toml \
  -c apps/dotcom/asset-upload-worker/wrangler.toml \
  -c apps/dotcom/image-resize-worker/wrangler.toml \
  -c apps/dotcom/tldrawusercontent-worker/wrangler.toml
```

That collapses all four workers into one container (one workerd), which works but undoes some of the
"each service is its own clean container" appeal, and needs reconciling with the per-worker
`[env.dev]` blocks (names, vars, durable objects) these configs rely on — wrangler applies a single
`--env` across all `-c` configs, and the dev worker names live under `[env.dev]`. That reconciliation
is the open work if this approach were pursued.

### 2. node_modules / native binaries — **the unavoidable disk + install tax**

You **cannot** mount a macOS host's `node_modules` into a Linux container. Confirmed concretely:
the host install carries `@esbuild/darwin-arm64` and `@cloudflare/workerd-darwin-arm64`; Linux needs
`@esbuild/linux-arm64` and `@cloudflare/workerd-linux-arm64`. Sharing the dir would load the wrong
binaries.

So a **separate Linux install is mandatory**. Facts that shaped the strategy here:

- The host root `node_modules` is **~2.3 GB**. A containerized stack needs its own copy of that.
- This repo uses Yarn 4 with `nodeLinker: node-modules` and **hoists almost everything to the root**:
  across all 26 workspaces there are only **two** `node_modules` directories on disk (the root and
  `packages/create-tldraw`, which dotcom doesn't touch). The dotcom workspaces have **no** nested
  `node_modules`.

**Strategy chosen:** bind-mount the repo for live source, but **shadow `node_modules` with named
volumes** so the install writes Linux binaries into a volume, never into the host tree. Because
hoisting is near-total, the load-bearing shadow is just `/repo/node_modules`; the per-workspace
shadows in the compose are defensive (they stop any nested install Yarn _might_ create from leaking
Linux binaries back into the bind-mounted — and therefore host-visible — workspace dirs). A one-shot
`install` service populates the volumes; every other service waits on it.

Costs, measured on this machine (Apple Silicon, Docker Desktop):

- **Disk:** the Linux `node_modules` volume is **~2.6 GB** (vs ~2.3 GB on the host — same deps,
  Linux binaries), per stack.
- **Install time:** `docker compose up install --build` took **~97 s** wall: image build
  (`apt-get git/python3/make/g++`) + `yarn install` (**~59 s**) + `refresh-assets` (cache hit) +
  `predev` (built `tldraw.css` fresh). **Caveat:** the 59 s is with a **warm** Yarn cache — `.yarn/cache`
  is bind-mounted from the host, so packages weren't re-downloaded, only linked into the Linux
  volume. On a machine that has never run the host install, a cold cache adds the full package
  download on top. The `apt-get` build tooling is insurance for native-addon fallbacks;
  esbuild/workerd/zero all ship prebuilt binaries, so it's rarely exercised.
- **Divergence:** the container install is a second source of truth. It can drift from the host
  install if lockfile/resolution differs between platforms; in practice Yarn resolves identically.
  Note also that `refresh-assets` hit the host's lazyrepo cache (`.lazy/` is bind-mounted) — handy,
  but it means the container leans on host-generated artifacts unless you clear that cache.

Alternatives considered and rejected for a spike: baking deps into the image at build (`COPY` repo +
`yarn install`, then bind-mount only source) — loses package.json live-edit and bloats the image;
switching the container to Yarn PnP — too invasive a divergence from the host.

> The `install` service also runs `yarn refresh-assets` and the `predev` generators. Those are
> required: the host `yarn dev` runs them via lazyrepo before `dev`, but per-service `vite`/`wrangler`
> commands here bypass that, and the client import of `tldraw/tldraw.css` (generated by
> `packages/tldraw`'s `predev`) fails without it. A real gotcha, easy to miss.

### 3. macOS file-watching / HMR performance — **the iteration-speed tax**

This is the strongest argument _against_ making Docker the default on a Mac. The repo is bind-mounted
into the Linux VM, so every source change crosses the Docker-for-Mac file-sharing bridge
(virtiofs/gRPC-FUSE) before Vite or wrangler sees it. Two consequences:

- **Higher HMR / rebuild latency** than native. Native FS events are near-instant; the VM bridge
  adds latency and, for large change sets, can miss or batch events, occasionally needing
  `usePolling` (which pegs CPU). For a canvas app where you iterate on UI constantly, this is felt.
- **SQLite-on-osxfs is a hazard.** Zero's replica is a SQLite file with WAL. Running it on a
  bind-mount over the VM bridge is both slow and risky (locking semantics differ). This compose puts
  the replica on a **named volume** (`/zero/replica.db`), not the bind-mount, specifically to avoid
  that — a pattern you'd have to remember for any stateful file.

Mitigations exist (scope mounts narrowly, `:cached`/`delegated` consistency, mount only `src`
instead of the whole repo) but they trade away simplicity, and none make it as fast as native.

### 4. Inter-service wiring — what actually simplifies

The brief's hope was that container networking would delete most of the URL/port wiring
(`MULTIPLAYER_SERVER`, worker `--var` URLs, registry paths). **Partly true, with an important
asterisk.**

**What genuinely simplifies (server-to-server):** every hop where one container calls another by
name is clean and needs no host ports:

- Vite's `/api` proxy target → `http://sync-worker:8787`
- zero-cache → postgres: `postgresql://user:password@postgres:5432/postgres`
- zero-cache → sync-worker for mutators/queries: `http://sync-worker:8787/app/zero/...`
- sync-worker → asset-upload / usercontent: `http://asset-upload-worker:8788`, etc.
- sync-worker → postgres / pgbouncer: `postgres:5432`, `pgbouncer:6432`

All of those are set via env / `--var` overrides **without editing any committed `wrangler.toml`**,
and the `WRANGLER_REGISTRY_PATH` juggling the host flow needs simply goes away (each worker is
isolated).

**What does _not_ simplify (browser-to-server):** the browser runs on the **host**, outside Docker,
and cannot resolve Docker service names. Anything the browser touches still needs a host-reachable
URL:

- the multiplayer **websocket** (`MULTIPLAYER_SERVER`, opened directly by the browser — the Vite
  proxy has `ws: false`)
- `ZERO_SERVER` (the browser talks to zero-cache directly)
- `USER_CONTENT_URL`

So you still publish those ports to the host, and the URLs baked into the bundle still have to be
host-resolvable. Two ways to square this:

- keep them as `localhost:<port>` (unchanged from today), or
- use the service names everywhere and add `/etc/hosts` aliases mapping them to `127.0.0.1` (what
  this spike documents), so one URL resolves both in-container (Docker DNS) and in-browser (hosts
  file).

There's also a **sharp edge unique to the client**: `MULTIPLAYER_SERVER` is read **both** server-side
(the Vite `/api` proxy target) **and** baked into the browser bundle (as the ws URL). On the host
today both want the same value (`localhost:8787`), so it's invisible. In containers they want
_different_ values (`sync-worker:8787` for the proxy, a host-resolvable URL for the browser). The
`/etc/hosts` trick papers over it; the clean fix is a small, backward-compatible change to
`vite.config.ts` to separate the proxy target from the browser URL. This spike does **not** touch
that committed file, so it's listed as required follow-up rather than done.

Net: real wiring deleted on the server side; browser-facing wiring is irreducible because the browser
is never in the network.

### 5. Running multiple instances

Conceptually clean: each stack is a separate compose **project** (`docker compose -p name`) with its
own network and volumes, and distinct **host** port mappings. Inside each project, services keep
their conventional ports (no per-instance renumbering of internal ports — a nice property the host
flow can't have). Only the published host ports need to differ, which is a handful of `ports:`
entries, ideally parameterized via `.env` (e.g. `CLIENT_PORT=3000`/`3100`/…).

The caveat surfaced immediately in testing: **this spike's host ports collide with the host-native
stack.** Bringing up postgres + pgbouncer failed on `Bind for 0.0.0.0:6432 failed: port is already
allocated` because `yarn dev-app` was running (`tldraw_dotcom_dev-pgbouncer-1` owns 6432). Conventional
ports collide by definition. For N parallel stacks you'd template the host-side ports.

Versus **#9273's** per-worktree 100-port block: #9273 keeps everything host-native and renumbers
_everything_ (internal included) per worktree, so there's never a collision and no Docker overhead,
but it pays in wiring complexity (every service must learn its offset). The Docker approach keeps
internal ports fixed and only templates the published ones — arguably simpler to reason about — but
every instance carries the full container + node_modules-volume + VM-FS overhead. For "I want 3
worktrees building at once," #9273 is lighter; for "I want one clean reproducible stack," Docker is
tidier.

### 6. External services (Clerk) and secrets

The stack needs Clerk keys, same as the host flow, via two gitignored files:
`client/.env.local` (`VITE_CLERK_PUBLISHABLE_KEY`) and `sync-worker/.dev.vars` (`CLERK_*`).

- **sync-worker secrets** flow in for free: `.dev.vars` is read by wrangler from the worker's
  directory, which is inside the bind-mounted repo, so the file you already have on the host is
  visible in the container unchanged.
- **client secret** is passed through compose `.env` → the client service's environment → Vite
  inlines `VITE_*`. (`.env.local` in the bind-mount would also work.)

**Clerk callback URLs are not a problem:** the browser still loads the app from
`http://localhost:3000`, so Clerk's localhost dev origin/callback behaves exactly as it does today.
Containerization doesn't change the origin the browser sees. (This is the same reason the
preview-domain auth issue in #9104 doesn't apply here — origins are unchanged.)

### 7. Zero specifics — **works**

Zero needs Postgres logical replication. **Verified in-container:**

```
postgres=# show wal_level;          -> logical
postgres=# show max_replication_slots; -> 5
```

Using the same `simonfuhrer/postgresql:16.1-wal2json` image + flags as the host stack. pgbouncer
(env-var config, no mounted `.ini`) pools through to it with scram-sha-256 auth — a `SELECT` through
the bouncer returns cleanly.

**Verified end-to-end against a fresh DB:** the [entrypoint](entrypoint-zero-cache.sh) reaches
postgres by service name, bundles the schema, applies all 37 SQL migrations, and `zero-cache-dev`
performs initial sync and reaches the **`Replicating`** stage — the serving-replicator connects to
the change-streamer and "caught up with 0 changes". Postgres ends up with the `zero_0*` schemas and
the `zero_data` / `_zero_metadata_0` publications, exactly as on the host. The entrypoint mirrors the
host orchestrator (bundle schema → migrate → `zero-cache-dev` under nodemon) minus the
Docker-from-Docker bring-up and process-tree reaping the host version needs (Compose owns those).

> **Ordering gotcha (found and fixed here):** the `zero_data` publication is created by the SQL
> migrations, and `zero-cache-dev`'s change-streamer fails hard at boot if it starts before that
> exists — `Unknown or invalid publications. Specified: [zero_data]. Found: []`. The host
> orchestrator waits on the migrations' `:7654` readiness server before starting Zero; a naive
> entrypoint that backgrounds `migrate` and starts Zero immediately hits the race on a fresh DB. The
> entrypoint here waits on `:7654` first. Easy to get wrong, and the kind of sequencing the host
> orchestrator encodes that you must re-encode when you move to containers.

One platform note: `simonfuhrer/postgresql:16.1-wal2json` is published **linux/amd64 only**, so on
Apple Silicon it runs under **QEMU emulation** (Docker warns: _"image platform (linux/amd64) does not
match the detected host platform (linux/arm64/v8)"_). It works, but DB-heavy operations are slower
than native. A native multi-arch wal2json image (or building one) would remove that.

---

## What this makes the default (and what it removes)

This branch goes **all-in**: Docker is the only dev path, CI e2e included. That lets the entire host
orchestration be deleted. (The git history shows the intermediate, more conservative option too — the
commit before this one kept a `dev-app:host` fallback for CI; this commit removes it.)

New wiring:

- **`yarn dev-app`** → the Docker stack (was: host-native lazyrepo orchestration). The only dev path.
- **`yarn dev-app:clean` / `:doctor`** → `docker compose down --volumes` / `ps`.
- **Playwright e2e** (local **and CI**) → the Docker stack via the webServer command. The CI workflow
  (`.github/workflows/playwright-dotcom.yml`) drops its host build step; the stack builds in-container.
- **`preview-app`** → `build-app` + the client's own `start` (host vite preview); no longer depends on
  any host backend orchestration.

Deleted — the full host orchestration cluster (~1,000 lines), now that nothing uses it:

| Deleted                                                                        | Lines |
| ------------------------------------------------------------------------------ | ----- |
| `zero-cache/dev.ts` (the orchestrator)                                         | 325   |
| `zero-cache/dev-env.ts`                                                        | ~80   |
| `zero-cache/dev-env.test.ts`                                                   | ~30   |
| `zero-cache/wait-for-dev-readiness.ts`                                         | 69    |
| `zero-cache/dev-clean.ts` + `dev-doctor.ts` + `docker-compose.ts` + `clean.sh` | ~320  |
| `zero-cache/docker/` (host postgres compose + configs)                         | —     |
| `sync-worker/dev.ts`                                                           | 41    |
| Plus the `package.json` dev/clean/doctor/readiness scripts they backed         | —     |

And **#9273 (per-worktree host port blocks) becomes moot** — parallel stacks are separate compose
projects with templated host ports, not renumbered internal ports.

Kept (still needed): `internal/scripts/workers/dev.ts` (the shared worker runner — `bemo-worker`,
`analytics-worker`, and `image-resize-worker` under `yarn dev` still use it on the host),
`zero-cache/migrate.ts` + `migrations/` + `bundle-schema` (schema/deploy), and the zero-cache
fly.io deploy artifacts. The dotcom workers' host `dev` scripts are repointed straight at the shared
runner (no `dev-env` dependency).

> **CI caveat (the least-verified part of this spike).** The `playwright-dotcom.yml` change runs the
> Docker stack in CI. CI runners are linux/amd64, so the wal2json postgres image runs **native** there
> (no emulation — better than Apple Silicon). Secrets already flow (the workflow writes
> `sync-worker/.dev.vars` and passes `VITE_CLERK_PUBLISHABLE_KEY`, which the client service reads). The
> open risks are first-run wall-clock (image build + ~2.6 GB install + boot, hence the 20→30 min
> bump) and that e2e now runs against `vite dev` rather than a production preview build. Treat the CI
> result on this PR as the experiment.

---

## How this compares to #9273

|                              | This spike (full Docker)                         | #9273 (host-native port blocks)              |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------- |
| Where services run           | Containers                                       | Host processes (as today)                    |
| Internal ports               | Fixed conventional ports                         | Renumbered per worktree (100-port block)     |
| Multiple stacks              | Separate compose projects + templated host ports | Contiguous port block per worktree           |
| Inner-loop speed             | Slower (VM file bridge, HMR latency)             | Native, fastest                              |
| Reproducibility / onboarding | Strong (one `up`, no host setup)                 | Depends on host (Node, Docker-for-PG, Clerk) |
| CI parity                    | Strong                                           | Weaker                                       |
| node_modules                 | Extra ~2.3 GB linux copy per stack               | Reuses host install                          |
| Worker service bindings      | Need single-container multi-config               | Work as today                                |
| Net complexity               | Container/volume/FS plumbing                     | Port-offset plumbing                         |

They solve overlapping-but-different problems. #9273 optimizes the **multi-worktree inner loop** for
people already set up. This spike optimizes **reproducibility and onboarding** at a real inner-loop
cost. They are not mutually exclusive: you could keep #9273 as the default and offer this as the
"clean room" / CI target.

## Status — what works vs what's rough

**Verified working**

- workerd / `wrangler dev` in a Linux container, serving requests (native arm64) — including the
  **real sync-worker** config (5 durable objects bound, `Ready on 8787`, serves a routed 404).
- Postgres with `wal_level=logical` + replication slots in a container.
- pgbouncer (env-config) pooling to postgres with scram auth.
- The linux `node_modules` install into a volume (~2.6 GB, ~59 s warm) + `predev` building
  `tldraw.css` in-container.
- **zero-cache end-to-end against a fresh DB**: migrate → initial sync → `Replicating`, with the
  `zero_0*` schemas and `zero_data` publication created in postgres.
- Compose topology validates and the DB + zero tiers come up healthy.

**Built, expected-to-work, not end-to-end verified here**

- Full `docker compose up` of the whole stack with the browser (needs Clerk keys to exercise auth +
  the live multiplayer loop end-to-end). Each tier is verified in isolation; the remaining unknown is
  the browser-facing wiring (see trade-off 4) under real use.
- image-resize + usercontent workers: they boot, but their `SYNC_WORKER` service binding needs the
  multi-config single-container workaround to actually resolve.

**Known rough edges (documented above)**

- Worker→worker service bindings in the one-per-container topology (needs multi-config single
  container).
- The overloaded `MULTIPLAYER_SERVER` var (needs a small `vite.config.ts` change for a clean fix).
- macOS bind-mount HMR latency (inherent to Docker-for-Mac).
- amd64-only wal2json image runs under emulation on Apple Silicon.
- Host port collisions with a running `yarn dev-app` (6432 / 4848 / …).
- Migration→Zero start ordering (found and fixed in the entrypoint; see trade-off 7).
