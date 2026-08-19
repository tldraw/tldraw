/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers entry point for the tldraw MCP server.
 *
 * Uses a Durable Object (McpAgent) with SQLite for persistent checkpoint storage,
 * R2 for image uploads, and the shared registerTools() for tool registration.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { McpAgent } from 'agents/mcp'
import { CanvasStore } from './canvas-store'
import { Logger } from './logger'
import { decidePrune } from './prune'
import type { PruneResult, PruneStats } from './prune'
import { registerTools } from './register-tools'
import { loadEditorApiSpecFromAssets, loadMethodMapFromAssets } from './shared/generated-data'
import { PendingRequests } from './shared/pending-requests'
import {
	IDLE_TTL_MS,
	MAX_CHECKPOINTS,
	MCP_SERVER_DESCRIPTION,
	MCP_SERVER_INSTRUCTIONS,
	MCP_SERVER_NAME,
	MCP_SERVER_TITLE,
	MCP_SERVER_VERSION,
	MCP_SERVER_WEBSITE_URL,
} from './shared/types'
import type { MCP_APP_HOST_NAMES, PendingBootstrap, ServerDeps } from './shared/types'
import { resolveMcpAppHostNameFromServerInfo } from './shared/utils'

// --- Types ---

export { CanvasStore }

interface Env {
	MCP_OBJECT: DurableObjectNamespace<TldrawMCP>
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
	// The Agents SDK defaults `observability` to an implementation whose `emit()`
	// is a bare `console.log(event)`, so every WebSocket connection logs a full
	// JSON object. The streamable-HTTP transport opens a connection per request,
	// making this the single noisiest thing the worker prints. Every call site
	// uses `this.observability?.emit(...)`, so clearing it disables them all.
	override observability = undefined
	// The SDK's default DurableObjectEventStore persists every outgoing message to DO storage
	// (for Last-Event-ID replay) before writing it to the wire. SQLite-backed DO storage caps a
	// value at 2MB, and our widget resource is ~2.4MB — the put throws, the rejection is
	// swallowed, and the response silently never sends (the mcp-app hang of Aug 2026). The
	// transport optional-chains the store, so disabling it sends messages straight to the
	// stream. Costs stream resumability, which the MCP spec makes optional and which 0.5.x
	// never had either. See the large-payload smoke test before re-enabling.
	override getEventStore() {
		return undefined
	}
	isDev = this.env.MCP_IS_DEV === 'true'
	logsEnabled = this.isDev
	activeCheckpointId: string | null = null
	sessionId: string = ''
	logger = new Logger('TldrawMCP', this.logsEnabled)
	clientHostName: MCP_APP_HOST_NAMES | undefined = undefined
	pendingRequests = new PendingRequests()
	pendingBootstrap: PendingBootstrap | null = null

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
		void this
			.sql`CREATE TABLE IF NOT EXISTS checkpoints (id TEXT PRIMARY KEY, data TEXT, created_at INTEGER)`
		void this.sql`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`
		void this
			.sql`CREATE TABLE IF NOT EXISTS canvas_checkpoints (canvas_id TEXT PRIMARY KEY, checkpoint_id TEXT)`

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
		let editorApiSpecPromise: ReturnType<typeof loadEditorApiSpecFromAssets> | null = null
		let methodMapPromise: ReturnType<typeof loadMethodMapFromAssets> | null = null

		// --- Exec rendezvous stubs (host-session-independent result handoff) ---
		const canvasStoreNs = this.env.CANVAS_STORE
		const canvasStoreStub = (name: string) => canvasStoreNs.get(canvasStoreNs.idFromName(name))

