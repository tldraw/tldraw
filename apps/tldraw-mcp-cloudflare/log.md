# tldraw-mcp-cloudflare spike log

## What this is

Step 1 spike from `mcp-deployed-server-plan.md` — prove McpAgent + ext-apps + Assets binding work together on Cloudflare Workers.

## Status

**Steps 1-3 PASSED.** All tools ported, images working, auth in place. Claude Desktop tested successfully with MCP Apps (widget renders inline). Image persistence across reloads working via asset records in checkpoints.

## Spike results

| Goal                                                         | Status | Notes                                                                                 |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------- |
| McpAgent works as DO with `this.server` (McpServer)          | PASS   | SSE + Streamable HTTP transports both exposed                                         |
| `registerAppResource` from ext-apps works with `this.server` | PASS   | Widget resource registered successfully                                               |
| Widget HTML loads via Assets binding                         | PASS   | `this.env.ASSETS.fetch()` serves 3.4MB single-file HTML                               |
| DO SQLite checkpoint round-trip                              | PASS   | `this.sql` template tag, save + read verified via Inspector                           |
| Cross-directory imports from `../../tldraw-mcp-app/src/`     | PASS   | wrangler esbuild resolves them fine                                                   |
| `tldraw` runtime imports bundle correctly                    | PASS   | `create_shapes` calls `convertFocusedShapeToTldrawRecord` → `toRichText` successfully |

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
		if (url.pathname.startsWith('/images/')) {
			/* R2 serving */
		}
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

**Problem:** `this.server.tool()` with object-style config (title, inputSchema, \_meta) didn't match the overload signatures from our SDK types.

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

| Aspect             | Node.js (`main.ts`)                          | Cloudflare Worker (`index.ts`)      |
| ------------------ | -------------------------------------------- | ----------------------------------- |
| MCP server         | `createServer()` factory                     | `McpServer` in `McpAgent.init()`    |
| HTTP transport     | `StreamableHTTPServerTransport` + Express    | `McpAgent.serve('/mcp')` (built-in) |
| SSE transport      | Not exposed                                  | `McpAgent.serveSSE('/sse')`         |
| Session management | `Map<string, StreamableHTTPServerTransport>` | Durable Object (one DO per session) |
| Checkpoint storage | In-memory `Map<string, TLShape[]>`           | DO SQLite (`this.sql`)              |
| Persistence        | Lost on restart                              | Survives restarts (SQLite)          |
| Widget serving     | Not applicable (widget in MCP resource)      | Assets binding (`this.env.ASSETS`)  |
| Process model      | Single Node.js process                       | Edge (DO per session, auto-scaled)  |

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
| ------ | --------------- | -------------- |
| 50     | ~24 KB          | 1.2%           |
| 200    | ~96 KB          | 4.7%           |
| 500    | ~240 KB         | 11.7%          |
| 1000   | ~480 KB         | 23.4%          |
| 2000   | ~961 KB         | 46.9%          |

Single TLShape record: ~492 bytes. Max shapes in 2MB: ~4,262.
Typical diagrams are <100 shapes. No risk for realistic use cases.

## Step 2+3 results (shape tools + images + auth)

All 8 tools registered and verified via curl:

| Tool              | Type                  | Status                                   |
| ----------------- | --------------------- | ---------------------------------------- |
| `read_me`         | LLM-facing            | PASS                                     |
| `create_shapes`   | LLM-facing (app tool) | PASS — tldraw runtime imports work       |
| `update_shapes`   | LLM-facing (app tool) | PASS                                     |
| `delete_shapes`   | LLM-facing (app tool) | PASS                                     |
| `read_checkpoint` | App-only              | PASS                                     |
| `save_checkpoint` | App-only              | PASS                                     |
| `upload_image`    | App-only              | PASS — base64 → R2, serves at /images/   |
| `create_image`    | LLM-facing (app tool) | PASS — creates image shape with url prop |

Auth: Bearer token checked when `MCP_AUTH_TOKEN` env var is set. Skipped in local dev.
CORS: Preflight handler + headers on all responses.

### Image notes

- `create_image` sets `url` directly on the image shape with `assetId` pointing to a server-side asset record
- `assetRecords` returned in `structuredContent` — widget would need to handle these for full image rendering
- R2 serves images at `/images/uuid.ext` with immutable caching and CORS

## Claude Desktop integration

### Setup

