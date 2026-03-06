/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers entry point for the tldraw MCP server.
 *
 * Uses a Durable Object (McpAgent) with SQLite for persistent checkpoint storage,
 * R2 for image uploads, and the shared registerTools() for tool registration.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import type { TLShape } from 'tldraw'
import { Logger } from './logger'
import { registerTools } from './register-tools'
import type { MCP_APP_HOST_NAMES, ServerDeps } from './shared/types'
import {
	MAX_CHECKPOINTS,
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_INSTRUCTIONS,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from './shared/types'
import { parseTlShapes, resolveMcpAppHostName } from './shared/utils'

// --- Types ---

interface Env {
	MCP_OBJECT: DurableObjectNamespace
	ASSETS: Fetcher
	RATE_LIMITER: RateLimit
	MCP_AUTH_TOKEN: string
	WORKER_ORIGIN: string
	MCP_DOMAIN_OPENAI: string
	MCP_DOMAIN_CLAUDE: string
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
	activeCheckpointId: string | null = null
	sessionId: string = ''
	logger = new Logger('TldrawMCP')
	clientHostName: MCP_APP_HOST_NAMES | undefined = undefined

	async init() {
		this.logger.info('Initializing Durable Object')

		this.server.server.oninitialized = () => {
			const clientInfo = this.server.server.getClientVersion()
			const resolved = resolveMcpAppHostName(clientInfo?.name ?? '')
			if (resolved) {
				this.clientHostName = resolved
				void this
					.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('clientHostName', ${resolved})`
			}
			this.logger.info(`Client connected: ${this.clientHostName ?? 'unknown'}`)
		}

		// --- DO SQLite setup ---
		void this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		void this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`

		// Restore active checkpoint on reconnect
		const rows = [...this.sql`SELECT value FROM meta WHERE key = 'activeCheckpointId'`]
		if (rows.length > 0) {
			this.activeCheckpointId = rows[0].value as string
			this.logger.info('Restored active checkpoint', { checkpointId: this.activeCheckpointId })
		}

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

		// --- Build ServerDeps from SQLite ---
		const deps: ServerDeps = {
			saveCheckpoint: (id, shapes, assets = [], bindings = []) =>
				this.saveCheckpoint(id, shapes, assets, bindings),
			loadCheckpoint: (id) => this.loadCheckpoint(id),
			getActiveShapes: () => this.getActiveShapes(),
			getActiveAssets: () => this.getActiveAssets(),
			getActiveBindings: () => this.getActiveBindings(),
			getActiveCheckpointId: () => this.activeCheckpointId,
			setActiveCheckpointId: (id) => {
				this.activeCheckpointId = id
				void this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`
			},
			getSessionId: () => this.sessionId,
			loadWidgetHtml: async () => widgetHtml,
		}

		const workerOrigin = this.env.WORKER_ORIGIN || ''
		const domainOpenai = this.env.MCP_DOMAIN_OPENAI || ''
		const domainClaude = this.env.MCP_DOMAIN_CLAUDE || ''

		registerTools(this.server, deps, {
			log: this.logger.toLogFn(),
			extraResourceDomains: workerOrigin ? [workerOrigin] : [],
			extraConnectDomains: workerOrigin ? [workerOrigin] : [],
			httpDomain:
				domainOpenai || domainClaude ? { openai: domainOpenai, claude: domainClaude } : undefined,
			analytics: this.env.MCP_ANALYTICS,
			getClientHostName: () => this.clientHostName,
		})

		this.logger.info('Initialization complete')
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[], assets: unknown[] = [], bindings: unknown[] = []) {
		const data = JSON.stringify({ shapes, assets, bindings })
		void this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${data}, ${Date.now()})`
		this.activeCheckpointId = id
		void this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`

		// Evict old checkpoints beyond MAX_CHECKPOINTS (LRU)
		void this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS})`

		this.logger.debug('Checkpoint saved', { checkpointId: id, shapes: shapes.length })
	}

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

	getActiveBindings(): unknown[] {
		if (!this.activeCheckpointId) return []
		const checkpoint = this.loadCheckpoint(this.activeCheckpointId)
		return checkpoint ? checkpoint.bindings : []
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
			const url = new URL(request.url)

			// CORS preflight
			if (request.method === 'OPTIONS') {
				return new Response(null, { status: 204, headers: CORS_HEADERS })
			}

			// Health check (no auth)
			if (url.pathname === '/health') {
				return Response.json({ status: 'ok', timestamp: Date.now() })
			}

			// Auth check for MCP endpoints: skip if MCP_AUTH_TOKEN not set (local dev)
			if (env.MCP_AUTH_TOKEN) {
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
				return mcpHandler.fetch(request, env, ctx)
			}

			return new Response('Not found', { status: 404 })
		} catch (err) {
			console.error(err)
			return new Response('Internal Server Error', { status: 500 })
		}
	},
}