		// --- Build ServerDeps from SQLite ---
		const deps: ServerDeps = {
			saveCheckpoint: (id, shapes, assets = [], bindings = []) =>
				this.saveCheckpoint(id, shapes, assets, bindings),
			loadCheckpoint: (id) => this.loadCheckpoint(id),
			getActiveCheckpointId: () => this.activeCheckpointId,
			setActiveCheckpointId: (id) => {
				this.activeCheckpointId = id
				void this.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('activeCheckpointId', ${id})`
			},
			getCanvasCheckpointId: (canvasId) => {
				const rows = [
					...this.sql`SELECT checkpoint_id FROM canvas_checkpoints WHERE canvas_id = ${canvasId}`,
				]
				return rows.length > 0 ? (rows[0].checkpoint_id as string) : null
			},
			setCanvasCheckpointId: (canvasId, checkpointId) => {
				void this
					.sql`INSERT OR REPLACE INTO canvas_checkpoints (canvas_id, checkpoint_id) VALUES (${canvasId}, ${checkpointId})`
			},
			setPendingBootstrap: (bootstrap) => {
				this.pendingBootstrap = bootstrap
			},
			consumePendingBootstrap: () => {
				const b = this.pendingBootstrap
				this.pendingBootstrap = null
				return b
			},
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
			putExecResult: async (execKey, payload) => {
				const { delivered } = await canvasStoreStub(`exec:${execKey}`).putExecResult(
					execKey,
					JSON.stringify(payload)
				)
				return delivered
			},
			waitExecResult: async (execKey, timeoutMs, notBefore) => {
				const payload = await canvasStoreStub(`exec:${execKey}`).waitExecResult(
					execKey,
					timeoutMs,
					notBefore
				)
				return payload ? JSON.parse(payload) : null
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
			pendingRequests: this.pendingRequests,
		})

		// Every DO that initializes gets its own expiry, including sessions that
		// never save and junk DOs minted by stale-session probes. `idempotent`
		// dedups on callback+payload across cold starts; without it the SDK warns
		// on every wake and stacks rows. Failure here must not fail init — the
		// admin prune endpoint is the backstop.
		try {
			await this.schedule(new Date(Date.now() + IDLE_TTL_MS), 'expireIfIdle', null, {
				idempotent: true,
			})
		} catch (err) {
			this.logger.info('Failed to arm idle expiry', { err: String(err) })
		}
	}

	// --- Checkpoint helpers ---

	saveCheckpoint(id: string, shapes: unknown[], assets: unknown[] = [], bindings: unknown[] = []) {
		const data = JSON.stringify({ shapes, assets, bindings })
		void this
			.sql`INSERT OR REPLACE INTO checkpoints (id, data, created_at) VALUES (${id}, ${data}, ${Date.now()})`
		void this
			.sql`INSERT OR REPLACE INTO meta (key, value) VALUES ('lastActivity', ${String(Date.now())})`
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

	// --- Idle pruning ---

	/**
	 * Reads the activity signals without assuming init() ran: on a cold legacy
	 * DO woken by a raw RPC, our tables may not exist, so every read tolerates
	 * `no such table` and reports "never active".
	 */
	readPruneStats(): PruneStats {
		const sql = this.ctx.storage.sql
		let lastActivity: number | null = null
		let checkpointCount = 0
		try {
			const meta = sql.exec(`SELECT value FROM meta WHERE key = 'lastActivity'`).toArray()
			if (meta.length > 0) lastActivity = Number(meta[0].value)
		} catch {
			// no meta table
		}
		try {
			const cp = sql
				.exec(`SELECT COUNT(*) AS n, MAX(created_at) AS last FROM checkpoints`)
				.toArray()
			if (cp.length > 0) {
				checkpointCount = Number(cp[0].n ?? 0)
				// Legacy DOs predate the lastActivity key; the newest snapshot is the next best signal.
				if (lastActivity === null && cp[0].last != null) lastActivity = Number(cp[0].last)
			}
		} catch {
			// no checkpoints table
		}
		return { lastActivity, checkpointCount }
	}

	/**
	 * Condemns this DO if it has been idle for `maxIdleMs`. Never calls destroy()
	 * inline: it writes the SDK's own durable destroy marker and arms an immediate
	 * alarm, and Agent.alarm() runs destroy() in a fresh invocation before any
	 * onStart/init(). That keeps the prune path off `this.name`, which throws on
	 * idFromString stubs. The marker doubles as the idempotency guard across
	 * script retries and evictions.
	 */
	async pruneIfIdle(maxIdleMs: number, dryRun: boolean): Promise<PruneResult> {
		const id = this.ctx.id.toString()
		const bytes = this.ctx.storage.sql.databaseSize
		if (await this.ctx.storage.get('cf_agents_destroy_pending')) {
			return { id, idleMs: 0, checkpointCount: 0, bytes, action: 'kept', note: 'already condemned' }
		}
		const stats = this.readPruneStats()
		const { idleMs, action } = decidePrune(stats, Date.now(), maxIdleMs, dryRun)
		if (action === 'destroy-scheduled') {
			this.env.MCP_ANALYTICS?.writeDataPoint({ blobs: ['session_end', id], doubles: [Date.now()] })
			await this.ctx.storage.put('cf_agents_destroy_pending', true)
			await this.ctx.storage.setAlarm(Date.now())
		}
		return { id, idleMs, checkpointCount: stats.checkpointCount, bytes, action }
	}

	/**
	 * Scheduler callback. Re-arms WITHOUT `idempotent`: the SDK deletes the
	 * executing schedule row only after this returns, so a deduped re-arm would
	 * match that row, skip, and then lose it — leaving the DO without any future
	 * expiry. On the condemned branch we return without re-arming; the marker
	 * already owns the next alarm.
	 */
	async expireIfIdle(): Promise<void> {
		const result = await this.pruneIfIdle(IDLE_TTL_MS, false)
		if (result.action !== 'kept') return
		const { lastActivity } = this.readPruneStats()
		const next = (lastActivity ?? Date.now()) + IDLE_TTL_MS
		try {
			await this.schedule(new Date(Math.max(next, Date.now() + 60_000)), 'expireIfIdle', null)
		} catch (err) {
			this.logger.info('Failed to re-arm idle expiry', { err: String(err) })
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
