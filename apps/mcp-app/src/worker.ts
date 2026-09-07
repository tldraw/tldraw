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
	nextExpiryTime,
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
	IDLE_TTL_MS_OVERRIDE?: string
}

// Gated on MCP_IS_DEV so no deployed env can shorten the TTL. idle-expiry.test.ts
// needs it: the real TTL is seven days, and the test has to see an alarm fire.
function idleTtlMs(env: Env): number {
	const override = env.MCP_IS_DEV === 'true' ? Number(env.IDLE_TTL_MS_OVERRIDE) : NaN
	return Number.isFinite(override) && override > 0 ? override : IDLE_TTL_MS
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
	// Also load-bearing for teardown: destroy() calls _emit(), whose `name: this.name`
	// argument is only skipped because the optional chain short-circuits. On the
	// destroy-marker alarm branch, which returns before partyserver's init runs,
	// #_name is never hydrated and reading it throws.
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
		// on every wake and stacks rows. Failure here must not fail init — the next
		// wake re-arms.
		try {
			await this.schedule(new Date(Date.now() + idleTtlMs(this.env)), 'expireIfIdle', null, {
				idempotent: true,
			})
		} catch (err) {
			// console.error, not this.logger: the logger is dev-only and a silently
			// unarmed expiry is the failure this branch exists to prevent.
			console.error('[TldrawMCP] failed to arm idle expiry', this.ctx.id.toString(), err)
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

		// Keep the LRU window, but never evict a checkpoint a canvas still points at: a
		// multi-canvas session would otherwise silently reopen an older canvas empty.
		// `IS NOT NULL`: one NULL in a NOT IN subquery makes the whole predicate NULL and
		// the DELETE silently matches nothing, forever.
		void this
			.sql`DELETE FROM checkpoints WHERE id NOT IN (SELECT id FROM checkpoints ORDER BY created_at DESC LIMIT ${MAX_CHECKPOINTS}) AND id NOT IN (SELECT checkpoint_id FROM canvas_checkpoints WHERE checkpoint_id IS NOT NULL)`

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

	/**
	 * The last time this session did anything, or null if it never did.
	 *
	 * Tolerating `no such table` is defensive: expiry callbacks run after init()
	 * has created the tables, so a missing one means something unexpected, and
	 * reporting "never active" is the conservative read.
	 */
	readLastActivity(): number | null {
		const sql = this.ctx.storage.sql
		let lastActivity: number | null = null
		// Only a missing table means "never active". Any other storage error must
		// propagate: swallowing it reads as null → infinitely idle → a live session
		// gets destroyed on a transient storage hiccup.
		const tableRows = (query: string) => {
			try {
				return sql.exec(query).toArray()
			} catch (err) {
				if (/no such table/.test(String(err))) return []
				throw err
			}
		}
		const meta = tableRows(`SELECT value FROM meta WHERE key = 'lastActivity'`)
		if (meta.length > 0) {
			const n = Number(meta[0].value)
			// A corrupt value must fail toward keep, not toward destroy.
			lastActivity = Number.isFinite(n) ? n : null
		}
		// Legacy DOs predate the lastActivity key; the newest snapshot is the next best signal.
		if (lastActivity === null) {
			const cp = tableRows(`SELECT MAX(created_at) AS last FROM checkpoints`)
			if (cp.length > 0 && cp[0].last != null) {
				const n = Number(cp[0].last)
				if (Number.isFinite(n)) lastActivity = n
			}
		}
		return lastActivity
	}

	/**
	 * Teardown without the SDK's trailing `ctx.abort("destroyed")`.
	 *
	 * Cloudflare reclaims an object only when "it shuts down [and] its storage is
	 * empty". An abort is not a shutdown, so aborting straight after deleteAll()
	 * appears to leave the object emptied but still enumerated — and still billed.
	 * Skipping the abort means taking over its other job: severing connections, or a
	 * client-held stream keeps the wiped instance alive.
	 */
	override async destroy() {
		this.selfDestroyed = true
		const abort = this.ctx.abort.bind(this.ctx)
		this.ctx.abort = (reason?: string) => {
			if (reason !== 'destroyed') abort(reason)
		}
		for (const conn of this.getConnections()) {
			// close() throws synchronously on an already-closing socket; a throw here
			// would wedge teardown before the storage wipe.
			try {
				conn.close(1000, 'Session closed')
			} catch {
				// already closing
			}
		}
		await super.destroy()
	}

	/** True once this instance has torn itself down; it must not serve requests after. */
	private selfDestroyed = false

	override async fetch(request: Request) {
		if (this.selfDestroyed) return new Response('Session destroyed', { status: 404 })
		return super.fetch(request)
	}

	/**
	 * Condemns this DO if it has been idle for `maxIdleMs`, and reports whether it
	 * was kept. Never calls destroy() inline: it writes the SDK's own durable
	 * destroy marker, and Agent.alarm() runs destroy() from its marker branch, which
	 * returns before reaching the partyserver alarm body that runs onStart/init().
	 * That keeps this path off `this.name`, unhydrated on that branch alone — an
	 * ordinary schedule callback does go through init. The marker doubles as the
	 * idempotency guard across evictions.
	 *
	 * The setAlarm calls are a fallback. The SDK re-arms after every schedule
	 * callback returns, and that path sees the marker and calls `setAlarm(now)`
	 * itself, so any delay we asked for is overwritten — these writes only matter
	 * if that re-arm never runs.
	 */
	async destroyIfIdle(maxIdleMs: number): Promise<{ kept: boolean }> {
		if (await this.ctx.storage.get('cf_agents_destroy_pending')) {
			// Marker without an alarm (setAlarm failed or the invocation died between the
			// two writes) leaves the DO condemned but never torn down. Re-arm; setAlarm
			// is idempotent if one is pending.
			await this.ctx.storage.setAlarm(Date.now())
			return { kept: false }
		}
		const lastActivity = this.readLastActivity()
		// A DO that never recorded activity is treated as maximally idle.
		const idleMs = lastActivity === null ? Infinity : Date.now() - lastActivity
		if (idleMs < maxIdleMs) return { kept: true }
		this.env.MCP_ANALYTICS?.writeDataPoint({
			blobs: ['session_end', this.ctx.id.toString()],
			doubles: [Date.now()],
		})
		await this.ctx.storage.put('cf_agents_destroy_pending', true)
		await this.ctx.storage.setAlarm(Date.now())
		return { kept: false }
	}

	/**
	 * Scheduler callback. Re-arms WITHOUT `idempotent`: the SDK deletes the
	 * executing schedule row only after this returns, so a deduped re-arm would
	 * match that row, skip, and then lose it — leaving the DO without any future
	 * expiry. On the condemned branch we return without re-arming; the marker
	 * already owns the next alarm. A throw from the check must still fall through
	 * to the re-arm, for the same reason: no re-arm after a throw means no future
	 * check either.
	 */
	async expireIfIdle(): Promise<void> {
		let kept = true
		let failed = false
		let lastActivity: number | null = null
		try {
			kept = (await this.destroyIfIdle(idleTtlMs(this.env))).kept
			if (kept) lastActivity = this.readLastActivity()
		} catch (err) {
			// Must fall through to the re-arm; see the doc comment above.
			failed = true
			console.error('[TldrawMCP] expireIfIdle check failed', this.ctx.id.toString(), err)
		}
		if (!kept) return
		const next = nextExpiryTime({
			failed,
			lastActivity,
			now: Date.now(),
			ttlMs: idleTtlMs(this.env),
		})
		try {
			await this.schedule(new Date(next), 'expireIfIdle', null)
		} catch (err) {
			// Without the id a failed re-arm is an object that silently stops expiring
			// and cannot be traced back from the logs.
			console.error('[TldrawMCP] failed to re-arm idle expiry', this.ctx.id.toString(), err)
		}
	}

	/** Dev helper for idle-expiry.test.ts: inspect the armed expiry schedule row(s). */
	async listExpirySchedules(): Promise<Array<{ id: string; time: number }>> {
		const schedules = await this.listSchedules()
		return schedules
			.filter((s) => s.callback === 'expireIfIdle')
			.map((s) => ({ id: s.id, time: s.time }))
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

			// Dev-only: map an MCP session id to its TldrawMCP DO id, for poking at a
			// session's object in the wrangler dev inspector.
			if (url.pathname === '/admin/do-id' && env.MCP_IS_DEV === 'true') {
				const session = url.searchParams.get('session') ?? ''
				return new Response(env.MCP_OBJECT.idFromName(`streamable-http:${session}`).toString())
			}

			// Dev helper for idle-expiry.test.ts: inspect a session's armed expiry schedule.
			if (url.pathname === '/admin/schedules' && env.MCP_IS_DEV === 'true') {
				const session = url.searchParams.get('session') ?? ''
				const stub = env.MCP_OBJECT.get(env.MCP_OBJECT.idFromName(`streamable-http:${session}`))
				return Response.json(await stub.listExpirySchedules())
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
