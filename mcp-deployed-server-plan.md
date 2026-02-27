# Plan: Port tldraw-mcp-app to Cloudflare Workers

## Context

The tldraw-mcp-app on the tldraw-mcp-server branch is a working MCP App with streaming preview, checkpoint persistence, and 6 tools. It currently runs only via stdio transport (local Node.js). We want to deploy it on Cloudflare Workers with Durable Objects for state and R2 for image hosting — no Redis needed.

### Why Durable Objects (not stateless)?

The tldraw MCP app has an incremental update model: `create_shapes` adds to the canvas, `update_shapes` modifies existing shapes, `delete_shapes` removes them. All three call `getActiveShapes()` on the server to get the current canvas state as a base.

On a stateless server (Vercel-style), every request is a fresh instance with an empty Map. If the server loses state between tool calls:

- **`create_shapes`** — works, because the widget has a `hadBaseShapes` merge fallback via localStorage (`mcp-app.tsx:720-726`)
- **`update_shapes`** — **breaks silently**. Server returns empty shapes, canvas goes blank.
- **`delete_shapes`** — **same, breaks silently**. Filters an empty array, returns nothing.

The widget's recovery logic was designed for `create_shapes` only. Adding fallbacks for update/delete would mean new code in both server and widget for every mutation type.

DO SQLite costs ~$0-1.50/month at 10K users. It's cheaper than the engineering time to build and maintain stateless fallbacks.

### Cost at scale

| Scale         | Monthly cost | Notes                                 |
| ------------- | ------------ | ------------------------------------- |
| Free tier     | $0           | 100K requests/day, 10GB R2 storage    |
| 1,000 users   | $5           | Just the Workers Paid base plan       |
| 10,000 users  | ~$7          | $5 base + ~$2 DO/R2 overage           |
| 100,000 users | ~$31         | $5 base + ~$26 DO writes + R2 storage |

Workers and R2 egress are free. No bandwidth cliffs.

## What we're building

A new `apps/tldraw-mcp-cloudflare/` project that:

- **Imports** shared source from tldraw-mcp-app (focused-shape.ts, parse-json.ts, read-me.ts) via relative imports — no file duplication
- Copies only the widget files (which need their own vite build entry point)
- Replaces Node.js-specific code (stdio transport, filesystem HTML loading, in-memory checkpoints)
- Uses McpAgent Durable Object for per-session state + checkpoint persistence via SQLite
- Uses Cloudflare Assets binding to serve the widget HTML
- Uses R2 for image upload/serving
- Adds `upload_image` (app-only) and `create_image` (LLM-facing) tools for image support

## Code sharing strategy

**Import, don't copy.** The shared modules are pure TypeScript with no Node.js dependencies. The Cloudflare project imports directly from the existing app:

```ts
// focused-shape.ts exports:
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
	type FocusedShapeUpdate,
} from '../../tldraw-mcp-app/src/focused-shape'

// parse-json.ts exports:
import {
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseShapeIdsInput,
	parseBooleanFlag,
	parseJsonArray,
} from '../../tldraw-mcp-app/src/parse-json'

// read-me.ts exports:
import { READ_ME_CONTENT } from '../../tldraw-mcp-app/src/tools/read-me'
```

The tsconfig.json will include path references to `apps/tldraw-mcp-app` so TypeScript resolves these correctly. Wrangler bundles with esbuild, which handles cross-directory imports fine.

**Exception: widget files** are copied because they need their own `vite.config.ts` build entry point in the Cloudflare project directory. The widget code (`mcp-app.tsx`, `index.html`) is browser-only and unlikely to diverge.

**`parse-json.ts` env var**: Line 9 references `process.env.TLDRAW_MCP_JSON_HEALING_DEBUG`. On Workers, `process.env` doesn't exist. Fix: add `declare const process: { env: Record<string, string | undefined> }` in the Worker's global types, or define it via wrangler.toml `[vars]`. The flag defaults to off (falsy), so an undefined `process.env` will just keep it disabled — no functional change needed.

**`structuredClone` import**: `server.ts:8` imports `structuredClone` from `tldraw` (for Node.js compatibility). On Workers, `structuredClone` is a global — use it directly and don't import from tldraw in the Cloudflare `index.ts`.

**Helper functions from server.ts** (`normalizeShapeId`, `toSimpleShapeId`, `deepMerge`, `parseTlShapes`, `errorResponse`, `isPlainObject`, `generateCheckpointId`) are not exported. These are small utility functions — copy all 7 into the Cloudflare `index.ts` directly. They total ~50 lines. Note: `parseTlShapes` is used by `save_checkpoint` and `errorResponse` is used in every tool's catch block — don't forget these two.

## Tool registration: McpAgent API

The current `server.ts` uses `@modelcontextprotocol/sdk`'s `McpServer` class with `server.tool()` calls. The Cloudflare `agents` SDK uses `McpAgent` — a Durable Object class where tools are registered in the `init()` method:

```ts
import { McpAgent } from 'agents/mcp'

class TldrawMCP extends McpAgent<Env> {
  server = new McpServer({ name: 'tldraw', version: '1.0.0' })

  // McpAgent calls init() once per session
  async init() {
    // Standard tools (visible to LLM)
    this.server.tool('read_me', {}, async () => { ... })
    this.server.tool('create_image', createImageSchema, async (params) => { ... })

    // App tools (visible to LLM, return structuredContent for widget)
    registerAppTool(this.server, 'create_shapes', { ... }, handler)
    registerAppTool(this.server, 'update_shapes', { ... }, handler)
    registerAppTool(this.server, 'delete_shapes', { ... }, handler)

    // App-only tools (hidden from LLM, widget ↔ server only)
    this.server.tool('read_checkpoint', { ... _meta: { ui: { visibility: ['app'] } } }, handler)
    this.server.tool('save_checkpoint', { ... _meta: { ui: { visibility: ['app'] } } }, handler)
    this.server.tool('upload_image', { ... _meta: { ui: { visibility: ['app'] } } }, handler)
  }
}
```

The `this.server` property on `McpAgent` exposes the same `McpServer` interface, so tool logic ports directly.

## Tools: `create_image` and `upload_image`

**`upload_image`** (app-only, hidden from LLM):

- Widget sends base64 image data to the server
- Worker decodes base64, validates content type (png/jpeg/gif/webp/svg), stores in R2
- Returns the public URL: `https://<worker-domain>/images/<uuid>.<ext>`
- Used when the user pastes/drops an image in the widget canvas

**`create_image`** (standard tool, visible to LLM):

