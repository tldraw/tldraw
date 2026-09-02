# tldraw MCP app

This is the tldraw MCP app. It exposes an interactive tldraw canvas to AI agents via the [Model Context Protocol app specification](https://github.com/modelcontextprotocol/ext-apps/), so you can work in tldraw with agents in any MCP client that supports the MCP app spec.

## Architecture

The app has two parts: a **server** and a **widget**.

### Server

The server runs in Cloudflare Workers via `src/worker.ts`, using a Durable Object (`TldrawMCP`) backed by SQLite for persistent checkpoint storage.

It exposes:

- `search` — query the extracted Editor API spec in a sandboxed dynamic worker
- `exec` — execute JavaScript against the live editor in the widget via a pending-request callback bridge
- `_exec_callback` — app-only tool the widget calls to resolve a pending `exec` request
- `save_checkpoint` / `read_checkpoint` — app-only tools used by the widget for checkpoint persistence

### Widget

The widget is a React app (`src/widget/mcp-app.tsx`) that renders a full tldraw canvas inside the MCP host's iframe.

When the AI calls `exec`, the server creates a pending request and the widget picks it up, runs the code through a focused editor proxy (`src/widget/focused/`) that translates between an AI-friendly shape format (simple string IDs, flat `_type` shapes) and tldraw's internal `TLShape`/`TLShapeId` types, then calls `_exec_callback` to resolve the pending request with the result. Canvas state is checkpointed to the Durable Object's SQLite database and to the browser's local storage.

## Developing

### Prerequisites

The widget build depends on generated files (`editor-api.json`, `method-map.json`) that are extracted from the editor's TypeScript declarations. Before you can develop or build the mcp-app, you need to build the core packages first:

```bash
# from the repo root
yarn build
```

This produces the `.tsbuild/` output that `yarn extract-api` reads from. The `build` and `dev` scripts run `extract-api` automatically, so you don't need to call it separately.

### Package scripts

Run all commands from `apps/mcp-app`.

| Command           | What it does                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| `yarn build`      | Build the widget HTML                                                                                           |
| `yarn dev`        | Build widget + start local Cloudflare worker (HTTP MCP on `localhost:8787`)                                     |
| `yarn dev:tunnel` | Build widget + start a stable named Cloudflare tunnel + local worker with `WORKER_ORIGIN` set to the tunnel URL |
| `yarn deploy`     | Build widget + deploy the Cloudflare worker to production                                                       |

`yarn dev:tunnel` requires the `cloudflared` CLI to be installed on your machine and a one-time `cloudflared tunnel login`. It serves a stable per-user hostname (`<user>-mcp-app-dev.tldraw.xyz`) via a named tunnel, so the URL you register in hosted MCP clients stays the same across runs instead of changing every time. The user slug defaults to `whoami`; override it (or the zone/port) with `MCP_TUNNEL_USER`, `MCP_TUNNEL_ZONE`, and `PORT`. The zone must be a Cloudflare-hosted zone (`tldraw.xyz` is; `tldraw.dev`/`tldraw.com` are on Vercel and won't work).

The worker defaults to production-safe behavior in `wrangler.toml`, including setting `MCP_IS_DEV="false"`. Local HTTP dev scripts override that with `MCP_IS_DEV=true` so local Claude/ChatGPT connectors suppress `ui.domain` while production deployments keep it enabled.

### Cursor setup

Add these two servers in `~/.cursor/mcp.json`:

```json
{
	"mcpServers": {
		"tldraw": {
			"transport": "http",
			"url": "https://tldraw-mcp-app.tldraw.workers.dev/mcp"
		},
		"tldraw-local": {
			"command": "npx",
			"args": ["-y", "mcp-remote", "http://127.0.0.1:8787/mcp"]
		}
	}
}
```

### Claude Desktop local setup

For local Claude Desktop development, use `claude_desktop_config.json` with the local HTTP server:

```json
{
	"mcpServers": {
		"tldraw-local": {
			"command": "npx",
			"args": ["-y", "mcp-remote", "http://127.0.0.1:8787/mcp"]
		}
	}
}
```

### Claude Desktop remote setup

If you'd like to try the remote MCP server in Claude Desktop, use the in-app connector flow rather than adding the production URL to `claude_desktop_config.json`.

1. Open Claude Desktop
2. In the sidebar, go to **Customize**
3. Open **Connectors**
4. Click the button to add a connector, then choose **Add custom connector**
5. Give it a name such as `tldraw`
6. Paste `https://tldraw-mcp-app.tldraw.workers.dev/mcp` as the server URL

The **Add custom connector** option is not available on the free plan, so you may need Max or another paid plan.

If you need Notion access in Claude Desktop, use the Notion MCP connector for that separately.

### ChatGPT local dev

ChatGPT requires an HTTPS origin, so you need a Cloudflare tunnel. You must be an admin of your OpenAI org/workspace to do local dev.

First-time setup (once per machine):

1. Run `cloudflared tunnel login` and choose the `tldraw.xyz` zone

Then, each session:

1. Run `yarn dev:tunnel` in `apps/mcp-app`
2. It serves your stable hostname, e.g. `https://<user>-mcp-app-dev.tldraw.xyz` (the first run also creates the named tunnel and its DNS route)
3. In ChatGPT web (not the desktop app), go to **Apps** and add your app using that URL
4. You can then test in both ChatGPT web and the desktop or mobile apps

Because the hostname is stable per user, you only add the app in ChatGPT once — subsequent `yarn dev:tunnel` runs reuse the same URL.

`dev:tunnel` automatically wires `WORKER_ORIGIN` to the stable tunnel URL and sets `MCP_IS_DEV=true` for the local worker.

### Iteration loop

1. Make code changes in `apps/mcp-app`
2. Run the relevant script (`dev` or `dev:tunnel`)
3. Disconnect and reconnect the MCP server in your client (or reload the page/app)
4. When making widget changes, make sure to rebuild, either by running `yarn build` or rerunning any of the dev scripts.

Reconnecting the server after changes is the most reliable way to pick up new code, especially when the widget HTML changes.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).

## Session storage lifecycle

Each MCP session is a `TldrawMCP` Durable Object. It keeps up to `MAX_CHECKPOINTS` (50) canvas snapshots and destroys itself after `IDLE_TTL_MS` (7 days) without a checkpoint save — a schedule armed in `init()` and re-armed on every check. Sessions created before this shipped never wake on their own; prune them with the admin endpoint.

### Pruning legacy sessions

Everything runs from `apps/mcp-app` on your machine; nothing in CI touches it.

Env vars the scripts read (put them in your shell or a local `.env` you source; all gitignored outputs land in `apps/mcp-app/`):

| Var                     | Used by      | What                                                                                                                               |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | `prune:list` | tldraw's Cloudflare account id (dashboard URL, or `wrangler whoami`)                                                               |
| `CLOUDFLARE_API_TOKEN`  | `prune:list` | API token with **Workers Scripts: Read** on that account; only lists DO namespaces and object ids                                  |
| `MCP_PRUNE_ADMIN_TOKEN` | `prune:run`  | the value you set as the worker secret below; sent as the bearer to `/admin/prune`                                                 |
| `MCP_WORKER_ORIGIN`     | `prune:run`  | optional, defaults to `https://tldraw-mcp-app.tldraw.workers.dev`; point at `http://localhost:8787` to rehearse against `yarn dev` |

Steps:

1. Set the secret once on the worker: `npx wrangler secret put MCP_PRUNE_ADMIN_TOKEN` (needs a Cloudflare login with access to `tldraw-mcp-app`; any long random string, e.g. `openssl rand -hex 32`). It is a worker secret, not a GitHub Actions secret: `.github/workflows/deploy-mcp-app.yml` only runs `wrangler deploy` on pushes to `production`, and worker secrets survive deploys. The endpoint 404s until it exists.
2. `yarn prune:list` → `prune-ids.txt`, one DO id per line for every object with stored data. Takes hours at this scale; run it under `caffeinate -is`. Progress reports position in the id keyspace (ids are hashes, so they arrive sorted and uniformly distributed) with a projected total and ETA. The listing cursor is checkpointed to `prune-list-cursor.txt` after every page, so re-running the same command resumes where it stopped; `--restart` forces a fresh walk. If you ever lose the cursor, `tail -1 prune-ids.txt > prune-list-cursor.txt` rebuilds it (re-fetches at most one page).
3. Smoke-test the round trip on a few ids before committing to a multi-hour run:
   `yarn prune:run --dry-run --limit 1000`. Rows land in `prune-dry-run.jsonl`; check they carry `idleMs`, `checkpointCount`, `bytes` and a sensible `action`.
4. Prune: `yarn prune:run --max-idle 7d`. 7d is the floor, so no `--force`, and it matches the TTL every live session already enforces. One pass, not a staged 30d-then-7d: changing the threshold invalidates the resume offset and re-walks everything, and the ledger gives you the idle distribution as it goes anyway.

   Every result appends to `prune-results.jsonl` — that file is the ledger, with one row per attempt (`id`, `line`, `idleMs`, `checkpointCount`, `bytes`, `action`, or `error`). A line can appear more than once (a resume re-runs whatever was not committed, a sweep supersedes an error); the reported histogram is computed from the ledger at the end of a run, keeping only the last row for each line, so duplicates never inflate it. Progress is checkpointed to `prune-progress.json` as a line offset into `prune-ids.txt`, so a kill or crash resumes and re-does at most a few in-flight batches. The offset is keyed on the pass (`dryRun`, `maxIdleMs`) and the ids file's size, so regenerating or editing `prune-ids.txt` correctly starts over rather than silently skipping ids. Auth, route and validation failures abort the run on the first batch instead of burning through the file; per-id failures are logged as `{ id, error }` rows and set a non-zero exit code.

   Expect roughly 400 ids/s at the default concurrency of 4; `--concurrency 16` or higher shortens a full pass considerably, since the ceiling is Durable Object wake latency rather than the worker.

   Transient `Network connection lost` and `code was updated` faults are retried once inside the endpoint, but a fraction still lands as `{ id, error }` rows, and offset-based resume never revisits them. Sweep them at the end with `yarn prune:run --max-idle 7d --retry-errors`, which re-reads the ledger for ids whose latest row is an error and leaves the offset alone. Repeat until it reports zero. A sweep appends to the end of the ledger, so it only applies to the most recent pass; retrying an older one is refused, since its results would land outside that pass's region.

5. Rotate `MCP_PRUNE_ADMIN_TOKEN` (`npx wrangler secret put MCP_PRUNE_ADMIN_TOKEN` with a new value, or `npx wrangler secret delete MCP_PRUNE_ADMIN_TOKEN`) after the prune; the route stays but it should not keep a live token between runs.

To rehearse locally: `yarn dev` in another shell with `--var MCP_PRUNE_ADMIN_TOKEN:dev-token` added to the `wrangler dev` line (or run `npx wrangler dev --var MCP_PRUNE_ADMIN_TOKEN:dev-token --var MCP_IS_DEV:true`), then `MCP_WORKER_ORIGIN=http://localhost:8787 MCP_PRUNE_ADMIN_TOKEN=dev-token yarn prune:run --dry-run` against a hand-written `prune-ids.txt` (get ids from `GET /admin/do-id?session=<mcp-session-id>`, dev-only). `prune-integration.test.ts` does this end to end.

### Ops endpoints

All take the same `MCP_PRUNE_ADMIN_TOKEN` bearer and 404 when it is unset.

| Route                 | Purpose                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/prune`   | `{ ids, maxIdleMs, dryRun, force }` — condemn idle objects; the prune script's backend                                                                          |
| `POST /admin/inspect` | `{ ids }` — what an object actually holds: `bytes`, `tables`, `appTables`, `wiped`, `destroyPending`, `alarm`                                                   |
| `POST /admin/wipe`    | `{ ids, mode }` — tear down now by strategy: `sdk` (SDK destroy, isolate abort), `quiet` (abort defused, normal shutdown), `raw` (deleteAlarm + deleteAll only) |
| `GET /admin/config`   | the constants and overrides actually deployed                                                                                                                   |

`inspect` is the way to confirm a teardown landed. Any RPC wakes the object and the agents SDK's constructor recreates its own schema, so `bytes` never returns to zero and the SDK tables are always present — **`appTables` is the signal**: `checkpoints`/`meta` exist only if the session's own data survived. An intact object reports ~152 KB with three app tables; a wiped one reports ~120 KB with none.

`wipe` exists so the teardown strategies can be compared in production without a deploy each: Cloudflare reclaims an object only when "it shuts down [and] its storage is empty", and an isolate abort is not a shutdown.

Expect the `destroyed` error fingerprint in Workers observability to spike during a prune (one event per wiped DO — the SDK's teardown abort) and `session_start` to stay flat; if `session_start` during the run exceeds roughly 1% of condemns, stop the run: condemned DOs are being resurrected.
