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
import { ADMIN_PRUNE_MAX_IDS, MIN_SAFE_IDLE_MS, decidePrune } from './prune'
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

/** Tables this app creates. Their absence is what proves a teardown wiped the session. */
const APP_TABLES = ['checkpoints', 'meta', 'canvas_checkpoints']

type WipeMode = 'sdk' | 'quiet' | 'raw'

interface InspectResult {
	id: string
	bytes: number
	tables: string[]
	appTables: string[]
	wiped: boolean
	destroyPending: boolean
	alarm: number | null
	lastActivity: number | null
	checkpointCount: number
}

export { CanvasStore }

interface Env {
	MCP_OBJECT: DurableObjectNamespace<TldrawMCP>
	CANVAS_STORE: DurableObjectNamespace<CanvasStore>
	ASSETS: Fetcher
	LOADER: WorkerLoader
	RATE_LIMITER: RateLimit
	MCP_AUTH_TOKEN: string
	/** Gates /admin/prune. Unset = endpoint is off (404). Set with `wrangler secret put MCP_PRUNE_ADMIN_TOKEN`. */
	MCP_PRUNE_ADMIN_TOKEN?: string
	MCP_IS_DEV: string
	WORKER_ORIGIN: string
	MCP_ANALYTICS?: AnalyticsEngineDataset
	/** Dev-only: shortens IDLE_TTL_MS (ms) for prune-integration.test.ts. Ignored unless MCP_IS_DEV. */
	IDLE_TTL_MS_OVERRIDE?: string
}

// Dev-only override so prune-integration.test.ts can exercise expiry in seconds.
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

/** Grace period before the condemned object's alarm runs destroy(). destroy() ends in
 * `ctx.abort("destroyed")`, which kills the isolate along with any RPC still returning
 * from it: with no delay the caller sees `Error: destroyed` for a prune that in fact
 * succeeded. Matches the SDK's own DESTROY_ALARM_DELAY_MS. */
const DESTROY_ALARM_DELAY_MS = 1000

/** Transient Durable Object faults: the object moved, was evicted, or the script redeployed. */
function isRetryableDoError(err: unknown): boolean {
	const message = err instanceof Error ? err.message : String(err)
	return /Network connection lost|code was updated|internal error|overloaded|object has moved/i.test(
		message
	)
}