- Input schema: `{ url: string, x: number, y: number, w: number, h: number }`
- LLM provides a public image URL (or one returned by a previous `upload_image`)
- Worker creates an image TLShape at the specified position and dimensions
- Returns structuredContent with the new checkpoint (same pattern as `create_shapes`)
- The widget renders the image shape using tldraw's built-in `ImageShapeUtil`

## Session and checkpoint lifecycle

**One DO instance per MCP session.** When a client connects to `/mcp`, the Worker routes to a `McpAgent` Durable Object keyed by session ID (provided by the MCP transport or generated). All tool calls within that session hit the same DO instance.

**`activeCheckpointId` becomes DO instance state.** Currently stored as a module-level variable in `server.ts`. In the DO, it's stored as an instance property (`this.activeCheckpointId`). This survives across tool calls within the same session and is persisted to SQLite for reconnection.

**Why this matters for update/delete:** When the LLM calls `update_shapes`, the server needs the current canvas (`getActiveShapes()`). With DO, this is always available — even if the DO hibernated and woke back up, it reads from SQLite. Without DO, a cold start means empty state, and `update_shapes` returns an empty canvas.

**Reconnection flow:**

1. Client reconnects with the same session ID → routes to the same DO
2. DO reads `activeCheckpointId` from SQLite (set during `init()` if not already in memory)
3. Widget calls `read_checkpoint` → gets the last saved state
4. Session resumes where it left off

## Files to create

### 1. `apps/tldraw-mcp-cloudflare/wrangler.toml`

```toml
name = "tldraw-mcp-cloudflare"
main = "src/index.ts"
compatibility_date = "2025-03-10"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "./dist"
binding = "ASSETS"

[durable_objects]
bindings = [{ class_name = "TldrawMCP", name = "MCP_OBJECT" }]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["TldrawMCP"]

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "tldraw-mcp-images"
```

Note: Uses `.toml` to match every other Worker in the repo. `assets.directory` points to `./dist` where vite builds `mcp-app.html`. The `ASSETS` binding is a `Fetcher` used to load widget HTML at runtime.

### 2. `apps/tldraw-mcp-cloudflare/src/index.ts`

Worker entry point:

- `TldrawMCP extends McpAgent<Env>` — registers all tools in `init()`
- Fetch handler routes:
  - `/mcp` → `TldrawMCP.serve('/mcp')` (MCP protocol)
  - `/images/*` → R2 serving with Cache API + CORS
  - `/health` → 200 OK
- Checkpoint logic uses DO SQLite via `this.sql` template tag
- Widget HTML loaded via Assets binding: `this.env.ASSETS.fetch()`
- Ports all 6 existing tools + adds `upload_image` and `create_image`

### 3. `apps/tldraw-mcp-cloudflare/src/widget/` (index.html + mcp-app.tsx)

- Copied from `apps/tldraw-mcp-app/src/widget/` — runs in browser, fully compatible
- No changes needed for Cloudflare deployment

### 4. `apps/tldraw-mcp-cloudflare/vite.config.ts`

- Based on `apps/tldraw-mcp-app/vite.config.ts` — builds widget to single-file HTML

### 5. `apps/tldraw-mcp-cloudflare/package.json`

Dependencies:

- `agents` (Cloudflare MCP agent SDK)
- `@modelcontextprotocol/sdk` (needed for type imports: `CallToolResult`, `ReadResourceResult` — the `agents` package may not re-export all types)
- `@modelcontextprotocol/ext-apps` (MCP Apps registration helpers)
- `zod`
- `tldraw` (for types + widget)
- Dev: `wrangler`, `typescript`, `vite`, `vite-plugin-singlefile`, `@vitejs/plugin-react`

Scripts:

```json
{
	"build:widget": "vite build && mv dist/index.html dist/mcp-app.html",
	"build": "yarn build:widget",
	"dev": "yarn build:widget && wrangler dev",
	"deploy": "yarn build:widget && wrangler deploy"
}
```

The widget must build before the Worker — the Worker loads `dist/mcp-app.html` via the Assets binding at runtime.

**Dev workflow note:** `wrangler dev` does NOT watch widget source files. After changing `mcp-app.tsx`, you must re-run `yarn build:widget` and restart wrangler. For faster iteration, run `vite build --watch` in a separate terminal to auto-rebuild the widget HTML on save.

### 6. `apps/tldraw-mcp-cloudflare/tsconfig.json`

TypeScript config targeting ES2022 with Workers types. Includes path reference to `apps/tldraw-mcp-app` for shared imports.

## Auth, CORS, and rate limiting

**Authentication:** The `/mcp` endpoint will require a Bearer token passed via the `Authorization` header. MCP clients (Claude, Inspector) support custom headers. The token is validated against a `MCP_AUTH_TOKEN` secret stored in Wrangler secrets (`wrangler secret put MCP_AUTH_TOKEN`). Unauthenticated requests get a 401. For local dev, auth is disabled (check `MCP_AUTH_TOKEN` existence before enforcing).

**CORS:** Both `/images/*` and `/mcp` need CORS headers. Images load inside the widget iframe (different origin), and Claude web's Custom Connector makes browser-side requests to `/mcp` (not server-to-server). The `/mcp` endpoint must allow `Mcp-Session-Id` in `Access-Control-Allow-Headers` — this is required by the MCP transport protocol. Allow-origin `*` for both (images are public immutable assets; `/mcp` is protected by auth token). The fetch handler includes an `OPTIONS` preflight handler.

**Rate limiting:** Deferred to post-launch. Cloudflare's built-in rate limiting rules can be added via the dashboard without code changes. For initial deployment, the auth token provides sufficient access control.

## Key architectural decisions

### Checkpoint storage: DO SQLite (not KV, not R2, not stateless)

- Each McpAgent Durable Object gets its own SQLite database
- Checkpoints are small JSON blobs — perfect for SQLite
- Strong consistency within a session — no race conditions between save_checkpoint and the next tool call
- Required because `update_shapes` and `delete_shapes` need base shapes to operate on
- No external service needed (unlike Vercel + Redis)
- LRU eviction: `MAX_CHECKPOINTS = 200`, old rows pruned on every `saveCheckpoint` via `DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT 200)`
- Cost: ~$0 at low scale, ~$1.50/month at 10K users

### Widget HTML loading: Cloudflare Assets binding

