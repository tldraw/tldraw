# tldraw-mcp-cloudflare spike log

## What this is

Step 1 spike from `mcp-deployed-server-plan.md` — prove McpAgent + ext-apps + Assets binding work together on Cloudflare Workers.

## Status

**Steps 1-3 PASSED.** All tools ported, images working, auth in place. Ready for deployment testing.

## Spike results

| Goal | Status | Notes |
|------|--------|-------|
| McpAgent works as DO with `this.server` (McpServer) | PASS | SSE + Streamable HTTP transports both exposed |
| `registerAppResource` from ext-apps works with `this.server` | PASS | Widget resource registered successfully |
| Widget HTML loads via Assets binding | PASS | `this.env.ASSETS.fetch()` serves 3.4MB single-file HTML |
| DO SQLite checkpoint round-trip | PASS | `this.sql` template tag, save + read verified via Inspector |
| Cross-directory imports from `../../tldraw-mcp-app/src/` | PASS | wrangler esbuild resolves them fine |
| `tldraw` runtime imports bundle correctly | PASS | `create_shapes` calls `convertFocusedShapeToTldrawRecord` → `toRichText` successfully |

## Issues found and resolved

### 1. Mixed Zod versions (RESOLVED)

**Problem:** wrangler's esbuild resolves `import { z } from 'zod'` to different physical files depending on which directory the importing file lives in:
- `tldraw-mcp-cloudflare/node_modules/zod@4.3.6` (workspace)
- Root `node_modules/zod@4.1.12` (hoisted from other monorepo packages)
- `agents/node_modules/@modelcontextprotocol/sdk` (v1.26.0) also imports zod separately from our direct `@modelcontextprotocol/sdk` (v1.27.0)

The MCP SDK's `zod-compat.ts` does an identity check on Zod's internal symbols — two module instances fail that check, producing "Mixed Zod versions detected in object shape."

**Fix:** `[alias]` in `wrangler.toml` forces all `zod` and `@modelcontextprotocol/sdk` subpath imports to resolve to a single location:

```toml
[alias]
"zod" = "./node_modules/zod"
"@modelcontextprotocol/sdk/server/mcp.js" = "./node_modules/agents/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js"
"@modelcontextprotocol/sdk/types.js" = "./node_modules/agents/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js"
```

This is scoped to wrangler's esbuild only — doesn't affect other monorepo packages.

