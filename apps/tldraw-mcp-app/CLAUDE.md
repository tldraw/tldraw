# Tldraw MCP App

An MCP server that lets AI assistants (Claude, ChatGPT) create and manipulate diagrams on a tldraw infinite canvas. It exposes tldraw drawing capabilities as MCP tools and serves an embedded React widget that renders the canvas inline within AI chat interfaces.

## Useful docs

- https://github.com/modelcontextprotocol/ext-apps (MCP apps repo)
- https://modelcontextprotocol.io/extensions/apps/overview (MCP apps overview docs page)
- https://github.com/excalidraw/excalidraw-mcp/ (a reference implementation to take inspiration from)

## Architecture

```
AI Client (Claude/ChatGPT)
  → MCP Transport (HTTP / SSE)
    → Cloudflare Worker (src/cloudflare-worker.ts)
      → registerTools() (src/register-tools.ts)
        → React Widget (src/widget/mcp-app.tsx)
```

### Entry point

- **`src/cloudflare-worker.ts`** — Cloudflare Workers entry point. Uses Durable Objects for state persistence (SQLite) and R2 for image storage. Endpoints: `/mcp`, `/sse`, `/images/*`.

### Key modules

- **`src/register-tools.ts`** — Registers all MCP tools (create_shapes, update_shapes, delete_shapes, create_image, read_me, read_checkpoint, save_checkpoint).
- **`src/focused-shape.ts`** — Converts between `FocusedShape` (simplified AI-friendly JSON) and `TLShape` (tldraw internal format).
- **`src/parse-json.ts`** — JSON parser with "healing" for malformed LLM outputs (extra quotes, trailing commas, etc.).
- **`src/widget/mcp-app.tsx`** — React app that renders the interactive tldraw canvas widget, syncs with checkpoints, supports fullscreen mode, and integrates Clerk authentication for image upload gating.

### Checkpoint system

State management is checkpoint-based:

- Each tool call creates a new checkpoint (UUID) storing `{ shapes, assets }`.
- The widget reads/writes checkpoints via `read_checkpoint`/`save_checkpoint` (app-only tools).
- Cloudflare uses SQLite in Durable Objects for checkpoint persistence.

## Development

### Scripts

- `yarn dev` — Build widget + run Cloudflare Workers locally (port 8787)
- `yarn dev:tunnel` — Cloudflared tunnel + wrangler dev (for remote testing)
- `yarn build` — Build the widget (Vite → single HTML file at `dist/mcp-app.html`)
- `yarn deploy` — Build widget + deploy to Cloudflare Workers

### Tech stack

- **Vite** + **vite-plugin-singlefile** to bundle the widget into a single HTML file
- **React 18** + **tldraw** for the canvas widget
- **@modelcontextprotocol/sdk** + **@modelcontextprotocol/ext-apps** for MCP protocol
- **@clerk/clerk-react** for authentication (image upload gating)
- **zod** for schema validation
- **Cloudflare Workers** (Durable Objects + R2) for production deployment