/** 401 unless the request carries the admin bearer token; null when it does. */
function requireAdminToken(request: Request, env: Env): Response | null {
	if (
		!env.MCP_PRUNE_ADMIN_TOKEN ||
		request.headers.get('Authorization') !== `Bearer ${env.MCP_PRUNE_ADMIN_TOKEN}`
	) {
		return new Response('Unauthorized', { status: 401 })
	}
	return null
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
	// argument is only skipped because the optional chain short-circuits; on the
	// condemn alarm #_name is never hydrated.
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
			await this.schedule(new Date(Date.now() + idleTtlMs(this.env)), 'expireIfIdle', null, {
				idempotent: true,
			})
		} catch (err) {
			// console.error, not this.logger: the logger is dev-only and a silently
			// unarmed expiry is the failure this branch exists to prevent.
			console.error('[TldrawMCP] failed to arm idle expiry', String(err))
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
	 * Reads the activity signals without assuming init() ran: on a cold legacy
	 * DO woken by a raw RPC, our tables may not exist, so every read tolerates
	 * `no such table` and reports "never active".
	 */
	readPruneStats(): PruneStats {
		const sql = this.ctx.storage.sql
		let lastActivity: number | null = null
		let checkpointCount = 0
		// Only a missing table means "never active". Any other storage error must
		// propagate: swallowing it reads as null → infinitely idle → a live session
		// gets condemned on a transient storage hiccup.
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
			// A corrupt value must fail toward keep, not toward condemn.
			lastActivity = Number.isFinite(n) ? n : null
		}
		const cp = tableRows(`SELECT COUNT(*) AS n, MAX(created_at) AS last FROM checkpoints`)
		if (cp.length > 0) {
			checkpointCount = Number(cp[0].n ?? 0)
			// Legacy DOs predate the lastActivity key; the newest snapshot is the next best signal.
			if (lastActivity === null && cp[0].last != null) {
				const n = Number(cp[0].last)
				if (Number.isFinite(n)) lastActivity = n
			}
		}
		return { lastActivity, checkpointCount }
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
	 * Reports what a Durable Object actually holds, for confirming a teardown landed.
	 *
	 * Any RPC wakes the object and the Agent constructor recreates its own schema, so
	 * SDK tables are always present here and `bytes` never returns to zero. The signal
	 * that distinguishes wiped from intact is `appTables`: `checkpoints`/`meta` exist
	 * only if this session's own data survived.
	 */
	async inspect(): Promise<InspectResult> {
		const sql = this.ctx.storage.sql
		const tables = sql
			.exec(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
			.toArray()
			.map((r) => String(r.name))
		const appTables = tables.filter((t) => APP_TABLES.includes(t))
		const stats = this.readPruneStats()
		return {
			id: this.ctx.id.toString(),
			bytes: sql.databaseSize,
			tables,
			appTables,
			wiped: appTables.length === 0,
			destroyPending: (await this.ctx.storage.get('cf_agents_destroy_pending')) === true,
			alarm: await this.ctx.storage.getAlarm(),
			lastActivity: stats.lastActivity,
			checkpointCount: stats.checkpointCount,
		}
	}

	/**
	 * Tears down immediately by the named strategy, so the teardown paths can be
	 * compared against each other in production without a deploy per variant.
	 *
	 * - `sdk`: condemned via the destroy marker, exactly as the prune pass did, so the
	 *   SDK's own destroy() — isolate abort included — runs from the alarm.
	 * - `quiet`: destroy() with the abort defused, so the object shuts down normally.
	 * - `raw`: deleteAlarm + deleteAll only, touching none of the SDK's teardown.
	 *
	 * `sdk` cannot destroy inline: the SDK's abort fires on a `setTimeout(0)` that
	 * races this method's own response, so the caller would record an error for a wipe
	 * that succeeded — the failure mode that made a production pass report 18,580
	 * errors against 161 successes.
	 */
	async wipeNow(mode: WipeMode): Promise<{ id: string; mode: WipeMode; before: number }> {
		const id = this.ctx.id.toString()
		const before = this.ctx.storage.sql.databaseSize
		if (mode === 'raw') {
			await this.ctx.storage.deleteAlarm()
			await this.ctx.storage.deleteAll()
		} else if (mode === 'quiet') {
			await this.destroy()
		} else {
			await this.ctx.storage.put('cf_agents_destroy_pending', true)
			await this.ctx.storage.setAlarm(Date.now() + DESTROY_ALARM_DELAY_MS)
		}
		return { id, mode, before }
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
			// Marker without an alarm (setAlarm failed or the invocation died between the
			// two writes) would otherwise be reported as condemned on every retry while
			// the storage stays put. Re-arm; setAlarm is idempotent if one is pending.
			await this.ctx.storage.setAlarm(Date.now() + DESTROY_ALARM_DELAY_MS)
			return {
				id,
				idleMs: null,
				checkpointCount: 0,
				bytes,
				action: 'destroy-scheduled',
				note: 'already condemned',
			}
		}
		const stats = this.readPruneStats()
		const { idleMs, action } = decidePrune(stats, Date.now(), maxIdleMs, dryRun)
		if (action === 'destroy-scheduled') {
			this.env.MCP_ANALYTICS?.writeDataPoint({ blobs: ['session_end', id], doubles: [Date.now()] })
			await this.ctx.storage.put('cf_agents_destroy_pending', true)
			await this.ctx.storage.setAlarm(Date.now() + DESTROY_ALARM_DELAY_MS)
		}
		return {
			id,
			idleMs: Number.isFinite(idleMs) ? idleMs : null,
			checkpointCount: stats.checkpointCount,
			bytes,
			action,
		}
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
			const result = await this.pruneIfIdle(idleTtlMs(this.env), false)
			kept = result.action === 'kept'
			if (kept) lastActivity = this.readPruneStats().lastActivity
		} catch (err) {
			// Must fall through to the re-arm; see the doc comment above.
			failed = true
			console.error('[TldrawMCP] expireIfIdle check failed', String(err))
		}
		if (!kept) return
		// After a failed check `lastActivity + ttl` is usually already in the past
		// (legacy DO), so the 60s floor alone would retry every minute with no
		// backoff for as long as storage keeps erroring. Back off to an hour.
		const floorMs = failed ? 60 * 60_000 : 60_000
		const next = (lastActivity ?? Date.now()) + idleTtlMs(this.env)
		try {
			await this.schedule(new Date(Math.max(next, Date.now() + floorMs)), 'expireIfIdle', null)
		} catch (err) {
			console.error('[TldrawMCP] failed to re-arm idle expiry', String(err))
		}
	}

	/** Dev helper for prune-integration.test.ts: inspect the armed expiry schedule row(s). */
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

			// Ops-only: prune idle session DOs by id. Sits above the MCP bearer gate
			// and uses its own secret so the prune script needs exactly one token.
			if (url.pathname === '/admin/prune') {
				if (!env.MCP_PRUNE_ADMIN_TOKEN) return new Response('Not found', { status: 404 })
				if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
				const denied = requireAdminToken(request, env)
				if (denied) return denied
				let body: { ids?: unknown; maxIdleMs?: unknown; dryRun?: unknown; force?: unknown }
				try {
					body = await request.json()
				} catch {
					return new Response('Bad request: invalid JSON', { status: 400 })
				}
				if (typeof body !== 'object' || body === null) {
					return new Response('Bad request: JSON object required', { status: 400 })
				}
				const ids = Array.isArray(body.ids) ? body.ids : null
				const maxIdleMs =
					typeof body.maxIdleMs === 'number' && Number.isFinite(body.maxIdleMs)
						? body.maxIdleMs
						: null
				// Strict boolean: a `"true"` string must not silently become a real run.
				const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : null
				if (!ids || maxIdleMs === null || dryRun === null || ids.length > ADMIN_PRUNE_MAX_IDS) {
					return new Response(
						`Bad request: ids[] (max ${ADMIN_PRUNE_MAX_IDS}), finite numeric maxIdleMs and boolean dryRun required`,
						{ status: 400 }
					)
				}
				// Server-side floor so a typo in a hand-rolled request cannot condemn live
				// sessions; the script's own guard is only defence for the happy path.
				if (!dryRun && maxIdleMs < MIN_SAFE_IDLE_MS && body.force !== true) {
					return new Response(
						`Bad request: maxIdleMs below ${MIN_SAFE_IDLE_MS}ms condemns live sessions; pass force: true`,
						{ status: 400 }
					)
				}
				// Batch timings, because a client-side timeout says nothing about where the
				// time went: whether wakes are uniformly slow or a few stragglers hold up
				// the batch, and how much of it is the retry path.
				const startedAt = Date.now()
				const durations: number[] = []
				let retries = 0
				const results = await Promise.all(
					ids.map(async (id) => {
						const idStartedAt = Date.now()
						// idFromString throws on malformed hex — keep it inside the per-id guard.
						let lastError: unknown
						for (let attempt = 0; attempt < 2; attempt++) {
							if (attempt > 0) retries++
							try {
								const stub = env.MCP_OBJECT.get(env.MCP_OBJECT.idFromString(String(id)))
								const result = await stub.pruneIfIdle(maxIdleMs, dryRun)
								durations.push(Date.now() - idStartedAt)
								return result
							} catch (err) {
								lastError = err
								// `Network connection lost` and `code was updated` are routine at this
								// fan-out; without a retry they land in the caller's ledger, which
								// resumes by offset and so would never revisit them.
								if (!isRetryableDoError(err)) break
							}
						}
						durations.push(Date.now() - idStartedAt)
						// The message round-trips to the script's JSONL, but Workers logs need a
						// trace too so DO overload is distinguishable from a malformed id.
						const name = lastError instanceof Error ? lastError.constructor.name : typeof lastError
						const message = lastError instanceof Error ? lastError.message : String(lastError)
						console.error('[admin/prune] id failed', String(id), name, message)
						return { id: String(id), error: `${name}: ${message}` }
					})
				)
				const sorted = durations.sort((a, b) => a - b)
				const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
				console.warn(
					`[admin/prune] ids=${ids.length} total=${Date.now() - startedAt}ms retries=${retries} errors=${results.filter((r: any) => r.error).length} p50=${at(0.5)}ms p95=${at(0.95)}ms max=${sorted[sorted.length - 1]}ms`
				)
				return Response.json(results)
			}

			// Ops diagnostics. Both take { ids: [...] } and fan out like /admin/prune, so a
			// teardown can be inspected and re-run in production without a deploy per
			// question. Same token, same 100-id cap.
			if (url.pathname === '/admin/inspect' || url.pathname === '/admin/wipe') {
				if (!env.MCP_PRUNE_ADMIN_TOKEN) return new Response('Not found', { status: 404 })
				if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
				const denied = requireAdminToken(request, env)
				if (denied) return denied
				let body: { ids?: unknown; mode?: unknown }
				try {
					body = await request.json()
				} catch {
					return new Response('Bad request: invalid JSON', { status: 400 })
				}
				const ids = Array.isArray(body?.ids) ? body.ids : null
				if (!ids || ids.length > ADMIN_PRUNE_MAX_IDS) {
					return new Response(`Bad request: ids[] (max ${ADMIN_PRUNE_MAX_IDS}) required`, {
						status: 400,
					})
				}
				const wiping = url.pathname === '/admin/wipe'
				const mode = body?.mode ?? 'quiet'
				if (wiping && mode !== 'sdk' && mode !== 'quiet' && mode !== 'raw') {
					return new Response('Bad request: mode must be sdk, quiet or raw', { status: 400 })
				}
				const results = await Promise.all(
					ids.map(async (id) => {
						try {
							const stub = env.MCP_OBJECT.get(env.MCP_OBJECT.idFromString(String(id)))
							return wiping ? await stub.wipeNow(mode as WipeMode) : await stub.inspect()
						} catch (err) {
							const name = err instanceof Error ? err.constructor.name : typeof err
							const message = err instanceof Error ? err.message : String(err)
							return { id: String(id), error: `${name}: ${message}` }
						}
					})
				)
				return Response.json(results)
			}

			// What is actually deployed, so a diagnosis is never based on a stale guess
			// about which build is live.
			if (url.pathname === '/admin/config') {
				if (!env.MCP_PRUNE_ADMIN_TOKEN) return new Response('Not found', { status: 404 })
				const denied = requireAdminToken(request, env)
				if (denied) return denied
				return Response.json({
					idleTtlMs: idleTtlMs(env),
					destroyAlarmDelayMs: DESTROY_ALARM_DELAY_MS,
					maxCheckpoints: MAX_CHECKPOINTS,
					adminPruneMaxIds: ADMIN_PRUNE_MAX_IDS,
					destroyOverride: true,
					isDev: env.MCP_IS_DEV === 'true',
				})
			}

			// Dev helper for prune-integration.test.ts: map a session id to its DO id.
			if (url.pathname === '/admin/do-id' && env.MCP_IS_DEV === 'true') {
				const denied = requireAdminToken(request, env)
				if (denied) return denied
				const session = url.searchParams.get('session') ?? ''
				return new Response(env.MCP_OBJECT.idFromName(`streamable-http:${session}`).toString())
			}

			// Dev helper for prune-integration.test.ts: inspect a session's armed expiry schedule.
			if (url.pathname === '/admin/schedules' && env.MCP_IS_DEV === 'true') {
				const denied = requireAdminToken(request, env)
				if (denied) return denied
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
