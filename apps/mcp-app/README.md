# tldraw MCP app

This is the tldraw MCP app. It exposes an interactive tldraw canvas to AI agents via the [Model Context Protocol app specification](https://github.com/modelcontextprotocol/ext-apps/), so you can work in tldraw with agents in any MCP client that supports the MCP app spec.

## Architecture

The app has two parts: a **server** and a **widget**.

### Server

The server runs in Cloudflare Workers via `src/worker.ts`. The `TldrawMCP` Durable Object is a transport front; every canvas's authoritative state lives in a per-canvas `CanvasStore` Durable Object addressed by `idFromName('canvas:<canvasId>')` — never by MCP session, which hosts do not keep stable. Every exec forks: it resolves the base canvas's latest state (including the user's hand edits), seeds a new canvas from it, and returns the new canvasId, so the chat scrollback is a version history and any canvasId in it is a valid base. See `docs/canvas-persistence-redesign.md` for the full design.

It exposes:

- `search` — query the extracted Editor API spec in a sandboxed dynamic worker
- `exec` — run JavaScript against a canvas; every call produces a new canvas forked from the base
- `get_canvas` — read any canvas's authoritative state and exec job status
- `_pull_job` / `_submit_result` / `_push_user_edit` — app-only transport tools the widget uses (all canvasId-keyed, so host session routing is irrelevant)
- `_get_canvas_state` / `save_checkpoint` / `_exec_callback` — app-only tools kept as live shims for cached old widget builds

### Widget

The widget is a React app (`src/widget/mcp-app.tsx`) that renders a full tldraw canvas inside the MCP host's iframe. Each widget instance is pinned to one canvas for its whole life.

When the AI calls `exec`, the spawned widget reads the base canvasId from its own tool arguments, pulls its invocation's job from the base canvas's Durable Object (`_pull_job`), hydrates the base snapshot, runs the code through a focused editor proxy (`src/widget/focused/`) that translates between an AI-friendly shape format (simple string IDs, flat `_type` shapes) and tldraw's internal `TLShape`/`TLShapeId` types, then submits the result and final state (`_submit_result`), which the server writes to the new canvas and returns from the exec call. The user's manual edits are pushed to the widget's own canvas (`_push_user_edit`) and flushed on teardown.

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