**Note:** The bundle still has two Zod copies (from `@modelcontextprotocol/ext-apps` pulling through a different path), but the critical path (our `z.object()` → SDK's `objectFromShape()`) now uses the same instance, so the error is gone.

### 2. McpAgent.serve() must own the fetch handler (RESOLVED)

**Problem:** Initially wrapped `McpAgent.serve('/mcp').fetch()` inside a custom fetch handler that intercepted routes. This broke:
- Session management (`Mcp-Session-Id` header errors)
- CORS handling (double-wrapping headers)
- Accept header validation (`text/event-stream` errors)

**Fix:** Per Cloudflare docs, `McpAgent.serve('/mcp')` returns a `{ fetch }` handler that should own routing. The pattern is:

```ts
const mcpHandler = TldrawMCP.serve('/mcp')
const sseHandler = TldrawMCP.serveSSE('/sse')
export default {
  async fetch(request, env, ctx) {
    if (url.pathname === '/health') return new Response('OK')
    if (url.pathname.startsWith('/images/')) { /* R2 serving */ }
    if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
      return sseHandler.fetch(request, env, ctx)
    }
    return mcpHandler.fetch(request, env, ctx)
  },
}
```

**Source:** https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/

### 3. MCP Inspector requires SSE transport (RESOLVED)

**Problem:** MCP Inspector v0.15.0 uses SSE transport (GET-based). The Streamable HTTP transport requires `Accept: text/event-stream` and `Mcp-Session-Id` headers that the Inspector proxy doesn't forward.

**Fix:** Expose both transports:
- `/mcp` → Streamable HTTP (for Claude web and modern clients)
- `/sse` → SSE (for MCP Inspector and legacy clients)

Use `McpAgent.serveSSE('/sse')` alongside `McpAgent.serve('/mcp')`.

### 4. Widget vite build needs resolve aliases (RESOLVED)

**Problem:** Copied widget files (`mcp-app.tsx`) import from `../focused-shape` and `../parse-json` — relative to `src/widget/`. In the cloudflare project, there's no `src/focused-shape.ts`.

**Fix:** `vite.config.ts` uses `resolve.alias` to redirect those imports to `tldraw-mcp-app/src/`:

```ts
const mcpAppSrc = path.resolve(__dirname, '../tldraw-mcp-app/src')
resolve: {
  alias: {
    '../focused-shape': path.join(mcpAppSrc, 'focused-shape'),
    '../parse-json': path.join(mcpAppSrc, 'parse-json'),
  },
}
```

### 5. `process.env.TLDRAW_MCP_JSON_HEALING_DEBUG` (RESOLVED)

**Problem:** `parse-json.ts` references `process.env.TLDRAW_MCP_JSON_HEALING_DEBUG`. Workers don't have `process.env`.

**Fix:** `[define]` in `wrangler.toml`:
```toml
[define]
"process.env.TLDRAW_MCP_JSON_HEALING_DEBUG" = "undefined"
```

### 6. TypeScript dual SDK types (RESOLVED)

**Problem:** Our direct `@modelcontextprotocol/sdk` (1.27.0) and agents' bundled copy (1.26.0) have incompatible `McpServer` types. TypeScript errors on `server = new McpServer(...)` because agents expects its SDK's `McpServer` type.

**Fix:** `server = new McpServer(...) as any` — the alias makes them the same module at runtime, but TS sees different declarations. Also use `(this as any).env` for accessing the environment since `McpAgent<Env>` generic doesn't expose `.env` in the type definitions of agents v0.5.1.

### 7. `this.server.tool()` vs `this.server.registerTool()` (RESOLVED)

**Problem:** `this.server.tool()` with object-style config (title, inputSchema, _meta) didn't match the overload signatures from our SDK types.

**Fix:** Use `this.server.registerTool()` for tools with object-style config (matching the pattern in the original `server.ts`). Use `this.server.tool()` only for simple tools with positional args (name, description, schema, handler).

## Architecture decisions

### Cross-directory imports vs copying

Shared code (`focused-shape.ts`, `parse-json.ts`, `read-me.ts`) is imported directly from `../../tldraw-mcp-app/src/` — not copied. This avoids duplication. wrangler's esbuild handles cross-directory resolution fine.

Widget files (`index.html`, `mcp-app.tsx`) are copied because they need their own vite build entry point.

### Checkpoint storage: DO SQLite

Uses `this.sql` template tag (NOT `this.ctx.storage.sql`). Requires `new_sqlite_classes` migration in `wrangler.toml`. Tables: `checkpoints` (id, data, created_at) and `meta` (key, value).

### Dual transport: SSE + Streamable HTTP

- `/sse` — SSE transport via `McpAgent.serveSSE('/sse')` for Inspector and legacy clients
- `/mcp` — Streamable HTTP via `McpAgent.serve('/mcp')` for Claude web and modern clients

Both routes to the same `TldrawMCP` Durable Object class.

## Files created

```
apps/tldraw-mcp-cloudflare/
├── package.json          # deps: agents, ext-apps, sdk, zod, @cloudflare/workers-types
├── wrangler.toml         # DO, Assets, R2, aliases, defines
├── tsconfig.json         # ES2022, bundler resolution, CF worker types
├── vite.config.ts        # widget build with resolve aliases
├── log.md                # this file
├── dist/mcp-app.html     # built widget (3.4MB single-file)
├── src/
│   ├── index.ts          # McpAgent DO + fetch handler
│   └── widget/
│       ├── index.html    # copied from tldraw-mcp-app
│       └── mcp-app.tsx   # copied from tldraw-mcp-app
```

## How the Node.js HTTP Streamable server relates to this Cloudflare Worker

After a rebase, `tldraw-mcp-app` now supports two transports:
- **stdio** (`--stdio` flag) — classic MCP transport via stdin/stdout
- **HTTP Streamable** (default) — `createMcpExpressApp()` + `StreamableHTTPServerTransport` on Express

The HTTP Streamable server (`main.ts`) was verified to work with **cloudflared tunnels + ChatGPT**.

### Comparison

| Aspect | Node.js (`main.ts`) | Cloudflare Worker (`index.ts`) |
|--------|---------------------|-------------------------------|
| MCP server | `createServer()` factory | `McpServer` in `McpAgent.init()` |
| HTTP transport | `StreamableHTTPServerTransport` + Express | `McpAgent.serve('/mcp')` (built-in) |
| SSE transport | Not exposed | `McpAgent.serveSSE('/sse')` |
| Session management | `Map<string, StreamableHTTPServerTransport>` | Durable Object (one DO per session) |
| Checkpoint storage | In-memory `Map<string, TLShape[]>` | DO SQLite (`this.sql`) |
| Persistence | Lost on restart | Survives restarts (SQLite) |
| Widget serving | Not applicable (widget in MCP resource) | Assets binding (`this.env.ASSETS`) |
| Process model | Single Node.js process | Edge (DO per session, auto-scaled) |

### Key insight

Both are parallel implementations of the same MCP server. The Cloudflare Worker replaces:
1. Express routing → `McpAgent.serve()` / `serveSSE()`
2. In-memory Map → DO SQLite
3. `createServer()` factory → `McpAgent.init()` method

The `server.ts` tool definitions (schemas, handlers, converters) are shared via cross-directory imports — no duplication needed. The only things copied are small helpers (`isPlainObject`, `parseTlShapes`, `errorResponse`, `generateCheckpointId`) that could be extracted to a shared module in Step 2.

### Widget updated after rebase

The `mcp-app.tsx` widget gained zoom-to-fit functionality (`zoomToFitRequestShapes`, `Box`, `TLShapeId` imports, `requestShapeIdsRef`). The copied widget in `tldraw-mcp-cloudflare/src/widget/` has been updated to match.

## DO SQLite row size analysis

Concern: DO SQLite has a 2MB max row size. Checkpoint data is stored as a single JSON blob in the `data` column.

| Shapes | Checkpoint size | % of 2MB limit |
|--------|----------------|----------------|
| 50     | ~24 KB         | 1.2%           |
| 200    | ~96 KB         | 4.7%           |
| 500    | ~240 KB        | 11.7%          |
| 1000   | ~480 KB        | 23.4%          |
| 2000   | ~961 KB        | 46.9%          |

Single TLShape record: ~492 bytes. Max shapes in 2MB: ~4,262.
Typical diagrams are <100 shapes. No risk for realistic use cases.

## Step 2+3 results (shape tools + images + auth)

All 8 tools registered and verified via curl:

| Tool | Type | Status |
|------|------|--------|
| `read_me` | LLM-facing | PASS |
| `create_shapes` | LLM-facing (app tool) | PASS — tldraw runtime imports work |
| `update_shapes` | LLM-facing (app tool) | PASS |
| `delete_shapes` | LLM-facing (app tool) | PASS |
| `read_checkpoint` | App-only | PASS |
| `save_checkpoint` | App-only | PASS |
| `upload_image` | App-only | PASS — base64 → R2, serves at /images/ |
| `create_image` | LLM-facing (app tool) | PASS — creates image shape with url prop |

Auth: Bearer token checked when `MCP_AUTH_TOKEN` env var is set. Skipped in local dev.
CORS: Preflight handler + headers on all responses.

### Image notes

- `create_image` sets `url` directly on the image shape with `assetId` pointing to a server-side asset record
- `assetRecords` returned in `structuredContent` — widget would need to handle these for full image rendering
- R2 serves images at `/images/uuid.ext` with immutable caching and CORS

## Testing commands

```bash
# Build + start
cd apps/tldraw-mcp-cloudflare
yarn build:widget && npx wrangler dev --port 8788

# Health check
curl http://localhost:8788/health

# MCP Inspector (use SSE transport)
npx @modelcontextprotocol/inspector
# In UI: Transport = SSE, URL = http://localhost:8788/sse
# Add proxy session token from terminal output to Configuration > Proxy Session Token
```