- Vite builds `dist/mcp-app.html` (single-file, all deps inlined)
- `wrangler.toml` declares `"assets": { "directory": "./dist", "binding": "ASSETS" }`
- In the Worker, load at runtime: `const html = await this.env.ASSETS.fetch(new Request('https://assets.local/mcp-app.html')).then(r => r.text())`
- NOT a build-time raw import (esbuild doesn't support `?raw` for HTML files)

### Image handling: R2 bucket

- `upload_image` app-only tool: widget sends base64 → Worker stores in R2 → returns URL
- Image serving: Worker's fetch handler serves `/images/:key` from R2 with Cache API
- CSP: Worker domain added to `resourceDomains` so iframe can load images
- Patterns from `templates/sync-cloudflare/worker/assetUploads.ts`:
  - Cache API for reads (`caches.default`)
  - Content-type validation (png/jpeg/gif/webp/svg only)
  - CORS headers (`Access-Control-Allow-Origin: *`)
  - Immutable cache-control (`Cache-Control: public, max-age=31536000, immutable`)
- R2 egress is free — no cost cliff for popular images

## What NOT to change

- Widget code (mcp-app.tsx) — works as-is in browser
- FocusedShape types and conversions — pure TypeScript, imported from tldraw-mcp-app
- JSON healing — pure TypeScript, imported from tldraw-mcp-app
- Tool schemas and logic — same Zod schemas, same shape manipulation

## Review findings and risk mitigations

Issues identified during pre-implementation review, with mitigations integrated into the plan.

### 1. Use `wrangler.toml` not `wrangler.jsonc`

Every existing Worker in the repo (sync-worker, bemo-worker, asset-upload-worker, image-resize-worker, analytics-worker, templates/sync-cloudflare) uses `wrangler.toml`. The plan originally used `wrangler.jsonc`. Switched to `.toml` for repo consistency. Both formats work, but matching convention avoids confusion.

### 2. `getActiveShapes()` must return `TLShape[]`, not `unknown[]`

The tool handlers call `.id`, `.index`, and pass results to `convertTldrawRecordToFocusedShape()` which expects `TLShape`. The current `server.ts` uses `parseTlShapes()` to filter/validate when deserializing. The skeleton's `getActiveShapes()` was returning `unknown[]` — fixed to call `parseTlShapes()`:

```ts
getActiveShapes(): TLShape[] {
    if (!this.activeCheckpointId) return []
    const raw = this.loadCheckpoint(this.activeCheckpointId)
    return raw ? parseTlShapes(raw) : []
}
```

Similarly `loadCheckpoint` returns `unknown[] | null` which is correct (raw JSON), but every call site must go through `parseTlShapes` or be used only for raw storage (like `save_checkpoint` round-trips).

### 3. `tldraw` package in Worker bundle — the biggest risk

`focused-shape.ts` imports runtime values from `tldraw` (e.g. `createShapeId`, color constants, type validators). These are NOT type-only imports — they pull actual code. When wrangler's esbuild bundles the Worker, it will try to resolve the full `tldraw` package.

**Risks:**

- Bundle size explosion (tldraw is ~2MB+ with all shapes/tools/UI)
- Workers have a 10MB compressed bundle limit — tldraw could exceed this
- Some tldraw internals may reference browser APIs (`window`, `document`) that don't exist in Workers

**Mitigation strategy (progressive):**

1. **Try it first** — esbuild tree-shakes aggressively. If `focused-shape.ts` only pulls `createShapeId` and a few constants, the bundled size may be acceptable. Step 1 will reveal this immediately.
2. **If bundle too large** — add `external: ['tldraw']` to wrangler config and pre-bundle only the needed exports. Or copy the ~20 lines of tldraw utilities that `focused-shape.ts` actually uses into a local shim file.
3. **If browser API errors** — same fix: shim the specific imports locally.

This is the #1 thing step 1 proves. If it fails, the fix is small and isolated.

### 4. Zod version deduplication

Both `tldraw-mcp-app` and `tldraw-mcp-cloudflare` depend on `zod@^4.3.6`. The shared imports from `focused-shape.ts` use Zod schemas. If yarn resolves different Zod versions for each workspace, schema `instanceof` checks break at runtime (e.g. `safeParse` returns unexpected results).

**Mitigation:** Pin the exact same Zod version in both `package.json` files. If issues persist, add a `resolutions` field in the root `package.json` to force dedup.

### 5. `structuredClone` — only in server.ts, not shared code

Confirmed: `focused-shape.ts` does NOT import `structuredClone`. Only `server.ts` imports it from `tldraw` (for Node.js 16 compatibility). Since we're rewriting the server logic in `index.ts` and Workers has `structuredClone` as a global, this is a non-issue. No action needed beyond the already-documented "use the global" note.

### 6. Tool handler input types

`registerAppTool` passes `(params, extra)` to the callback where `params` is the parsed Zod input. The plan's translation examples use bare destructuring (`{ shapesJson, new_blank_canvas }`) without type annotations. Define input types explicitly:

```ts
type CreateShapesInput = z.infer<typeof createShapesInputSchema>
type UpdateShapesInput = z.infer<typeof updateShapesInputSchema>
type DeleteShapesInput = z.infer<typeof deleteShapesInputSchema>
```

Copy the Zod schema definitions from `server.ts` (they're not exported either).

### 7. Missing `read_checkpoint` and `save_checkpoint` handler details

The skeleton shows these tools registered but doesn't include handler logic. The current `server.ts` has non-trivial implementations:

- **`save_checkpoint`**: Calls `parseTlShapes()` on input, validates, stores via `saveCheckpoint()`, returns success message
- **`read_checkpoint`**: Loads shapes, converts each to FocusedShape via `convertTldrawRecordToFocusedShape()`, returns both `tldrawRecords` and `focusedShapes` in `structuredContent`

These must be ported explicitly in step 1 (not deferred to step 2), since they're needed to prove the SQLite round-trip works.

### 8. R2 Cache API not implemented in skeleton

The plan description mentions Cache API for R2 reads, and `templates/sync-cloudflare/worker/assetUploads.ts` shows the pattern (`caches.default.match()` before hitting R2, `cache.put()` after). But the skeleton's `handleImageRequest` goes straight to R2. Add Cache API in step 3:

```ts
async function handleImageRequest(url: URL, env: Env, request: Request): Promise<Response> {
	const cache = caches.default
	const cached = await cache.match(request)
	if (cached) return cached

	const key = url.pathname.slice(1)
	const object = await env.IMAGES.get(key)
	if (!object) return new Response('Not found', { status: 404 })

	const response = new Response(object.body, {
		headers: {
			'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Access-Control-Allow-Origin': '*',
		},
	})
	ctx.waitUntil(cache.put(request, response.clone()))
	return response
}
```

### 9. No `preview_bucket_name` for R2

The existing `templates/sync-cloudflare/wrangler.toml` uses separate preview and production R2 buckets. The plan only has one. For local dev, wrangler uses a local R2 simulator so this isn't blocking. Add `preview_bucket_name` when adding environment-based config post-launch.

### 10. Workspace registration is automatic

Confirmed: the root `package.json` has `"workspaces": ["apps/*", ...]`. Creating `apps/tldraw-mcp-cloudflare/` with a `package.json` is sufficient — no root config changes needed.

## Reference: McpAgent skeleton

This is the target structure for `src/index.ts`.

**Important API notes:**

- McpAgent exposes SQL via `this.sql` template tag literals (NOT `this.ctx.storage.sql`)
- `structuredClone` is a Workers global — do NOT import from tldraw
- `@modelcontextprotocol/sdk` should be added as a direct dependency for type imports (`CallToolResult`, `ReadResourceResult`) — the `agents` package may not re-export all types
- `registerAppTool`/`registerAppResource` from `@modelcontextprotocol/ext-apps/server` should work with `this.server` since it's a standard `McpServer` instance — but this is unverified in docs, so step 1 proves it

```ts
import { McpAgent } from 'agents/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import {
	registerAppResource,
	registerAppTool,
	RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import type { TLShape } from 'tldraw'
import { z } from 'zod'

// Shared imports — no duplication
import {
	convertFocusedShapeToTldrawRecord,
	convertTldrawRecordToFocusedShape,
	type FocusedShape,
} from '../../tldraw-mcp-app/src/focused-shape'
import {
	parseFocusedShapesInput,
	parseFocusedShapeUpdatesInput,
	parseShapeIdsInput,
	parseBooleanFlag,
	parseJsonArray,
} from '../../tldraw-mcp-app/src/parse-json'
import { READ_ME_CONTENT } from '../../tldraw-mcp-app/src/tools/read-me'

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	ASSETS: Fetcher
	IMAGES: R2Bucket
	MCP_AUTH_TOKEN: string
}

const CANVAS_RESOURCE_URI = 'ui://show-canvas/mcp-app.html'
const MAX_CHECKPOINTS = 200

// --- Helper functions (copied from server.ts, ~50 lines) ---

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeShapeId(id: string): string {
	return id.startsWith('shape:') ? id : `shape:${id}`
}

function toSimpleShapeId(id: string): string {
	return id.replace(/^shape:/, '')
}

function deepMerge(base: unknown, patch: unknown): unknown {
	if (!isPlainObject(base) || !isPlainObject(patch)) return patch
	const merged: Record<string, unknown> = { ...base }
	for (const [key, value] of Object.entries(patch)) {
		merged[key] = deepMerge(merged[key], value)
	}
	return merged
}

function generateCheckpointId(): string {
	return crypto.randomUUID().replace(/-/g, '').slice(0, 18)
}

function parseTlShapes(value: unknown[]): TLShape[] {
	return value.filter(
		(s): s is TLShape => isPlainObject(s) && typeof s.id === 'string' && typeof s.type === 'string'
	)
}

function errorResponse(err: unknown, summary?: string): CallToolResult {
	const message = err instanceof Error ? err.message : String(err)
	return {
		content: [{ type: 'text', text: `Error: ${message}\n${summary ?? ''}` }],
		isError: true,
	}
}

// --- Widget HTML loader ---

async function loadWidgetHtml(assets: Fetcher): Promise<string> {
	const response = await assets.fetch(new Request('https://assets.local/mcp-app.html'))
	if (!response.ok) throw new Error(`Failed to load widget HTML: ${response.status}`)
	return response.text()
}

// --- CORS helpers ---

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id',
}

function corsResponse(response: Response): Response {
	const headers = new Headers(response.headers)
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		headers.set(key, value)
	}
	return new Response(response.body, { status: response.status, headers })
}

// --- McpAgent Durable Object ---

export class TldrawMCP extends McpAgent<Env> {
	server = new McpServer({ name: 'tldraw', version: '1.0.0' })
	activeCheckpointId: string | null = null

	async init() {
		// --- DO SQLite setup (using this.sql template tag) ---
		this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`

		// Restore active checkpoint on reconnect
		const rows = [...this.sql`SELECT value FROM meta WHERE key = 'activeCheckpointId'`]
		if (rows.length > 0) this.activeCheckpointId = rows[0].value as string

		// --- Widget resource ---
		const widgetHtml = await loadWidgetHtml(this.env.ASSETS)

		registerAppResource(
			this.server,
			CANVAS_RESOURCE_URI,
			CANVAS_RESOURCE_URI,
			{ mimeType: RESOURCE_MIME_TYPE },
			async () => ({
				contents: [
					{
						uri: CANVAS_RESOURCE_URI,
						mimeType: RESOURCE_MIME_TYPE,
						text: widgetHtml,
						_meta: {
							ui: {
								csp: {
									resourceDomains: [
										'https://cdn.tldraw.com',
										'https://fonts.googleapis.com',
										'https://fonts.gstatic.com',
									],
									connectDomains: ['https://cdn.tldraw.com'],
									// Worker domain added in step 3 for R2 images
								},
							},
						},
					},
				],
			})
		)

		// --- Tools registered here (see implementation steps) ---
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[]) {
		this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${JSON.stringify(shapes)}, ${Date.now()})`
		this.activeCheckpointId = id
		this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`

		// Evict old checkpoints beyond MAX_CHECKPOINTS (LRU)
		this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS})`
	}

	loadCheckpoint(id: string): unknown[] | null {
		const rows = [...this.sql`SELECT data FROM checkpoints WHERE id = ${id}`]
		return rows.length > 0 ? JSON.parse(rows[0].data as string) : null
	}

	getActiveShapes(): TLShape[] {
		if (!this.activeCheckpointId) return []
		const raw = this.loadCheckpoint(this.activeCheckpointId)
		return raw ? parseTlShapes(raw) : []
	}
}

// --- Fetch handler ---

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)

		// CORS preflight (needed for Claude web Custom Connector)
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS })
		}

		// Health check (no auth)
		if (url.pathname === '/health') return new Response('OK')

		// R2 image serving (no auth — public, immutable assets)
		if (url.pathname.startsWith('/images/')) {
			return handleImageRequest(url, env, request, ctx)
		}

		// MCP endpoint (auth required in production, CORS for Claude web)
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			// Auth check: skip if MCP_AUTH_TOKEN not set (local dev)
			if (env.MCP_AUTH_TOKEN) {
				const auth = request.headers.get('Authorization')
				if (auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
					return corsResponse(new Response('Unauthorized', { status: 401 }))
				}
			}
			const response = await TldrawMCP.serve('/mcp').fetch(request, env, ctx)
			return corsResponse(response)
		}

		return new Response('Not found', { status: 404 })
	},
}

async function handleImageRequest(
	url: URL,
	env: Env,
	request: Request,
	ctx: ExecutionContext
): Promise<Response> {
	// Step 3: add Cache API (caches.default.match/put) here
	const key = url.pathname.slice(1) // "images/uuid.png"
	const object = await env.IMAGES.get(key)
	if (!object) return new Response('Not found', { status: 404 })

	return new Response(object.body, {
		headers: {
			'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Access-Control-Allow-Origin': '*',
		},
	})
}
```