Claude Desktop supports MCP Apps (ext-apps widgets). Config at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"tldraw": {
			"command": "npx",
			"args": ["-y", "mcp-remote", "https://<tunnel>.trycloudflare.com/mcp"]
		}
	}
}
```

Use `mcp-remote` to proxy the remote HTTP MCP server to stdio transport. Requires Node 20+ (Claude Desktop scans `~/.nvm/versions/node/` alphabetically — remove v16/v18 if present, or clear stale npx cache at `~/.npm/_npx/`).

### Local dev with tunnel

`yarn dev:tunnel` starts cloudflared + wrangler together. The tunnel gives a public HTTPS URL so the widget iframe (hosted on `claudemcpcontent.com`) can fetch R2 images. The tunnel URL changes each restart — update `claude_desktop_config.json` accordingly.

### Issues found and resolved

#### 8. Image persistence across reloads (RESOLVED)

**Problem:** Pasted images broke on widget reload. Checkpoints only saved shapes, not asset records. Image shapes reference assets via `assetId` — without the asset record (containing `src` URL), tldraw can't render the image.

**Fix:**

- Server: `saveCheckpoint()` now stores `{ shapes, assets }` instead of plain shape array. `loadCheckpoint()` returns both with backwards compat for old format.
- Server: `save_checkpoint` tool accepts optional `assetsJson` parameter.
- Widget: `saveCheckpointToServer()` sends `editor.getAssets()` alongside shapes.
- Widget: `applySnapshot()` restores asset records into editor store before creating shapes.
- Widget: localStorage persistence updated to store `{ shapes, assets }`.
- Widget: `ontoolresult` handler tracks assets through the full flow.

#### 9. CSP blocks image fetches from tunnel domain (RESOLVED)

**Problem:** Widget iframe runs on `claudemcpcontent.com`. Images stored in R2 are served via the tunnel URL. The MCP App CSP only allowed `cdn.tldraw.com` — the tunnel domain was blocked.

**Fix:** Dynamically add `WORKER_ORIGIN` to both `resourceDomains` and `connectDomains` in the widget resource CSP:

```ts
resourceDomains: [
  'https://cdn.tldraw.com',
  ...((this as any).env.WORKER_ORIGIN ? [(this as any).env.WORKER_ORIGIN] : []),
],
connectDomains: [
  'https://cdn.tldraw.com',
  ...((this as any).env.WORKER_ORIGIN ? [(this as any).env.WORKER_ORIGIN] : []),
],
```

#### 10. WORKER_ORIGIN needed for absolute image URLs (RESOLVED)

**Problem:** Widget runs in an iframe where relative URLs (`/images/uuid.png`) can't resolve to the worker. Need absolute URLs.

**Fix:** `WORKER_ORIGIN` env var in `wrangler.toml` (default `http://localhost:8787`). `upload_image` handler constructs absolute URLs: `` `${origin}/${key}` ``. For tunnel dev, `dev-tunnel.sh` passes `--var WORKER_ORIGIN:$TUNNEL_URL`.

## Review against plan (mcp-deployed-server-plan.md)

Cross-referencing the implementation against the original plan's review findings and risk mitigations.

### Plan review finding status

