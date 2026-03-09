# MCP app

This is the tldraw MCP app. It exposes an interactive tldraw canvas to AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/), so agents in Cursor, Claude Desktop, ChatGPT, and VS Code can draw diagrams and shapes on a canvas during a conversation.

## Architecture

The app has two parts: a **server** and a **widget**.

### Server

The server registers MCP tools (`create_shapes`, `update_shapes`, `delete_shapes`, `diagram_drawing_read_me`) and serves the widget HTML as an MCP App resource.

There are two entry points:

- `main.ts` — Node.js stdio transport, for local clients like Claude Desktop and Cursor
- `src/worker.ts` — Cloudflare Workers with a Durable Object (`TldrawMCP`) backed by SQLite for persistent checkpoint storage

Both entry points share tool registration logic in `src/register-tools.ts`.

### Widget

The widget is a React app (`src/widget/mcp-app.tsx`) that renders a full tldraw canvas inside the MCP host's iframe. Vite bundles it into a single HTML file (`dist/mcp-app.html`) using `vite-plugin-singlefile`, which the server injects bootstrap data into before serving.

The widget handles streaming previews (shapes appear as the model streams tool arguments), checkpoint persistence to `localStorage`, and syncing state back to the server.

## Developing

Run all commands from `apps/mcp-app`.

### Package scripts

| Command           | What it does                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| `yarn build`      | Build the widget HTML                                                               |
| `yarn dev`        | Build widget + start local Cloudflare worker (HTTP MCP on `localhost:8787`)         |
| `yarn dev:stdio`  | Start a local stdio MCP server                                                      |
| `yarn dev:tunnel` | Start a Cloudflare tunnel + local worker with `WORKER_ORIGIN` set to the tunnel URL |
| `yarn deploy`     | Build widget + deploy the Cloudflare worker to production                           |

`yarn dev:tunnel` requires the `cloudflared` CLI to be installed on your machine.

### Cursor setup

Add up to three servers in `~/.cursor/mcp.json`:

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
		},
		"tldraw-local-stdio": {
			"command": "yarn",
			"args": [
				"--cwd",
				"<path-to-tldraw-repo>/tldraw/apps/mcp-app",
				"run",
				"-s",
				"tsx",
				"main.ts",
				"--stdio"
			]
		}
	}
}
```

`--cwd` ensures Cursor launches in the app folder. `-s` stops yarn from writing non-JSON noise to stdout, which breaks the stdio transport.

### Claude Desktop setup

Update `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"tldraw": {
			"command": "npx",
			"args": ["-y", "mcp-remote", "https://tldraw-mcp-app.tldraw.workers.dev/mcp"]
		},
		"tldraw-local": {
			"command": "npx",
			"args": ["-y", "mcp-remote", "http://127.0.0.1:8787/mcp"]
		},
		"tldraw-local-stdio": {
			"command": "yarn",
			"args": [
				"--cwd",
				"<path-to-tldraw-repo>/tldraw/apps/mcp-app",
				"run",
				"-s",
				"tsx",
				"main.ts",
				"--stdio"
			]
		}
	}
}
```

### ChatGPT local dev

ChatGPT requires an HTTPS origin, so you need a Cloudflare tunnel. You must be a workspace admin.

1. Run `yarn dev:tunnel` in `apps/mcp-app`
2. It prints a `https://...trycloudflare.com` tunnel URL
3. In ChatGPT web (not the desktop app), go to **Apps** and add your app using that tunnel URL
4. You can then test in both ChatGPT web and the desktop app

`dev:tunnel` automatically wires `WORKER_ORIGIN` to the tunnel URL.

### Iteration loop

1. Make code changes in `apps/mcp-app`
2. Run the relevant script (`dev`, `dev:stdio`, or `dev:tunnel`)
3. Disconnect and reconnect the MCP server in your client (or reload the page/app)
4. When making widget changes, make sure to rebuild — `yarn dev` does this automatically

Reconnecting the server after changes is the most reliable way to pick up new code, especially when the widget HTML changes.

## License

The code in this folder is Copyright (c) 2024-present tldraw Inc. The tldraw SDK is provided under the [tldraw license](https://github.com/tldraw/tldraw/blob/main/LICENSE.md).

## Trademarks

Copyright (c) 2024-present tldraw Inc. The tldraw name and logo are trademarks of tldraw. Please see our [trademark guidelines](https://github.com/tldraw/tldraw/blob/main/TRADEMARKS.md) for info on acceptable usage.

## Contact

Find us on Twitter/X at [@tldraw](https://twitter.com/tldraw).

## Community

Have questions, comments or feedback? [Join our discord](https://discord.tldraw.com/?utm_source=github&utm_medium=readme&utm_campaign=sociallink). For the latest news and release notes, visit [tldraw.dev](https://tldraw.dev).