### Key API differences from current server.ts

| Current (stdio)                        | Cloudflare (McpAgent)                               |
| -------------------------------------- | --------------------------------------------------- |
| `new McpServer(...)` at module level   | `server = new McpServer(...)` as class property     |
| `server.tool(...)` at module level     | `this.server.tool(...)` inside `init()`             |
| `registerAppTool(server, ...)`         | `registerAppTool(this.server, ...)`                 |
| `checkpoints = new Map()`              | `this.sql` template tag on DO SQLite                |
| `activeCheckpointId` module var        | `this.activeCheckpointId` + SQLite meta table       |
| `loadCachedCanvasWidgetHtml()` (fs)    | `this.env.ASSETS.fetch()` (Assets binding)          |
| `structuredClone` imported from tldraw | `structuredClone` is a Workers global               |
| No fetch handler                       | `export default { fetch }` + `export { TldrawMCP }` |
| No CORS                                | CORS headers on `/mcp` (needed for Claude web)      |
| `console.error()` for logging          | Same — `console.error()` works on Workers           |

### Session lifecycle clarification

Each MCP session (one Claude conversation) gets its own DO instance with its own SQLite database. Checkpoints persist within a session (survives DO hibernation/wake cycles) but do **not** carry across sessions. This is the correct behavior — each conversation has its own canvas. The widget's localStorage fallback handles recovery for remounts within the same page.