| #   | Finding                                                     | Status       | Notes                                                                                                                                                    |
| --- | ----------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Use `wrangler.toml` not `.jsonc`                            | DONE         | Using `.toml` matching repo convention                                                                                                                   |
| 2   | `getActiveShapes()` must return `TLShape[]`                 | DONE         | Calls `parseTlShapes()` on `checkpoint.shapes`                                                                                                           |
| 3   | `tldraw` package in Worker bundle — biggest risk            | PASS         | esbuild tree-shakes successfully. Bundle includes only needed exports (`toRichText`, `createShapeId`, color constants). No browser API errors at runtime |
| 4   | Zod version deduplication                                   | DONE         | `[alias]` in `wrangler.toml` forces single copy (see issue #1 above)                                                                                     |
| 5   | `structuredClone` — only in server.ts                       | DONE         | Using Workers global directly, not importing from tldraw                                                                                                 |
| 6   | Tool handler input types                                    | DONE         | Explicit `z.infer<>` types for all input schemas                                                                                                         |
| 7   | Missing `read_checkpoint`/`save_checkpoint` handler details | DONE         | Full implementations with FocusedShape conversion and asset support                                                                                      |
| 8   | R2 Cache API not implemented in skeleton                    | **NOT DONE** | `handleImageRequest` goes straight to R2 without `caches.default`. Should add for production (reduces R2 reads for repeated image loads)                 |
| 9   | No `preview_bucket_name` for R2                             | DEFERRED     | Local dev uses wrangler's R2 simulator. Add `preview_bucket_name` post-launch if needed                                                                  |
| 10  | Workspace registration is automatic                         | CONFIRMED    | Root `package.json` `"workspaces": ["apps/*"]` picks it up                                                                                               |

### Plan step completion

| Step | Goal                            | Status                                     |
| ---- | ------------------------------- | ------------------------------------------ |
| 1    | Scaffold + prove McpAgent works | DONE                                       |
| 2    | Port all shape tools            | DONE                                       |
| 3    | Add images + auth               | DONE (plus asset persistence, CSP, tunnel) |
| 4    | Deploy + smoke test             | **NEXT**                                   |

### Deviations from plan

1. **Checkpoint format changed** — Plan had `saveCheckpoint(id, shapes: unknown[])`. Implementation stores `{ shapes, assets }` to support image persistence across reloads.
2. **`loadCheckpoint` returns structured object** — Returns `{ shapes: unknown[], assets: unknown[] }` with backwards compat for old plain-array format.
3. **`getActiveAssets()` added** — Not in plan. Needed for asset persistence.
4. **CSP is dynamic** — Plan had static `resourceDomains`. Implementation dynamically adds `WORKER_ORIGIN` for tunnel/production image serving.
5. **Dual transport (SSE + HTTP)** — Plan only mentioned `/mcp`. Added `/sse` for MCP Inspector compatibility (issue #3).
6. **`dev-tunnel.sh` added** — Not in plan. Needed for Claude Desktop testing since widget iframe can't reach localhost.
7. **`save_checkpoint` accepts `assetsJson`** — Not in plan. Needed for image persistence.

## Review against MCP Apps guide

Cross-referencing the implementation against the MCP_APPS_GUIDE.md best practices and production checklist.

### Server checklist

| Item                                                           | Status | Notes                                                    |
| -------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| Tool declarations include `_meta.ui.resourceUri`               | DONE   | All LLM-facing tools link to `CANVAS_RESOURCE_URI`       |
| Resource handler serves bundled HTML with `RESOURCE_MIME_TYPE` | DONE   | `registerAppResource` with `RESOURCE_MIME_TYPE` constant |
| All debug output uses `console.error()`                        | DONE   | No `console.log()` in worker code                        |
| Input validation with Zod schemas on all tool inputs           | DONE   | All 8 tools have Zod schemas                             |
| Error responses return `{ isError: true, content: [...] }`     | DONE   | Via `errorResponse()` helper                             |
| App-only tools use `_meta.ui.visibility: ['app']`              | DONE   | `read_checkpoint`, `save_checkpoint`, `upload_image`     |
| Both `content` and `structuredContent` returned                | DONE   | All app tools return both                                |
| State persistence beyond in-memory                             | DONE   | DO SQLite via `this.sql`                                 |

### Widget checklist

| Item                                                | Status       | Notes                                                   |
| --------------------------------------------------- | ------------ | ------------------------------------------------------- |
| `app.connect()` called on initialization            | DONE         | In `mcp-app.tsx`                                        |
| `app.ontoolresult` handles incoming tool results    | DONE         | Full implementation with assets                         |
| `app.ontoolinputpartial` handles streaming previews | DONE         | Partial JSON healing                                    |
| `app.ontoolcancelled` reverts preview state         | DONE         | Reverts to pre-preview snapshot                         |
| `app.onteardown` cleans up resources                | DONE         |                                                         |
| `app.updateModelContext()` pushes state to model    | DONE         | Sends current shapes back                               |
| localStorage fallback for state recovery            | DONE         | `loadLocalSnapshot`/`saveLocalSnapshot`                 |
| `IntersectionObserver` pauses when offscreen        | **NOT DONE** | Could add for performance                               |
| Error boundaries catch errors                       | PARTIAL      | Debug panel catches errors, but no React error boundary |
| Debug panel for development                         | DONE         | `log()` function + debug overlay                        |

### Build checklist

| Item                                      | Status | Notes                                                             |
| ----------------------------------------- | ------ | ----------------------------------------------------------------- |
| `vite-plugin-singlefile` bundles widget   | DONE   | 3.4MB single-file HTML                                            |
| Build script produces `dist/mcp-app.html` | DONE   | `yarn build:widget`                                               |
| CSP configured for external domains       | DONE   | `resourceDomains` + `connectDomains` with dynamic `WORKER_ORIGIN` |
| `package.json` has `"type": "module"`     | DONE   |                                                                   |
| TypeScript compiles cleanly               | DONE   | With `as any` workarounds for dual SDK types                      |

### Deployment (HTTP / remote) checklist

| Item                            | Status | Notes                                |
| ------------------------------- | ------ | ------------------------------------ |
| Streamable HTTP endpoint        | DONE   | `McpAgent.serve('/mcp')`             |
| SSE endpoint                    | DONE   | `McpAgent.serveSSE('/sse')`          |
| Session management              | DONE   | Durable Objects handle this          |
| CORS middleware                 | DONE   | Preflight handler + `corsResponse()` |
| HTTPS/TLS                       | DONE   | Cloudflare handles this              |
| Authentication on HTTP endpoint | DONE   | Bearer token via `MCP_AUTH_TOKEN`    |
| Health check endpoint           | DONE   | `/health` returns 200                |
| R2 image serving                | DONE   | `/images/*` with immutable caching   |

### Gaps identified from guide

1. **R2 Cache API** — Guide's Route C section and plan review finding #8 both recommend `caches.default` for R2 reads. Not implemented yet. Low priority for initial deploy (R2 egress is free), but worth adding.
2. **`IntersectionObserver`** — Guide recommends pausing expensive rendering when widget scrolls offscreen. Not implemented. Low priority unless performance issues arise.
3. **React error boundary** — Guide recommends error boundaries in widget. Only debug panel catches errors currently.
4. **OAuth** — Guide covers GitHub OAuth via `agents/oauth`. Current auth is simple Bearer token. Sufficient for initial deploy, could upgrade to OAuth later.
5. **Rate limiting** — Guide mentions Cloudflare dashboard rate limiting. Not configured yet. Auth token provides access control for now.
6. **Custom domain for images** — Guide mentions dedicated image host domain. Using worker domain for now, could add custom domain later.

## Step 4 preparation (deploy + smoke test)

### Pre-deploy tasks

1. **Clean up debug logging** — Remove `console.error` debug lines in `save_checkpoint` handler (lines 443-445, 450-452 of `index.ts`). Keep error logging, remove verbose debug.
2. **Set `WORKER_ORIGIN` for production** — Update to deployed worker URL (e.g., `https://tldraw-mcp-cloudflare.<account>.workers.dev`).
3. **CSP for production** — `WORKER_ORIGIN` dynamic addition handles this automatically.
4. **(Optional) Add R2 Cache API** — Would reduce R2 reads for repeated image loads.

### Deploy commands

```bash
# Create R2 bucket (if not already created)
npx wrangler r2 bucket create tldraw-mcp-images

# Set production auth token
npx wrangler secret put MCP_AUTH_TOKEN

# Deploy
cd apps/tldraw-mcp-cloudflare
yarn deploy
```

### Post-deploy verification

```bash
# Health check
curl https://tldraw-mcp-cloudflare.<account>.workers.dev/health
# Expected: 200

# Auth check
curl -s -o /dev/null -w "%{http_code}" https://tldraw-mcp-cloudflare.<account>.workers.dev/mcp
# Expected: 401

# MCP Inspector against deployed URL
npx @modelcontextprotocol/inspector
# Transport = SSE, URL = https://tldraw-mcp-cloudflare.<account>.workers.dev/sse
# Expected: all 8 tools listed

# Claude web Custom Connector
# Settings > Connectors > Add Custom Connector
# URL: https://tldraw-mcp-cloudflare.<account>.workers.dev/mcp
# Token: <production-token>
```

## Step 5: Security hardening (pre-production)

Addresses all 6 risks identified during code review. Approach validated against the [MCP Authorization spec](https://modelcontextprotocol.io/docs/tutorials/security/authorization), [community best practices](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1247), [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/changelog/2025-09-19-ratelimit-workers-ga/), and tldraw.com's production asset handling (`packages/worker-shared/src/userAssetUploads.ts`).

### Comparison with Excalidraw MCP server

[excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp/) is deployed publicly at `mcp.excalidraw.com` with **zero authentication, zero rate limiting, and full open CORS**. They can afford this because:

1. **Stateless rendering service** — the server takes Excalidraw JSON elements and renders SVGs. No persistent user data, no accounts, no secrets.
2. **No image/asset uploads** — elements are JSON only, no file storage. Input capped at 5MB.
3. **No destructive capabilities** — two tools (`read_me`, `create_view`) are purely generative.
4. **Ephemeral state** — checkpoints are temporary (30-day TTL in Redis, or in-memory). Nothing survives long-term.
5. **Platform-level protection** — deployed on Vercel, which provides built-in DDoS mitigation.

**Our server is fundamentally different:**

| Aspect        | Excalidraw MCP    | tldraw MCP (ours)                          |
| ------------- | ----------------- | ------------------------------------------ |
| State         | Ephemeral renders | Persistent DO SQLite checkpoints           |
| Assets        | None              | R2 image uploads (up to 10MB each)         |
| Write ops     | None              | create/update/delete shapes, upload images |
| Storage cost  | ~$0 (stateless)   | R2 + DO = real $ at scale                  |
| Abuse surface | CPU time only     | Storage exhaustion, image hosting abuse    |
| Auth model    | None needed       | Bearer tokens required                     |

**Conclusion:** Excalidraw's "no auth" model is closer to ours than initially thought — we also have no per-user data. But our writable storage (R2, DO SQLite) creates abuse vectors that Excalidraw doesn't have. Rate limiting and input validation are the real mitigations, not auth.

### Auth strategy: fully open (like Excalidraw), hardened with rate limiting

**Decision: no authentication for initial launch.** The server is fully open — anyone can connect without tokens, signup, or registration.

**Why this is OK:**

- Every MCP session is an independent, ephemeral canvas — no user data to protect
- No user accounts or identity system
- Bearer tokens for a public server with no signup are security theater — the token would leak immediately (blog posts, screenshots, config files shared publicly) and become equivalent to no token
- This is exactly the Excalidraw model, and they've been running `mcp.excalidraw.com` publicly
- The MCP spec says auth is **optional** for servers that don't act on behalf of users

**Where we differ from Excalidraw (and why we need extra hardening):**

Unlike Excalidraw (stateless renderer), we have **writable persistent storage** (R2 images + DO SQLite). This creates real abuse vectors that auth alone wouldn't solve anyway — rate limiting and size caps are the actual mitigations:

| Abuse vector                       | Mitigation                                                   | Auth would help?                   |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| R2 storage exhaustion (image spam) | Rate limit uploads per IP, cap image size (10MB)             | No — authed users could still spam |
| DO proliferation (session spam)    | DOs are cheap (~$0.15/M requests), monitor via CF dashboard  | No                                 |
| Image hosting abuse (free CDN)     | UUIDs are unguessable, no directory listing, immutable cache | No                                 |
| CPU abuse (complex shape ops)      | Rate limit per IP (100 req/60s)                              | No — same quota either way         |

**The protection stack — how all layers work together:**

| Layer                    | Without OAuth (launch)                                        | With OAuth (future)                                                            |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Rate limiting**        | Per IP (100 req/60s) — shared IPs (offices, VPNs) share quota | Per user identity — each authenticated user gets their own quota               |
| **R2 bucket protection** | Size cap (10MB/image), rate limit prevents bulk upload        | Per-user storage quota (e.g. 100MB/user), can revoke upload access for abusers |
| **Input validation**     | Shape count (500), checkpoint size (5MB) — same either way    | Same limits, but can attribute violations to users                             |
| **Abuse response**       | Ban IP (blunt, affects innocent users on shared IPs)          | Ban specific user (surgical), or reduce their quota                            |
| **Image hosting abuse**  | UUIDs unguessable, no directory listing                       | Can track who uploaded what, delete a user's images                            |
| **DDoS**                 | Cloudflare built-in (automatic)                               | Same                                                                           |
| **Kill-switch**          | Set `MCP_AUTH_TOKEN` to lock down entirely                    | Not needed — revoke individual users instead                                   |

**Without OAuth** — rate limiting by IP + input validation are the main defenses. Good enough for launch, but IP-based limits are blunt (shared IPs, VPNs).

**With OAuth** — every request is tied to a user identity. Rate limiting, storage quotas, and abuse response all become per-user. This is the real long-term answer for R2 bucket protection: not "how do we prevent uploads" but "how do we know who's uploading and cap their usage".

**Keep the existing `MCP_AUTH_TOKEN` env var** as an optional kill-switch: if set, require it. This lets us lock down the server quickly if abuse occurs, without a code deploy. OFF by default for public launch.

### OAuth provider options (doesn't have to be GitHub)

The `workers-oauth-provider` is provider-agnostic. You swap the handler file:

| Provider                         | Effort           | Pros                                                                   | Cons                                                |
| -------------------------------- | ---------------- | ---------------------------------------------------------------------- | --------------------------------------------------- |
| **GitHub**                       | Low (~100 lines) | Most devs have accounts, reference implementations available           | Non-devs don't have GitHub                          |
| **Google**                       | Low (~100 lines) | Everyone has a Google account                                          | Need to configure Google Cloud OAuth consent screen |
| **Cloudflare Access**            | Zero code        | SSO with any IdP (GitHub, Google, Okta, SAML), managed by CF dashboard | Requires CF Access subscription (free for 50 users) |
| **Auth0**                        | Medium           | Enterprise features, pre-built UI                                      | Another service to manage                           |
| **tldraw.com accounts** (future) | High             | Native integration                                                     | Need to build the auth server                       |

The auth handler is a single file (~100 lines). Changing provider later means swapping that file + updating 3 env vars. The rest of the codebase (McpAgent, tools, OAuthProvider wrapper) stays identical.

**Recommendation:** Start with **GitHub** (every MCP user is a developer), switch to **Google** or **CF Access** if non-dev users need access.

**When to add OAuth:**

- When we want per-user rate limiting and storage quotas (the real R2 protection story)
- When we want to ban abusers surgically (not by IP)
- When we add per-user canvases / tldraw.com account integration
- When third-party developers need programmatic access with scoped permissions

### How Claude and ChatGPT handle MCP auth (research findings)

Both platforms support **authless AND OAuth** remote MCP servers:

**Claude (custom connectors):**

- Supports [both authless and OAuth-based remote servers](https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
- For authless: user just enters the URL, Claude connects immediately. No login flow.
- For OAuth: Claude implements the full OAuth 2.1 + PKCE flow. User sees a login redirect, authenticates, and grants permissions. Claude's callback URL is `https://claude.ai/api/mcp/auth_callback`
- Claude supports [Dynamic Client Registration](https://modelcontextprotocol.io/docs/tutorials/security/authorization) (RFC 7591) — the server can register Claude as an OAuth client automatically
- **User identity**: Claude does NOT pass the Claude user's identity to the MCP server in authless mode. In OAuth mode, the server controls what identity info goes into the access token.

**ChatGPT:**

- [Recommends OAuth with Dynamic Client Registration](https://developers.openai.com/api/docs/mcp/) for remote servers
- When a user first invokes a tool, ChatGPT launches the OAuth authorization code + PKCE flow
- Also supports authless for testing/development (`require_approval: 'never'`)
- **User identity**: same as Claude — in OAuth mode, the identity comes from YOUR auth server, not from OpenAI

**Key insight: neither Claude nor ChatGPT pass THEIR user's identity to your server.** The MCP protocol doesn't have a concept of "this is Claude user X". If you want to know who's connecting, YOU need to run the OAuth flow — the client just facilitates it.

### Cloudflare's built-in OAuth for McpAgent

Cloudflare has a first-party solution: [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider). It wraps your McpAgent and handles the entire OAuth 2.1 flow:

```ts
// How it would look (not implementing now, just documenting the path)
import OAuthProvider from '@cloudflare/workers-oauth-provider'
import GitHubHandler from './github-handler'

export default new OAuthProvider({
	apiRoute: '/mcp',
	apiHandler: MyMCP.serve('/mcp'),
	defaultHandler: GitHubHandler, // GitHub login flow
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register', // RFC 7591 DCR
})
```

The `McpAgent` class accepts a third type parameter for auth context:

```ts
class MyMCP extends McpAgent<Env, State, Props> {
	// After OAuth, this.props contains whatever you put in completeAuthorization()
	// e.g. { userId: '1234', username: 'Bob', scope: ['canvas:write'] }
}
```

The `props` object is set during the OAuth `completeAuthorization()` call, encrypted into the access token, and automatically available in every tool handler via `this.props`.

**This means adding GitHub/Google login later is a configuration change, not a rewrite.** The McpAgent tool code stays the same — you just wrap it with OAuthProvider and access `this.props` where needed.

**Auto-discovery endpoints provided by the library:**

- `/.well-known/oauth-authorization-server` (RFC 8414) — Claude and ChatGPT use this to discover your auth flow
- `/register` — Dynamic Client Registration (RFC 7591) — Claude and ChatGPT register as OAuth clients automatically
- `/authorize`, `/token` — standard OAuth endpoints

### User journey: what it looks like with OAuth

Based on [coleam00/remote-mcp-server-with-auth](https://github.com/coleam00/remote-mcp-server-with-auth) (the best reference implementation):

**Step 1 — User adds MCP server URL in Claude/ChatGPT**
User enters `https://tldraw-mcp.workers.dev/mcp` as a custom connector.

**Step 2 — Client discovers OAuth (automatic)**
The client GETs `/.well-known/oauth-authorization-server`, discovers our auth endpoints. Then registers itself via `/register` (Dynamic Client Registration, RFC 7591). The `OAuthProvider` handles all of this automatically.

**Step 3 — Browser opens for login**
The client redirects to our `/authorize` endpoint. We show an approval dialog ("tldraw MCP wants to access your canvas"), then redirect to GitHub's OAuth login.

**Step 4 — User authenticates with GitHub**
Standard GitHub OAuth screen: "Authorize tldraw-mcp?". User clicks Approve.

**Step 5 — Callback completes the loop**
GitHub redirects to `/callback`. We exchange the code for a GitHub token, fetch user info (`login`, `name`, `email`), then call `completeAuthorization()` — this creates an MCP access token with the user's identity encrypted inside it:

```ts
const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
	props: { login, name, email, accessToken } as Props, // <-- becomes this.props
	request: oauthReqInfo,
	scope: oauthReqInfo.scope,
	userId: login,
})
```

**Step 6 — Tools are available**
The client now has a bearer token. It connects to `/mcp`, the OAuthProvider validates the token, extracts `props`, and passes them to the McpAgent. Inside `init()`, `this.props` has `{ login, name, email }`.

**The whole flow takes ~5 seconds from the user's perspective.** After the first auth, the approval dialog is skipped (cookie-based) — so reconnecting is instant.

### How other apps do it (reference implementations)

| App                                                                                                          | Auth provider | Pattern                                                        | Repo                              |
| ------------------------------------------------------------------------------------------------------------ | ------------- | -------------------------------------------------------------- | --------------------------------- |
| [coleam00/remote-mcp-server-with-auth](https://github.com/coleam00/remote-mcp-server-with-auth)              | GitHub        | `OAuthProvider` + Hono handler + `McpAgent<Env, State, Props>` | Full template with database tools |
| [alice-cloudflare/mcp-github-oauth](https://github.com/alice-cloudflare/mcp-github-oauth)                    | GitHub        | Same pattern, minimal ~100 lines                               | Cloudflare official example       |
| [kw510/strava-mcp](https://github.com/kw510/strava-mcp)                                                      | Strava        | Same pattern, third-party OAuth                                | Shows any OAuth provider works    |
| [Auth0 + Cloudflare](https://auth0.com/blog/secure-and-deploy-remote-mcp-servers-with-auth0-and-cloudflare/) | Auth0         | Managed auth server                                            | Enterprise-grade                  |

All follow the same "double OAuth" pattern: the server is an OAuth 2.1 **provider** (for MCP clients) AND an OAuth **client** (to GitHub/Google/etc).

### Local testing with OAuth

Yes, OAuth works locally with `wrangler dev`. The setup:

1. **Create a separate GitHub OAuth App** for local dev:
   - Homepage URL: `http://localhost:8787`
   - Callback URL: `http://localhost:8787/callback`

2. **Add to `.dev.vars`:**

   ```
   GITHUB_CLIENT_ID=your_local_github_app_id
   GITHUB_CLIENT_SECRET=your_local_github_app_secret
   COOKIE_ENCRYPTION_KEY=<openssl rand -hex 32>
   ```

3. **Add KV namespace** to wrangler.toml (needed for token storage):

   ```toml
   [[kv_namespaces]]
   binding = "OAUTH_KV"
   id = "<kv-id>"  # create with: npx wrangler kv namespace create OAUTH_KV
   ```

4. **Test with MCP Inspector:**

   ```bash
   npx wrangler dev
   npx @modelcontextprotocol/inspector@latest
   # Enter: http://localhost:8787/mcp
   # Browser opens → GitHub login → redirects back → tools available
   ```

5. **For cloudflared tunnels:** Create a second GitHub OAuth App with the tunnel URL as callback. Or use the tunnel URL as `WORKER_ORIGIN` and set the GitHub OAuth App callback to `https://<tunnel>.trycloudflare.com/callback`.

### OAuth implementation path (future step)

Based on the reference implementations, here's what we'd add:

**New dependencies:**

- `@cloudflare/workers-oauth-provider` — OAuth 2.1 server framework
- `hono` — lightweight router for the auth handler (~3 routes)
- `octokit` — GitHub API client (for user info)

**New files (~100-150 lines total):**

- `src/auth/github-handler.ts` — Hono app with `/authorize` (GET/POST) + `/callback` (GET)
- `src/auth/oauth-utils.ts` — approval dialog HTML, cookie signing, token exchange helpers

**Changes to existing files:**

- `src/index.ts` — change `export default { fetch }` to `export default new OAuthProvider({ ... })`
- `src/index.ts` — add `Props` type: `McpAgent<Env, State, Props>`, access `this.props` in `init()`
- `wrangler.toml` — add `[[kv_namespaces]]` for `OAUTH_KV`
- `.dev.vars` — add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `COOKIE_ENCRYPTION_KEY`

**No tool code changes** — the existing `create_shapes`, `update_shapes`, etc. all keep working. The only new thing is `this.props` being available if we want to use it for per-user features later.

**Conditional tool registration** is the authorization pattern from the reference impl — rather than checking permissions at call time, tools are simply not registered for unauthorized users:

```ts
async init() {
	// Register tools for all authenticated users
	registerAppTool(this.server, 'create_shapes', ...)

	// Register admin-only tools
	if (ALLOWED_USERNAMES.has(this.props.login)) {
		this.server.tool('admin_reset', ...)
	}
}
```

### 5.1 Auth: optional kill-switch + rate limiting as primary protection

**Decision:** No auth required by default (fully open). The existing `MCP_AUTH_TOKEN` env var becomes an optional kill-switch — if set, enforce it; if not set, allow all requests.

**Changes in `src/index.ts`:**

- Keep existing auth check but make it clearly optional (already works this way — `if (env.MCP_AUTH_TOKEN)` guard)
- Upgrade `===` to timing-safe comparison (`crypto.subtle.timingSafeEqual`) for when the kill-switch IS enabled
- Add `WWW-Authenticate: Bearer realm="tldraw-mcp"` header on 401
- Add `// TODO: OAuth 2.1` comment documenting upgrade path

```ts
// Optional auth kill-switch: if MCP_AUTH_TOKEN is set, require it.
// This is OFF by default for public launch. Set it to lock down the server
// if abuse occurs, without a code deploy.
// TODO: OAuth 2.1 — when we add per-user canvases, upgrade to RFC 9728
// Protected Resource Metadata + external auth server (CF Access, Auth0, mcp-auth.dev)
if (env.MCP_AUTH_TOKEN) {
	const header = request.headers.get('Authorization')
	const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
	const expected = env.MCP_AUTH_TOKEN
	const encoder = new TextEncoder()
	const a = encoder.encode(token)
	const b = encoder.encode(expected)
	const authorized = a.byteLength === b.byteLength && (await crypto.subtle.timingSafeEqual(a, b))
	if (!authorized) {
		return corsResponse(
			new Response('Unauthorized', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Bearer realm="tldraw-mcp"' },
			})
		)
	}
}
```

**Primary protection is rate limiting (5.3) and input validation (5.2), not auth.**

### 5.2 Upload size limits + input validation

**Risk:** No limits on upload size, shape count, or checkpoint data.

**Reference:** tldraw.com uses `DEFAULT_MAX_ASSET_SIZE = 10 * 1024 * 1024` (10 MB) at `packages/tldraw/src/lib/defaultExternalContentHandlers.ts:53`.

**Constants to add in `src/index.ts`:**

```ts
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB — matches tldraw.com
const MAX_SHAPES_PER_CALL = 500
const MAX_CHECKPOINT_DATA_BYTES = 5 * 1024 * 1024 // 5 MB
```

**Changes:**

- `upload_image`: Validate `bytes.byteLength > MAX_IMAGE_BYTES` after base64 decode → error
- `create_shapes`: Validate `focusedShapes.length > MAX_SHAPES_PER_CALL` after parse → error
- `saveCheckpoint`: Validate `data.length > MAX_CHECKPOINT_DATA_BYTES` before SQLite write → throw (caught by tool handler's `errorResponse`)

### 5.3 Rate limiting (CF Workers Rate Limiting binding)

**Risk:** No rate limiting. Runaway LLM loops or brute-force attacks unthrottled.

**`wrangler.toml` addition:**

```toml
[[ratelimits]]
name = "MCP_RATE_LIMITER"
namespace_id = "1001"
  [ratelimits.simple]
  limit = 100
  period = 60
```

**Changes in `src/index.ts`:**

- Add `MCP_RATE_LIMITER: RateLimit` to `Env`
- In fetch handler, after auth check: rate limit keyed by `Authorization` header (per-session), IP fallback
- Return `429` with `Retry-After: 60` header on limit exceeded

### 5.4 R2 image security

**Risk:** Public images at `/images/*` need security headers and caching.

**Analysis:** tldraw.com serves assets identically — `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=31536000, immutable`, no auth on assets (`userAssetUploads.ts:115-121`). UUIDs are unguessable. Widget iframe needs direct URL access — can't add auth without breaking rendering.

**Changes in `handleImageRequest`:**

- Add `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing attacks)
- Add Cloudflare Cache API (`caches.default.match/put`) matching tldraw.com's pattern
- Pass `ctx: ExecutionContext` through for `ctx.waitUntil(cache.put(...))`

### 5.5 CORS — keep as-is with documentation

**Decision:** Keep `Access-Control-Allow-Origin: *`. MCP clients connect from unpredictable origins (Claude web, ChatGPT, VS Code, MCP Inspector). Auth tokens provide access control. This matches tldraw.com's asset serving pattern and the MCP spec example implementations.

Add comment explaining rationale.

### 5.6 Fix `as any` casts on `this.env`

**Risk:** Not a security risk, but maintenance burden. `McpAgent` doesn't expose `env` in types.

**Change:** Add typed `private get typedEnv(): Env` accessor. Replace all `(this as any).env` occurrences (~6 locations).

### Verification

| Test              | Command/Action                        | Expected                                   |
| ----------------- | ------------------------------------- | ------------------------------------------ |
| No auth (default) | `curl -X POST <url>/mcp` (no token)   | Request proceeds (no 401)                  |
| Kill-switch ON    | Set `MCP_AUTH_TOKEN`, curl without it | 401 with `WWW-Authenticate` header         |
| Rate limiting     | 101 requests in 60s                   | 429 on 101st with `Retry-After: 60`        |
| Upload size       | Upload >10MB via `upload_image`       | Error response                             |
| Shape count       | `create_shapes` with 501 shapes       | Error response                             |
| Checkpoint size   | Exceed 5MB checkpoint data            | Error response                             |
| Image caching     | Same image twice                      | Second from CF cache                       |
| Image headers     | `curl -I <url>/images/<id>`           | Includes `X-Content-Type-Options: nosniff` |
| Smoke test        | Full flow via Claude Desktop          | All tools work end-to-end                  |

### Files modified

| File            | Changes                                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/index.ts`  | `isAuthorized()`, `typedEnv` getter, size/count constants + validation, rate limit check, CF Cache API + security headers on images, `WWW-Authenticate` on 401, CORS comment |
| `wrangler.toml` | `[[ratelimits]]` binding                                                                                                                                                     |

## Testing commands

```bash
# Build + start (local dev)
cd apps/tldraw-mcp-cloudflare
yarn build:widget && npx wrangler dev

# Build + start with tunnel (for Claude Desktop)
yarn dev:tunnel

# Health check
curl http://localhost:8787/health

# MCP Inspector (use SSE transport)
npx @modelcontextprotocol/inspector
# In UI: Transport = SSE, URL = http://localhost:8787/sse
# Add proxy session token from terminal output to Configuration > Proxy Session Token
```
