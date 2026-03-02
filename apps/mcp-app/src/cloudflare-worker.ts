/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers entry point for the tldraw MCP server.
 *
 * Uses a Durable Object (McpAgent) with SQLite for persistent checkpoint storage,
 * R2 for image uploads, and the shared registerTools() for tool registration.
 */

import { verifyToken } from '@clerk/backend'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import type { TLShape } from 'tldraw'
import { registerTools } from './register-tools'
import type { ServerDeps } from './shared/types'
import { ALLOWED_IMAGE_TYPES, MAX_CHECKPOINTS } from './shared/types'
import { parseTlShapes } from './shared/utils'

// --- Types ---

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	ASSETS: Fetcher
	IMAGES: R2Bucket
	RATE_LIMITER: RateLimit
	MCP_AUTH_TOKEN: string
	WORKER_ORIGIN: string
	MCP_DOMAIN_OPENAI: string
	MCP_DOMAIN_CLAUDE: string
	CLERK_SECRET_KEY?: string
}

// --- Widget HTML loader ---

async function loadWidgetHtml(assets: Fetcher): Promise<string> {
	const response = await assets.fetch(new Request('https://assets.local/mcp-app.html'))
	if (!response.ok) throw new Error(`Failed to load widget HTML: ${response.status}`)
	return response.text()
}

// --- CORS helpers ---