## Implementation steps

4 steps. Each has a test gate — don't proceed until it passes.

---

### Step 1: Scaffold + prove McpAgent works (the spike)

**Goal:** McpAgent connects, `read_me` tool works, widget renders. This proves the API integration.

**Work:**

- Create `apps/tldraw-mcp-cloudflare/` with: `package.json`, `wrangler.toml`, `tsconfig.json`, `vite.config.ts`
- Copy widget files (`src/widget/index.html`, `src/widget/mcp-app.tsx`)
- Write `src/index.ts` using the skeleton above, but with **only** these registered in `init()`:
  - `read_me` tool (plain tool)
  - Widget resource (via Assets binding)
  - `read_checkpoint` and `save_checkpoint` (app-only, using DO SQLite)
- No shape tools, no R2, no auth yet

**Known risks to watch for:**

1. **`this.sql`** — the McpAgent SQL API uses template tag literals (`this.sql\`SELECT ...\``), NOT `this.ctx.storage.sql.exec()`. If `this.sql`doesn't exist at runtime, check that`new_sqlite_classes`migration is in`wrangler.toml`and`agents` package is up to date
2. **`registerAppResource(this.server, ...)`** — must pass `this.server`, not `server`. This is the key unknown: ext-apps helpers are not documented with McpAgent, but should work since `this.server` is a standard `McpServer`
3. **Assets binding** — widget HTML must be built to `dist/` before `wrangler dev`. Build order: vite first, then wrangler
4. **`process.env` in parse-json.ts** — if esbuild complains, add `define: { 'process.env.TLDRAW_MCP_JSON_HEALING_DEBUG': 'undefined' }` to wrangler.toml
5. **`@modelcontextprotocol/sdk` types** — if type imports like `CallToolResult` don't resolve through the `agents` bundle, add `@modelcontextprotocol/sdk` as a direct dependency

**Test gate:**

```bash
# 1. Build + start
cd apps/tldraw-mcp-cloudflare
yarn install && yarn build:widget && yarn dev

# 2. Health check
curl http://localhost:8788/health
# Expected: 200 OK

# 3. MCP Inspector — tool + resource
npx @modelcontextprotocol/inspector --url http://localhost:8788/mcp
# Expected: Tools: read_me, read_checkpoint, save_checkpoint
# Expected: Call read_me → returns shape format docs
# Expected: Resources: ui://show-canvas/mcp-app.html

# 4. Checkpoint round-trip via Inspector
# Call save_checkpoint with: { checkpointId: "test1", shapesJson: "[{\"id\":\"shape:r1\",\"type\":\"geo\"}]" }
# Call read_checkpoint with: { checkpointId: "test1" }
# Expected: returns the same shapes
# Restart wrangler dev → call read_checkpoint again
# Expected: still returns the shapes (SQLite persists)

# 5. MCPJam Inspector — widget renders
npx @mcpjam/inspector@latest
# Expected: widget iframe renders the tldraw canvas (empty)
```

**If this step fails**, debug here before going further. The McpAgent API and Assets binding are the only unknowns in the entire plan.

---

### Step 2: Port all shape tools

**Goal:** Full parity with the stdio server (minus images). Mechanical translation of `server.ts` tool registrations to `init()` method calls.

**Work:**

