/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers entry point for the tldraw MCP server.
 *
 * The McpAgent Durable Object (TldrawMCP) is a transport front: all canvas
 * state and exec coordination live in per-canvas CanvasStore DOs addressed by
 * idFromName('canvas:<canvasId>') — never by MCP session, which hosts do not
 * keep stable across model-initiated and widget-initiated calls.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { CanvasStore } from './canvas-store'
import { Logger } from './logger'
import { registerTools } from './register-tools'
import { loadEditorApiSpecFromAssets, loadMethodMapFromAssets } from './shared/generated-data'
import {
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_INSTRUCTIONS,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from './shared/types'
import type { CanvasStoreStub, MCP_APP_HOST_NAMES, ServerDeps } from './shared/types'
import { resolveMcpAppHostNameFromServerInfo } from './shared/utils'

// --- Types ---

export { CanvasStore }

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	CANVAS_STORE: DurableObjectNamespace<CanvasStore>
	ASSETS: Fetcher
	LOADER: WorkerLoader
	RATE_LIMITER: RateLimit
	MCP_AUTH_TOKEN: string
	MCP_IS_DEV: string
	WORKER_ORIGIN: string
	MCP_ANALYTICS?: AnalyticsEngineDataset
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
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
	override server = new McpServer(
		{
			name: MCP_SERVER_NAME,
			title: MCP_SERVER_TITLE,
			version: MCP_SERVER_VERSION,
			description: MCP_SERVER_DESCRIPTION,
			websiteUrl: MCP_SERVER_WEBSITE_URL,
		},
		{
			instructions: MCP_SERVER_INSTRUCTIONS,
		}
	)
	isDev = this.env.MCP_IS_DEV === 'true'
	sessionId: string = ''
	// Always log: the coordination paths this server runs must be observable
	// in production, not only in dev.
	logger = new Logger('TldrawMCP', true)
	clientHostName: MCP_APP_HOST_NAMES | undefined = undefined

	/** The MCP session ID used for DO routing (extracted from DO name). */
	getMcpSessionId(): string {
		return (this as any).name?.replace(/^streamable-http:/, '') ?? ''
	}

	async init() {
		this.server.server.oninitialized = () => {
			const clientInfo = this.server.server.getClientVersion()
			const resolved = resolveMcpAppHostNameFromServerInfo(clientInfo?.name ?? '')
			if (resolved) {
				this.clientHostName = resolved
				void this
					.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('clientHostName', ${resolved})`
			}
			this.logger.info(`Client connected: ${this.clientHostName ?? 'unknown'}`)
		}

		// --- DO SQLite setup ---
		// The checkpoints/canvas_checkpoints tables are the pre-redesign
		// session-keyed store. They are read-only now: a lazy fallback so old
		// canvasIds from this session keep working as exec bases. New state
		// lives in the per-canvas CanvasStore DOs.
		void this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		void this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`
		void this
			.sql`CREATE TABLE IF NOT EXISTS canvas_checkpoints (canvas_id TEXT PRIMARY KEY, checkpoint_id TEXT)`

		// Restore client host name on reconnect
		const hostNameRows = [...this.sql`SELECT value FROM meta WHERE key = 'clientHostName'`]
		if (hostNameRows.length > 0) {
			this.clientHostName = hostNameRows[0].value as MCP_APP_HOST_NAMES
			this.logger.info(`Restored client host name: ${this.clientHostName}`)
		}

		// Restore or generate session ID
		const sessionRows = [...this.sql`SELECT value FROM meta WHERE key = 'sessionId'`]
		if (sessionRows.length > 0) {
			this.sessionId = sessionRows[0].value as string
		} else {
			this.sessionId = crypto.randomUUID()
			void this
				.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('sessionId', ${this.sessionId})`

			// Track new session
			this.env.MCP_ANALYTICS?.writeDataPoint({
				blobs: ['session_start', this.sessionId],
				doubles: [Date.now()],
			})
		}

		// --- Widget HTML (loaded once from Assets binding) ---
		const widgetHtml = await loadWidgetHtml(this.env.ASSETS)
		let editorApiSpecPromise: ReturnType<typeof loadEditorApiSpecFromAssets> | null = null
		let methodMapPromise: ReturnType<typeof loadMethodMapFromAssets> | null = null

		// --- Per-canvas state + job authority ---
		const canvasStoreNs = this.env.CANVAS_STORE
		const getCanvasStub = (canvasId: string): CanvasStoreStub =>
			canvasStoreNs.get(
				canvasStoreNs.idFromName(`canvas:${canvasId}`)
			) as unknown as CanvasStoreStub

		// --- Build ServerDeps ---
		const deps: ServerDeps = {
			getCanvasStub,
			getCanvasCheckpointId: (canvasId) => {
				const rows = [
					...this.sql`SELECT checkpoint_id FROM canvas_checkpoints WHERE canvas_id = ${canvasId}`,
				]
				return rows.length > 0 ? (rows[0].checkpoint_id as string) : null
			},
			loadCheckpoint: (id) => this.loadCheckpoint(id),
			getSessionId: () => this.sessionId,
			getMcpSessionId: () => this.getMcpSessionId(),
			loadWidgetHtml: async () => widgetHtml,
			loadEditorApiSpec: async () => {
				editorApiSpecPromise ??= loadEditorApiSpecFromAssets(this.env.ASSETS)
				return editorApiSpecPromise
			},
			loadMethodMap: async () => {
				methodMapPromise ??= loadMethodMapFromAssets(this.env.ASSETS)
				return methodMapPromise
			},
		}

		const workerOrigin = this.env.WORKER_ORIGIN

		registerTools(this.server, deps, {
			log: this.logger.toLogFn(),
			extraResourceDomains: workerOrigin ? [workerOrigin] : [],
			extraConnectDomains: workerOrigin ? [workerOrigin] : [],
			searchWorkerLoader: this.env.LOADER,
			workerOrigin,
			isDev: this.isDev,
			analytics: this.env.MCP_ANALYTICS,
			getClientHostName: () => this.clientHostName,
		})
	}

	// --- Legacy checkpoint read (pre-redesign canvases) ---

	loadCheckpoint(id: string): { shapes: unknown[]; assets: unknown[]; bindings: unknown[] } | null {
		const rows = [...this.sql`SELECT data FROM checkpoints WHERE id = ${id}`]
		if (rows.length === 0) return null
		const parsed = JSON.parse(rows[0].data as string)
		// Backwards compat: old checkpoints stored a plain array of shapes
		if (Array.isArray(parsed)) return { shapes: parsed, assets: [], bindings: [] }
		return {
			shapes: parsed.shapes ?? [],
			assets: parsed.assets ?? [],
			bindings: parsed.bindings ?? [],
		}
	}
}

// --- Fetch handler ---
// McpAgent.serve() handles CORS, session management, and transport internally.
// Expose both transports: Streamable HTTP at /mcp, SSE at /sse.

const mcpHandler = TldrawMCP.serve('/mcp')
const sseHandler = TldrawMCP.serveSSE('/sse')

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		try {
			const requireAuth = Boolean(env.MCP_AUTH_TOKEN)
			const url = new URL(request.url)

			// CORS preflight
			if (request.method === 'OPTIONS') {
				return new Response(null, { status: 204, headers: CORS_HEADERS })
			}

			// Health check (no auth)
			if (url.pathname === '/health') {
				return Response.json({ status: 'ok', timestamp: Date.now() })
			}

			// Domain verification (no auth)
			if (url.pathname === '/.well-known/openai-apps-challenge') {
				return new Response('SG4iyi_lKvsvOJA-QN3UOJZeISqeAf4tnnxqgRMTU0k', {
					headers: { 'Content-Type': 'text/plain' },
				})
			}

			// Require bearer auth only when an auth token is configured.
			if (requireAuth) {
				const auth = request.headers.get('Authorization')
				if (auth !== `Bearer ${env.MCP_AUTH_TOKEN}`) {
					return corsResponse(new Response('Unauthorized', { status: 401 }))
				}
			}

			// SSE transport (legacy)
			if (url.pathname === '/sse' || url.pathname.startsWith('/sse/')) {
				return sseHandler.fetch(request, env, ctx)
			}

			// Streamable HTTP transport
			if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
				const sessionId = request.headers.get('mcp-session-id')
				const forwardedFor = request.headers.get('x-forwarded-for')
				const clientIp =
					request.headers.get('cf-connecting-ip') ?? forwardedFor?.split(',')[0]?.trim()
				const rateLimitKey = sessionId
					? `mcp-session:${sessionId}`
					: `mcp-ip:${clientIp ?? 'unknown'}`

				const { success } = await env.RATE_LIMITER.limit({ key: rateLimitKey })
				if (!success) {
					return corsResponse(new Response('Rate limited', { status: 429 }))
				}

				// POST without a session ID is the initial handshake.
				if (!sessionId && request.method !== 'POST') {
					return corsResponse(new Response('Missing session', { status: 400 }))
				}
				return mcpHandler.fetch(request, env, ctx)
			}

			return new Response('Not found', { status: 404 })
		} catch (err) {
			console.error(err)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
