# tldraw MCP app

This is the tldraw MCP app. It exposes an interactive tldraw canvas to AI agents via the [Model Context Protocol app specification](https://github.com/modelcontextprotocol/ext-apps/), so you can work in tldraw with agents in any MCP client that supports the MCP app spec.

## Architecture

The app has two parts: a **server** and a **widget**.

### Server

The server runs in Cloudflare Workers via `src/worker.ts`, using a Durable Object (`TldrawMCP`) backed by SQLite for persistent checkpoint storage.

It exposes:

- `search` — query the extracted Editor API spec in a sandboxed worker
- `exec` — execute JavaScript against the live editor in the widget
- `save_checkpoint` / `read_checkpoint` — app-only support tools used by the widget

### Widget

The widget is a React app (`src/widget/mcp-app.tsx`) that renders a full tldraw canvas inside the MCP host's iframe.

The widget executes `exec` code against the live editor, syncs the resulting canvas state back to the server, and keeps the model context updated with raw `TLShape`, asset, and binding data.

## Developing

Run all commands from `apps/mcp-app`.

### Package scripts

| Command           | What it does                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| `yarn build`      | Build the widget HTML                                                                              |
| `yarn dev`        | Build widget + start local Cloudflare worker (HTTP MCP on `localhost:8787`)                        |
| `yarn dev:tunnel` | Build widget + start a Cloudflare tunnel + local worker with `WORKER_ORIGIN` set to the tunnel URL |
| `yarn deploy`     | Build widget + deploy the Cloudflare worker to production                                          |

`yarn dev:tunnel` requires the `cloudflared` CLI to be installed on your machine.

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

1. Run `yarn dev:tunnel` in `apps/mcp-app`
2. It prints a `https://...trycloudflare.com` tunnel URL
3. In ChatGPT web (not the desktop app), go to **Apps** and add your app using that tunnel URL
4. You can then test in both ChatGPT web and the desktop or mobile apps

`dev:tunnel` automatically wires `WORKER_ORIGIN` to the tunnel URL and sets `MCP_IS_DEV=true` for the local worker.

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