const CORS_HEADERS: Record<string, string> = {
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
// Use `as any` for the server property because we alias @modelcontextprotocol/sdk
// to the agents' bundled copy at runtime (via wrangler.toml [alias]), but TypeScript
// sees our direct dependency's types which are a different declaration.

export class TldrawMCP extends McpAgent<Env> {
	server = new McpServer({ name: 'tldraw', version: '1.0.0' }) as any
	activeCheckpointId: string | null = null

	async init() {
		// --- DO SQLite setup ---
		void this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		void this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`

		// Restore active checkpoint on reconnect
		const rows = [...this.sql`SELECT value FROM meta WHERE key = 'activeCheckpointId'`]
		if (rows.length > 0) this.activeCheckpointId = rows[0].value as string

		// --- Widget HTML (loaded once from Assets binding) ---
		const widgetHtml = await loadWidgetHtml((this as any).env.ASSETS)

		// --- Build ServerDeps from SQLite ---
		const deps: ServerDeps = {
			saveCheckpoint: (id, shapes, assets = []) => this.saveCheckpoint(id, shapes, assets),
			loadCheckpoint: (id) => this.loadCheckpoint(id),
			getActiveShapes: () => this.getActiveShapes(),
			getActiveAssets: () => this.getActiveAssets(),
			getActiveCheckpointId: () => this.activeCheckpointId,
			setActiveCheckpointId: (id) => {
				this.activeCheckpointId = id
				void this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`
			},
			loadWidgetHtml: async () => widgetHtml,
		}

		const workerOrigin = (this as any).env.WORKER_ORIGIN || ''
		const domainOpenai = ((this as any).env as Env).MCP_DOMAIN_OPENAI || ''
		const domainClaude = ((this as any).env as Env).MCP_DOMAIN_CLAUDE || ''

		registerTools(this.server, deps, {
			extraResourceDomains: workerOrigin ? [workerOrigin] : [],
			extraConnectDomains: workerOrigin ? [workerOrigin] : [],
			httpDomain:
				domainOpenai || domainClaude ? { openai: domainOpenai, claude: domainClaude } : undefined,
			uploadImageHandler: async ({ filename, base64, contentType, clerkToken }) => {
				const env = (this as any).env as Env

				// Clerk JWT verification
				if (!clerkToken) {
					throw new Error('Authentication required to upload images. Please sign in.')
				}
				if (!env.CLERK_SECRET_KEY) {
					throw new Error('Server authentication not configured.')
				}

				let userId: string
				try {
					const payload = await verifyToken(clerkToken, {
						secretKey: env.CLERK_SECRET_KEY,
						clockSkewInMs: 10_000,
					})
					userId = payload.sub
				} catch {
					throw new Error('Invalid or expired authentication token. Please sign in again.')
				}

				if (!/^user_[a-zA-Z0-9]+$/.test(userId)) {
					throw new Error('Invalid user ID format.')
				}

				// Upload to R2 with userId-prefixed key
				const ext = ALLOWED_IMAGE_TYPES[contentType]
				if (!ext) {
					throw new Error(
						`Unsupported content type: ${contentType}. Allowed: ${Object.keys(ALLOWED_IMAGE_TYPES).join(', ')}`
					)
				}

				const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
				const key = `images/${userId}/${crypto.randomUUID()}.${ext}`

				await env.IMAGES.put(key, bytes, {
					httpMetadata: { contentType },
					customMetadata: {
						originalFilename: filename,
						uploadedBy: userId,
						uploadedAt: new Date().toISOString(),
					},
				})

				const origin = env.WORKER_ORIGIN || ''
				const imageUrl = `${origin}/${key}`

				return { imageUrl, key, contentType }
			},
		})
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[], assets: unknown[] = []) {
		const data = JSON.stringify({ shapes, assets })
		void this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${data}, ${Date.now()})`
		this.activeCheckpointId = id
		void this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`

		// Evict old checkpoints beyond MAX_CHECKPOINTS (LRU)
		void this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS})`
	}

	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[] } | null {
		const rows = [...this.sql`SELECT data FROM checkpoints WHERE id = ${id}`]
		if (rows.length === 0) return null
		const parsed = JSON.parse(rows[0].data as string)
		// Backwards compat: old checkpoints stored a plain array of shapes
		if (Array.isArray(parsed)) return { shapes: parsed, assets: [] }
		return { shapes: parsed.shapes ?? [], assets: parsed.assets ?? [] }
	}

	getActiveShapes(): TLShape[] {
		if (!this.activeCheckpointId) return []
		const checkpoint = this.loadCheckpoint(this.activeCheckpointId)
		return checkpoint ? parseTlShapes(checkpoint.shapes) : []
	}

	getActiveAssets(): unknown[] {
		if (!this.activeCheckpointId) return []
		const checkpoint = this.loadCheckpoint(this.activeCheckpointId)
		return checkpoint ? checkpoint.assets : []
	}
}

// --- Fetch handler ---
// McpAgent.serve() handles CORS, session management, and transport internally.
// Expose both transports: Streamable HTTP at /mcp, SSE at /sse.

const mcpHandler = (TldrawMCP as any).serve('/mcp')
const sseHandler = (TldrawMCP as any).serveSSE('/sse')

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url)

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS })
		}

		// Health check (no auth)
		if (url.pathname === '/health') return new Response('OK')

		// R2 image serving (no auth — public, immutable assets)
		if (url.pathname.startsWith('/images/')) {
			return handleImageRequest(url, env)
		}

		// Auth check for MCP endpoints: skip if MCP_AUTH_TOKEN not set (local dev)
		if (env.MCP_AUTH_TOKEN) {
			const auth = request.headers.get('Authorization')
			if (auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
				return corsResponse(new Response('Unauthorized', { status: 401 }))
			}
		}

		// Rate limit by MCP session (POST without session ID is the initial handshake)
		const sessionId = request.headers.get('mcp-session-id')
		if (!sessionId && request.method !== 'POST') {
			return corsResponse(new Response('Missing session', { status: 400 }))
		}
		if (sessionId) {
			const { success } = await env.RATE_LIMITER.limit({ key: sessionId })
			if (!success) {
				return corsResponse(new Response('Rate limited', { status: 429 }))
			}
		}

		// SSE transport (for MCP Inspector and legacy clients)
		if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
			return sseHandler.fetch(request, env, ctx)
		}

		// Streamable HTTP transport (for Claude web, ChatGPT, and modern clients)
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			return mcpHandler.fetch(request, env, ctx)
		}

		return new Response('Not found', { status: 404 })
	},
}

async function handleImageRequest(url: URL, env: Env): Promise<Response> {
	const key = url.pathname.slice(1) // "images/{userId}/uuid.png"
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