- In `init()`, register `create_shapes`, `update_shapes`, `delete_shapes` using `registerAppTool(this.server, ...)`
- The tool handler logic is **identical** to `server.ts` — just replace:
  - `getActiveShapes()` → `this.getActiveShapes()`
  - `saveCheckpoint(id, shapes)` → `this.saveCheckpoint(id, shapes)`
  - `activeCheckpointId = id` → `this.activeCheckpointId = id` (already done in `this.saveCheckpoint`)
  - `checkpoints.get(id)` → `this.loadCheckpoint(id)`
  - `structuredClone(s)` — use the Workers global directly (don't import from tldraw)
- Import shared code from `../../tldraw-mcp-app/src/`
- Copy the Zod schema definitions from `server.ts` (they're not exported):
  ```ts
  const createShapesInputSchema = z.object({
  	new_blank_canvas: z.boolean().optional().describe('...'),
  	shapesJson: z.string().describe('...'),
  })
  type CreateShapesInput = z.infer<typeof createShapesInputSchema>
  // Same pattern for updateShapesInputSchema, deleteShapesInputSchema
  ```

**Translation pattern** (do this for each of the 3 tools):

```ts
// server.ts (current):
registerAppTool(server, 'create_shapes', { ... }, async ({ shapesJson, new_blank_canvas }) => {
  const baseShapes = newBlankCanvas ? [] : getActiveShapes()
  // ... shape logic ...
  const checkpointId = generateCheckpointId()
  saveCheckpoint(checkpointId, resultShapes)
  activeCheckpointId = checkpointId
  return { content: [...], structuredContent: { checkpointId, ... } }
})

// index.ts (new) — inside init():
registerAppTool(this.server, 'create_shapes', { ... }, async ({ shapesJson, new_blank_canvas }) => {
  const baseShapes = newBlankCanvas ? [] : this.getActiveShapes()
  // ... same shape logic ...
  const checkpointId = generateCheckpointId()
  this.saveCheckpoint(checkpointId, resultShapes)
  return { content: [...], structuredContent: { checkpointId, ... } }
})
```

**Test gate:**

```bash
# 1. MCP Inspector: all 6 tools present
npx @modelcontextprotocol/inspector --url http://localhost:8788/mcp
# Expected: read_me, create_shapes, update_shapes, delete_shapes, read_checkpoint, save_checkpoint

# 2. create_shapes → structuredContent
# Call: shapesJson='[{"id":"r1","type":"geo","x":100,"y":100,"w":200,"h":150,"text":"Hello"}]', new_blank_canvas=true
# Expected: response has structuredContent with checkpointId + tldrawRecords

# 3. update_shapes → modifies existing
# Call: updatesJson='[{"shapeId":"r1","x":300}]'
# Expected: shape r1 now at x=300, all other shapes preserved

# 4. delete_shapes → removes shape
# Call: shapeIdsJson='["r1"]'
# Expected: shape r1 gone, empty result

# 5. MCPJam Inspector: full widget flow
npx @mcpjam/inspector@latest
# Expected: create_shapes → rectangle appears on canvas
# Expected: shapes stream during LLM generation (ontoolinputpartial)
# Expected: reload page → shapes restore from checkpoint (localStorage + save_checkpoint)
```

---

### Step 3: Add images + auth

**Goal:** R2 image support and Bearer token auth.

**Work (images):**

- R2 bucket already declared in `wrangler.toml` from step 1
- Create R2 bucket locally: `npx wrangler r2 bucket create tldraw-mcp-images`
- Add `/images/:key` GET route in fetch handler (already in skeleton)
- Register `upload_image` (app-only tool):
  - Input: `{ filename: string, base64: string, contentType: string }`
  - Decode base64, validate content type, store in R2 as `images/<uuid>.<ext>`
  - Return `{ structuredContent: { imageUrl: 'https://<domain>/images/<key>' } }`
- Register `create_image` (LLM-facing tool):
  - Input: `{ url: string, x: number, y: number, w: number, h: number }`
  - Create a TLShape with `type: 'image'` at specified position
  - Store as new checkpoint, return structuredContent
- Add Worker domain to `resourceDomains` in CSP config:
  ```ts
  resourceDomains: [
    'https://cdn.tldraw.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://tldraw-mcp-cloudflare.<account>.workers.dev',
  ],
  ```

**Work (auth):**

- Create `.dev.vars` with `MCP_AUTH_TOKEN=dev-token-123` (for local testing with auth)
- Auth logic already in fetch handler skeleton — skips auth if `MCP_AUTH_TOKEN` not set
- No auth on `/health` and `/images/*`

**Test gate:**

```bash
# Auth (set MCP_AUTH_TOKEN in .dev.vars first)
curl -s -o /dev/null -w "%{http_code}" http://localhost:8788/mcp
# Expected: 401

curl -s -o /dev/null -w "%{http_code}" http://localhost:8788/health
# Expected: 200

npx @modelcontextprotocol/inspector --url http://localhost:8788/mcp \
  --header "Authorization: Bearer dev-token-123"
# Expected: connects, lists 8 tools

# Images (via Inspector with auth)
# Call upload_image with a small PNG base64 string
# Expected: returns URL like http://localhost:8788/images/<uuid>.png

curl http://localhost:8788/images/<uuid>.png -I
# Expected: 200, Content-Type: image/png, Access-Control-Allow-Origin: *

# Call create_image with that URL + position
# Expected: returns structuredContent with image shape

# MCPJam Inspector: image visible on canvas
# Expected: image shape renders in the widget
```

---

### Step 4: Deploy + smoke test

**Goal:** Live on Cloudflare, works with Claude web.

**Work:**

```bash
npx wrangler r2 bucket create tldraw-mcp-images   # if not created in step 3
npx wrangler secret put MCP_AUTH_TOKEN             # set production token
yarn deploy
```

- Update `resourceDomains` CSP to include the deployed domain (replace localhost reference)

**Test gate:**

```bash
# Basics
curl https://tldraw-mcp-cloudflare.<account>.workers.dev/health
# Expected: 200

curl -s -o /dev/null -w "%{http_code}" \
  https://tldraw-mcp-cloudflare.<account>.workers.dev/mcp
# Expected: 401

# MCP Inspector against deployed URL
npx @modelcontextprotocol/inspector \
  --url https://tldraw-mcp-cloudflare.<account>.workers.dev/mcp \
  --header "Authorization: Bearer <production-token>"
# Expected: all 8 tools listed (read_me, create_shapes, update_shapes, delete_shapes,
#   read_checkpoint, save_checkpoint, upload_image, create_image)
# Expected: create_shapes returns structuredContent

# MCPJam Inspector against deployed URL
npx @mcpjam/inspector@latest
# Expected: widget renders, shapes appear, images load

# Claude web (the real test)
# Settings > Connectors > Add Custom Connector
# URL: https://tldraw-mcp-cloudflare.<account>.workers.dev/mcp
# Create a diagram → streaming preview works → shapes persist across tool calls
```

## What NOT to change

- Widget code (mcp-app.tsx) — works as-is in browser
- FocusedShape types and conversions — pure TypeScript, imported from tldraw-mcp-app
- JSON healing — pure TypeScript, imported from tldraw-mcp-app
- Tool schemas and logic — same Zod schemas, same shape manipulation

---

## Step 5: Security hardening for public deployment

### Context

The server audience is **public/open** — anyone can connect. The MCP spec [recommends OAuth 2.1](https://modelcontextprotocol.io/docs/tutorials/security/authorization) for remote servers, but that's infrastructure-level. This step takes a **layered approach**: implement what we can in code now (timing-safe auth, rate limiting, input validation, image security), and document the OAuth 2.1 path as a follow-up.

**Key findings from research:**

- The MCP spec says auth is **optional** but **strongly recommended** for servers handling user data
- For remote HTTP servers, the spec prescribes OAuth 2.1 with Protected Resource Metadata (RFC 9728), Dynamic Client Registration (RFC 7591), and PKCE
- tldraw.com uses 10MB upload limit, `Access-Control-Allow-Origin: *` for assets, and Cloudflare Cache API
- Cloudflare Workers has a native [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) (GA since Sept 2025) — no Durable Objects needed
- CF Workers request body limit is 100MB (free/pro), so we need application-level limits

### Comparison with Excalidraw MCP server

[excalidraw-mcp](https://github.com/excalidraw/excalidraw-mcp/) is deployed publicly at `mcp.excalidraw.com` with **zero authentication, zero rate limiting, and full open CORS**. They can afford this because:

1. **Stateless rendering service** — takes Excalidraw JSON elements and renders SVGs. No persistent user data, no accounts, no secrets.
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
- Bearer tokens for a public server with no signup are security theater — the token would leak immediately and become equivalent to no token
- This is exactly the Excalidraw model, and they've been running `mcp.excalidraw.com` publicly
- The MCP spec says auth is **optional** for servers that don't act on behalf of users

**Where we differ from Excalidraw (and why we need extra hardening):**

| Abuse vector                       | Mitigation                                                   | Auth would help?                   |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------- |
| R2 storage exhaustion (image spam) | Rate limit uploads per IP, cap image size (10MB)             | No — authed users could still spam |
| DO proliferation (session spam)    | DOs are cheap (~$0.15/M requests), monitor via CF dashboard  | No                                 |
| Image hosting abuse (free CDN)     | UUIDs are unguessable, no directory listing, immutable cache | No                                 |
| CPU abuse (complex shape ops)      | Rate limit per IP (100 req/60s)                              | No — same quota either way         |

**The protection stack — how all layers work together:**

| Layer                | Without OAuth (launch)                           | With OAuth (future)                    |
| -------------------- | ------------------------------------------------ | -------------------------------------- |
| **Rate limiting**    | Per IP (100 req/60s)                             | Per user identity — own quota per user |
| **R2 bucket**        | Size cap (10MB), rate limit prevents bulk upload | Per-user storage quota, revoke abusers |
| **Input validation** | Shape count (500), checkpoint size (5MB)         | Same, but attributable to users        |
| **Abuse response**   | Ban IP (blunt)                                   | Ban specific user (surgical)           |

**Keep `MCP_AUTH_TOKEN` env var** as optional kill-switch. OFF by default for public launch.

**OAuth provider options** (doesn't have to be GitHub):

- **GitHub** — low effort (~100 lines), most devs have accounts
- **Google** — low effort, everyone has an account
- **Cloudflare Access** — zero code, SSO with any IdP
- **Auth0** — enterprise, managed

Provider is a single handler file (~100 lines). Swapping later = change 1 file + 3 env vars. See full details, user journey, reference implementations, and local testing guide in `log.md` Step 5.

**How Claude and ChatGPT handle MCP auth:**

Both support [authless AND OAuth](https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers). Neither passes its own user identity — if you want to know who's connecting, you run OAuth yourself via [`workers-oauth-provider`](https://github.com/cloudflare/workers-oauth-provider).

---

### 5.1 Auth: optional kill-switch + timing-safe comparison

**Decision:** No auth required by default (fully open). The existing `MCP_AUTH_TOKEN` env var becomes an optional kill-switch — if set, enforce it; if not set, allow all requests.

**File:** `src/index.ts` (fetch handler)

**Changes:**

- Keep existing auth check but make it clearly optional (already works this way — `if (env.MCP_AUTH_TOKEN)` guard)
- Upgrade `===` to timing-safe comparison (`crypto.subtle.timingSafeEqual`) for when the kill-switch IS enabled
- Add `WWW-Authenticate: Bearer realm="tldraw-mcp"` header on 401
- Add `// TODO: OAuth 2.1` comment documenting upgrade path
- Add `// TODO: Cloudflare Access` comment — can be enabled at infrastructure level without code changes

```ts
// Optional auth kill-switch: if MCP_AUTH_TOKEN is set, require it.
// OFF by default for public launch. Set it to lock down the server if abuse occurs.
// TODO: OAuth 2.1 — when adding per-user canvases, upgrade to RFC 9728 + external auth server
// TODO: Cloudflare Access — can gate /mcp with GitHub/Google login, zero code changes
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

---

### 5.2 Upload size limits + input validation

**Problem:** No limits on upload size, shape count, or checkpoint data size.

**Reference:** tldraw.com uses `DEFAULT_MAX_ASSET_SIZE = 10 * 1024 * 1024` (10 MB) at `packages/tldraw/src/lib/defaultExternalContentHandlers.ts:53` and `DEFAULT_MAX_IMAGE_DIMENSION = 5000`.

**Constants to add:**

```ts
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB — matches tldraw.com
const MAX_SHAPES_PER_CALL = 500
const MAX_CHECKPOINT_DATA_BYTES = 5 * 1024 * 1024 // 5 MB
```

**Changes:**

a) `upload_image` handler — validate after base64 decode:

```ts
const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
if (bytes.byteLength > MAX_IMAGE_BYTES) {
	return errorResponse(
		new Error(`Image too large: ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB (max 10 MB)`)
	)
}
```

b) `create_shapes` handler — validate shape count:

```ts
const focusedShapes = parseFocusedShapesInput(shapesJson)
if (focusedShapes.length > MAX_SHAPES_PER_CALL) {
	return errorResponse(
		new Error(`Too many shapes: ${focusedShapes.length} (max ${MAX_SHAPES_PER_CALL})`)
	)
}
```

c) `saveCheckpoint` method — validate data size before SQLite write:

```ts
const data = JSON.stringify({ shapes, assets })
if (data.length > MAX_CHECKPOINT_DATA_BYTES) {
	throw new Error(`Checkpoint too large: ${(data.length / 1024 / 1024).toFixed(1)} MB (max 5 MB)`)
}
```

---

### 5.3 Rate limiting with CF Workers Rate Limiting binding

**Problem:** No rate limiting. Runaway LLM loops or brute-force attacks are unthrottled.

**wrangler.toml addition:**

```toml
[[ratelimits]]
name = "MCP_RATE_LIMITER"
namespace_id = "1001"

  [ratelimits.simple]
  limit = 100
  period = 60
```

100 requests per 60 seconds per key. Period can only be 10 or 60 seconds (CF constraint).

**Env type:** Add `MCP_RATE_LIMITER: RateLimit`

**Fetch handler** — add after auth check, before routing:

```ts
const rateLimitKey =
	request.headers.get('Authorization') ?? request.headers.get('CF-Connecting-IP') ?? 'anonymous'
const { success } = await env.MCP_RATE_LIMITER.limit({ key: rateLimitKey })
if (!success) {
	return corsResponse(
		new Response('Rate limit exceeded', {
			status: 429,
			headers: { 'Retry-After': '60' },
		})
	)
}
```

Keyed by IP since the server is fully open (no per-user tokens). Each unique IP gets its own 100 req/60s quota.

---

### 5.4 R2 image security hardening

**Problem:** Images at `/images/*` are public. Need security headers and caching.

**Analysis:** tldraw.com also serves assets publicly with `Access-Control-Allow-Origin: *` and `Cache-Control: public, max-age=31536000, immutable`. UUIDs are unguessable. Keeping images public is correct.

**Changes:**

a) Add `X-Content-Type-Options: nosniff` (prevents MIME-type sniffing attacks)

b) Add Cloudflare Cache API (matching tldraw.com's pattern):

```ts
async function handleImageRequest(url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
	const cacheKey = new Request(url.toString())
	const cached = await caches.default.match(cacheKey)
	if (cached) return cached

	const key = url.pathname.slice(1)
	const object = await env.IMAGES.get(key)
	if (!object) return new Response('Not found', { status: 404 })

	const response = new Response(object.body, {
		headers: {
			'Content-Type': object.httpMetadata?.contentType ?? 'image/png',
			'X-Content-Type-Options': 'nosniff',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Access-Control-Allow-Origin': '*',
		},
	})

	ctx.waitUntil(caches.default.put(cacheKey, response.clone()))
	return response
}
```

---

### 5.5 CORS — keep as-is with documentation

**Decision:** Keep `Access-Control-Allow-Origin: *`. MCP clients connect from unpredictable origins (Claude web, ChatGPT, VS Code, MCP Inspector). Bearer tokens provide access control. This matches tldraw.com's asset serving pattern and MCP spec example implementations.

---

### 5.6 Fix `as any` casts on `this.env`

Add a typed accessor to avoid scattered `as any` casts:

```ts
export class TldrawMCP extends McpAgent<Env> {
	private get typedEnv(): Env {
		return (this as any).env as Env
	}
}
```

Replace all `(this as any).env` occurrences with `this.typedEnv`.

---

### Verification checklist

1. **No auth (default):** `curl -X POST <url>/mcp` (no token) → request proceeds (no 401)
2. **Kill-switch ON:** Set `MCP_AUTH_TOKEN`, curl without it → 401 with `WWW-Authenticate` header
3. **Rate limiting:** 101 requests in 60s → 429 with `Retry-After: 60` on 101st
4. **Upload size:** >10MB image via `upload_image` → error
5. **Shape count:** `create_shapes` with 501 shapes → error
6. **Checkpoint size:** >5MB checkpoint → error
7. **Image caching:** Same image requested twice → second served from CF cache
8. **Image headers:** `curl -I <url>/images/<id>` → includes `X-Content-Type-Options: nosniff`
9. **Smoke test:** Full flow via Claude Desktop — read_me, create_shapes, update_shapes, delete_shapes, create_image, drag-drop upload

### Sources

- [MCP Authorization spec](https://modelcontextprotocol.io/docs/tutorials/security/authorization)
- [MCP Bearer token best practices discussion](https://github.com/modelcontextprotocol/modelcontextprotocol/discussions/1247)
- [Cloudflare Workers Rate Limiting GA](https://developers.cloudflare.com/changelog/2025-09-19-ratelimit-workers-ga/)
- [tldraw.com asset handling](https://github.com/tldraw/tldraw/blob/main/packages/worker-shared/src/userAssetUploads.ts)

---

## Step 6: Publish npm package

The npm package lets users run `npx @tldraw/mcp-server --stdio` for local MCP hosts (Claude Desktop, VSCode Copilot, Cursor, etc.). This package is published independently from the monorepo's lerna-managed packages (which only cover `packages/*`). Version is managed manually.

### 6a. Add shebang to entry point

**File:** `apps/tldraw-mcp/src/main.ts`

Add `#!/usr/bin/env node` as the very first line (before the crypto polyfill). This tells the OS to run the file with Node when invoked as a CLI binary.

### 6b. Update package.json for publishing

**File:** `apps/tldraw-mcp/package.json`

| Field                  | Value                                       | Why                                      |
| ---------------------- | ------------------------------------------- | ---------------------------------------- |
| `name`                 | `@tldraw/mcp-server`                        | Scoped package name                      |
| `version`              | `0.1.0`                                     | Initial publish                          |
| Remove `private: true` | —                                           | Allows npm publish                       |
| `bin`                  | `{ "tldraw-mcp-server": "./dist/main.js" }` | CLI entry point                          |
| `main`                 | `./dist/main.js`                            | Module entry point                       |
| `files`                | `["dist"]`                                  | Only ship compiled JS + widget HTML      |
| `prepublishOnly`       | `npm run build`                             | Safety net — always build before publish |
| `description`          | (short description)                         | npm metadata                             |
| `license`              | (appropriate license)                       | npm metadata                             |
| `repository`           | (tldraw monorepo)                           | npm metadata                             |

**Test checkpoint 6b:**

```bash
cd apps/tldraw-mcp && npm run build
ls dist/mcp-app.html                    # widget HTML exists
head -1 dist/main.js                    # starts with #!/usr/bin/env node
npm pack --dry-run                      # only dist/ files, reasonable size
```

### 6c. Test locally with npm pack

```bash
cd apps/tldraw-mcp
npm pack
npm install -g ./tldraw-mcp-server-0.1.0.tgz
tldraw-mcp-server --stdio              # starts stdio server
tldraw-mcp-server                      # starts HTTP server on :3001
```

**Test checkpoint 6c:**

- [ ] `tldraw-mcp-server --stdio` — responds to initialize JSON-RPC
- [ ] `tldraw-mcp-server` — HTTP server starts, `curl localhost:3001/mcp` returns response
- [ ] Claude Desktop config with `"command": "tldraw-mcp-server", "args": ["--stdio"]` — widget renders

Clean up:

```bash
npm uninstall -g @tldraw/mcp-server && rm *.tgz
```

### 6d. Publish

```bash
npm login   # ensure @tldraw org access
cd apps/tldraw-mcp
npm publish --access public
```

**Test checkpoint 6d:**

```bash
npx @tldraw/mcp-server@latest --stdio  # works from clean environment
```

### What this step does NOT include (follow-ups)

- README / docs (can add later, not needed for initial publish)
- GitHub Actions automated publish workflow
- MCP Registry registration
- Publish script (just run `npm publish --access public` directly)
