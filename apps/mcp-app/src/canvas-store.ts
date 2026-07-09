/// <reference types="@cloudflare/workers-types" />

import { DurableObject } from 'cloudflare:workers'
import type {
	CanvasSeed,
	CanvasStateRecord,
	ExecJob,
	ExecJobResult,
	ExecJobStatus,
	ExecJobSummary,
} from './shared/types'

/**
 * Per-canvas state authority + exec-job coordination.
 *
 * Addressed by `idFromName('canvas:<canvasId>')`. The crypto-random canvasId
 * riding in tool arguments and results is the ONLY durable key — nothing is
 * keyed by MCP session, so host session routing can never lose a canvas.
 *
 * Every model edit is a fork: the exec tool seeds a NEW canvas DO from the
 * base's latest state, then enqueues the job HERE (in the base canvas's DO,
 * which the spawned widget can already name from its own tool args). The
 * widget pulls the job, executes against the real editor, and submits the
 * result; `completeExecJob` writes the final state to the TARGET canvas DO
 * and resolves the exec tool's in-memory waiter.
 *
 * The legacy `exec:<execKey>` rendezvous instances of this class are retired;
 * their storage is reclaimed by the alarm-based idle TTL below.
 */

/** Queued exec code that never gets pulled must not apply surprisingly late. */
const EXEC_JOB_TTL_MS = 2 * 60 * 1000
/** Idle canvases are reclaimed after this window (refreshed on every access). */
const CANVAS_IDLE_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Per-column byte budget, under the DO SQLite ~2MB per-value limit. */
const MAX_STATE_COLUMN_BYTES = 1_900_000
const MAX_SHAPE_COUNT = 5_000

interface ExecJobWaiter {
	resolve(result: ExecJobResult | null): void
	timer: ReturnType<typeof setTimeout>
}

interface CanvasStoreEnv {
	CANVAS_STORE: DurableObjectNamespace<CanvasStore>
}

function byteLength(value: string): number {
	// Cheap upper bound is fine for a budget check; exact UTF-8 length for accuracy.
	return new TextEncoder().encode(value).byteLength
}

function assertColumnBudget(name: string, json: string): void {
	if (byteLength(json) > MAX_STATE_COLUMN_BYTES) {
		throw new Error(
			`Canvas ${name} payload exceeds the ${Math.floor(MAX_STATE_COLUMN_BYTES / 1024)}KB limit. Reduce the canvas size (fewer or simpler shapes).`
		)
	}
}

/** Structural validation: arrays of records with string ids, bounded counts. */
function parseRecordArrayJson(json: string | undefined, fieldName: string): unknown[] {
	if (!json) return []
	const parsed = JSON.parse(json)
	if (!Array.isArray(parsed)) {
		throw new Error(`${fieldName} must be a JSON array string.`)
	}
	return parsed
}

export class CanvasStore extends DurableObject<CanvasStoreEnv> {
	private waiters = new Map<string, ExecJobWaiter>()

	constructor(ctx: DurableObjectState, env: CanvasStoreEnv) {
		super(ctx, env)
		// Legacy exec:<key> rendezvous instances of this class own an
		// exec_results table; keep creating it so the shared alarm handler can
		// clean their stashes without erroring on fresh canvas instances.
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS exec_results (key TEXT PRIMARY KEY, payload TEXT, created_at INTEGER)`
		)
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS canvas_state (
				id INTEGER PRIMARY KEY CHECK (id = 1),
				shapes TEXT NOT NULL DEFAULT '[]',
				assets TEXT NOT NULL DEFAULT '[]',
				bindings TEXT NOT NULL DEFAULT '[]',
				context TEXT,
				seq INTEGER NOT NULL DEFAULT 0,
				updated_at INTEGER NOT NULL DEFAULT 0
			)`
		)
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS canvas_meta (key TEXT PRIMARY KEY, value TEXT)`
		)
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS exec_jobs (
				exec_id TEXT PRIMARY KEY,
				code TEXT NOT NULL,
				code_hash TEXT NOT NULL,
				target_canvas_id TEXT NOT NULL,
				legacy_exec_key TEXT,
				status TEXT NOT NULL,
				result TEXT,
				created_at INTEGER NOT NULL,
				updated_at INTEGER NOT NULL
			)`
		)
	}

	// --- Meta helpers ---

	private getMeta(key: string): string | null {
		const rows = this.ctx.storage.sql
			.exec(`SELECT value FROM canvas_meta WHERE key = ?`, key)
			.toArray()
		return rows.length > 0 ? (rows[0].value as string) : null
	}

	private setMeta(key: string, value: string): void {
		this.ctx.storage.sql.exec(
			`INSERT INTO canvas_meta (key, value) VALUES (?, ?)
			 ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
			key,
			value
		)
	}

	/** The canvasId this instance is addressed by (idFromName('canvas:<id>')). */
	private getOwnCanvasId(): string | null {
		const name = this.ctx.id.name
		if (!name) return null
		return name.startsWith('canvas:') ? name.slice('canvas:'.length) : name
	}

	private touch(): void {
		this.setMeta('lastAccessAt', String(Date.now()))
		void this.scheduleAlarm()
	}

	private async scheduleAlarm(): Promise<void> {
		// One alarm serves both purposes: expiring stale exec jobs and
		// reclaiming idle canvases. Fire at whichever comes first.
		const jobs = this.ctx.storage.sql
			.exec(
				`SELECT MIN(created_at) AS oldest FROM exec_jobs WHERE status IN ('queued', 'dispatched')`
			)
			.toArray()
		const oldestActiveJob = jobs.length > 0 ? (jobs[0].oldest as number | null) : null
		const lastAccess = Number(this.getMeta('lastAccessAt') ?? Date.now())

		const candidates = [lastAccess + CANVAS_IDLE_TTL_MS]
		if (oldestActiveJob !== null) candidates.push(oldestActiveJob + EXEC_JOB_TTL_MS)

		await this.ctx.storage.setAlarm(Math.min(...candidates))
	}

	// --- Canvas state ---

	getCanvasState(): CanvasStateRecord | null {
		const rows = this.ctx.storage.sql.exec(`SELECT * FROM canvas_state WHERE id = 1`).toArray()
		if (rows.length === 0) return null
		this.touch()
		const row = rows[0]
		return {
			shapesJson: row.shapes as string,
			assetsJson: row.assets as string,
			bindingsJson: row.bindings as string,
			contextJson: (row.context as string | null) ?? null,
			seq: row.seq as number,
			updatedAt: row.updated_at as number,
			parentCanvasId: this.getMeta('parentCanvasId'),
			lineageId: this.getMeta('lineageId'),
		}
	}

	/**
	 * Initialize this canvas from a seed (empty for a brand-new canvas, or the
	 * base canvas's state for a fork). Records lineage. Idempotent enough for
	 * the exec flow: seeding an already-seeded canvas is refused so a retried
	 * tool call can't wipe state that a widget already committed.
	 */
	seedCanvas(seed: CanvasSeed): { seeded: boolean } {
		const existing = this.ctx.storage.sql
			.exec(`SELECT seq FROM canvas_state WHERE id = 1`)
			.toArray()
		if (existing.length > 0) return { seeded: false }

		parseRecordArrayJson(seed.shapesJson, 'shapesJson')
		parseRecordArrayJson(seed.assetsJson, 'assetsJson')
		parseRecordArrayJson(seed.bindingsJson, 'bindingsJson')
		assertColumnBudget('shapes', seed.shapesJson)
		assertColumnBudget('assets', seed.assetsJson)
		assertColumnBudget('bindings', seed.bindingsJson)
		this.ctx.storage.sql.exec(
			`INSERT INTO canvas_state (id, shapes, assets, bindings, context, seq, updated_at)
			 VALUES (1, ?, ?, ?, ?, 0, ?)`,
			seed.shapesJson,
			seed.assetsJson,
			seed.bindingsJson,
			seed.contextJson,
			Date.now()
		)
		if (seed.parentCanvasId) this.setMeta('parentCanvasId', seed.parentCanvasId)
		this.setMeta('lineageId', seed.lineageId)
		this.setMeta('createdAt', String(Date.now()))
		this.touch()
		return { seeded: true }
	}

	/** Validated state write. Bumps seq and refreshes the idle TTL. */
	putCanvasState(state: {
		shapesJson: string
		assetsJson?: string
		bindingsJson?: string
		contextJson?: string
		source: 'exec' | 'user' | 'legacy'
	}): { seq: number } {
		const shapes = parseRecordArrayJson(state.shapesJson, 'shapesJson')
		if (shapes.length > MAX_SHAPE_COUNT) {
			throw new Error(`Canvas exceeds the ${MAX_SHAPE_COUNT}-shape limit.`)
		}
		parseRecordArrayJson(state.assetsJson, 'assetsJson')
		parseRecordArrayJson(state.bindingsJson, 'bindingsJson')
		assertColumnBudget('shapes', state.shapesJson)
		if (state.assetsJson) assertColumnBudget('assets', state.assetsJson)
		if (state.bindingsJson) assertColumnBudget('bindings', state.bindingsJson)
		if (state.contextJson) assertColumnBudget('context', state.contextJson)

		const rows = this.ctx.storage.sql.exec(`SELECT seq FROM canvas_state WHERE id = 1`).toArray()
		const seq = rows.length > 0 ? (rows[0].seq as number) + 1 : 1
		this.ctx.storage.sql.exec(
			`INSERT INTO canvas_state (id, shapes, assets, bindings, context, seq, updated_at)
			 VALUES (1, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET
				shapes = excluded.shapes,
				assets = excluded.assets,
				bindings = excluded.bindings,
				context = COALESCE(excluded.context, canvas_state.context),
				seq = excluded.seq,
				updated_at = excluded.updated_at`,
			state.shapesJson,
			state.assetsJson ?? '[]',
			state.bindingsJson ?? '[]',
			state.contextJson ?? null,
			seq,
			Date.now()
		)
		this.touch()
		return { seq }
	}

	// --- Exec jobs ---

	enqueueExecJob(job: {
		execId: string
		code: string
		codeHash: string
		targetCanvasId: string
		legacyExecKey?: string
	}): void {
		const now = Date.now()
		this.ctx.storage.sql.exec(
			`INSERT INTO exec_jobs (exec_id, code, code_hash, target_canvas_id, legacy_exec_key, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)`,
			job.execId,
			job.code,
			job.codeHash,
			job.targetCanvasId,
			job.legacyExecKey ?? null,
			now,
			now
		)
		this.touch()
	}

	/**
	 * Hand the oldest queued job matching this code hash to a widget, along
	 * with the CURRENT canvas state as the base snapshot (read at pull time so
	 * a fork includes user edits made right up to execution). Matching by code
	 * hash pairs each spawned widget with its own invocation when several
	 * execs on one base are in flight.
	 */
	pullExecJob(opts: { codeHash: string }): ExecJob | null {
		this.expireStaleJobs()
		const rows = this.ctx.storage.sql
			.exec(
				`SELECT * FROM exec_jobs WHERE status = 'queued' AND code_hash = ? ORDER BY created_at ASC LIMIT 1`,
				opts.codeHash
			)
			.toArray()
		if (rows.length === 0) return null
		const row = rows[0]
		this.ctx.storage.sql.exec(
			`UPDATE exec_jobs SET status = 'dispatched', updated_at = ? WHERE exec_id = ?`,
			Date.now(),
			row.exec_id
		)
		const state = this.getCanvasState()
		return {
			execId: row.exec_id as string,
			code: row.code as string,
			targetCanvasId: row.target_canvas_id as string,
			baseShapesJson: state?.shapesJson ?? '[]',
			baseAssetsJson: state?.assetsJson ?? '[]',
			baseBindingsJson: state?.bindingsJson ?? '[]',
		}
	}

	/**
	 * Complete a job: persist the final state to the TARGET canvas DO (or
	 * locally when this canvas is its own target, i.e. a brand-new canvas —
	 * calling our own stub would deadlock behind the input gate), then resolve
	 * the exec tool's waiter. State is written before the waiter resolves so a
	 * synchronous tool result never reports state that isn't readable yet.
	 */
	async completeExecJob(opts: {
		execId: string
		result: ExecJobResult
		shapesJson?: string
		assetsJson?: string
		bindingsJson?: string
		contextJson?: string
	}): Promise<{ handled: boolean; targetCanvasId?: string }> {
		const rows = this.ctx.storage.sql
			.exec(
				`SELECT * FROM exec_jobs WHERE exec_id = ? AND status IN ('queued', 'dispatched')`,
				opts.execId
			)
			.toArray()
		if (rows.length === 0) return { handled: false }
		const targetCanvasId = rows[0].target_canvas_id as string

		let result = opts.result
		if (result.success && opts.shapesJson !== undefined) {
			try {
				await this.writeStateToTarget(targetCanvasId, {
					shapesJson: opts.shapesJson,
					assetsJson: opts.assetsJson,
					bindingsJson: opts.bindingsJson,
					contextJson: opts.contextJson,
				})
			} catch (err) {
				result = {
					success: false,
					error: `Canvas state could not be saved: ${err instanceof Error ? err.message : String(err)}`,
				}
			}
		}

		this.finalizeJob(opts.execId, result)
		return { handled: true, targetCanvasId }
	}

	/**
	 * Legacy path: an old cached widget reported an exec result through the
	 * `_exec_callback` shim, addressed by the legacy sha256(canvasId+code) key.
	 * State arrives separately via the widget's follow-up `save_checkpoint`.
	 */
	completeExecJobByLegacyKey(opts: { legacyExecKey: string; result: ExecJobResult }): {
		handled: boolean
		execId?: string
		targetCanvasId?: string
	} {
		const rows = this.ctx.storage.sql
			.exec(
				`SELECT * FROM exec_jobs WHERE legacy_exec_key = ? AND status IN ('queued', 'dispatched') ORDER BY created_at ASC LIMIT 1`,
				opts.legacyExecKey
			)
			.toArray()
		if (rows.length === 0) return { handled: false }
		const execId = rows[0].exec_id as string
		const targetCanvasId = rows[0].target_canvas_id as string
		this.finalizeJob(execId, opts.result)
		return { handled: true, execId, targetCanvasId }
	}

	/**
	 * The most recent job a legacy widget could be saving state for. Used by
	 * the `save_checkpoint` shim to redirect a legacy widget's post-exec save
	 * (addressed at the BASE canvas it was told to edit) onto the fork target,
	 * preserving fork semantics for cached old widget builds.
	 */
	getRecentJobTarget(): { execId: string; targetCanvasId: string } | null {
		const cutoff = Date.now() - EXEC_JOB_TTL_MS
		const rows = this.ctx.storage.sql
			.exec(
				`SELECT exec_id, target_canvas_id FROM exec_jobs
				 WHERE status IN ('queued', 'dispatched', 'done') AND updated_at >= ?
				 ORDER BY updated_at DESC LIMIT 1`,
				cutoff
			)
			.toArray()
		if (rows.length === 0) return null
		return {
			execId: rows[0].exec_id as string,
			targetCanvasId: rows[0].target_canvas_id as string,
		}
	}

	/** Block until the job completes, or resolve null at the deadline. */
	async waitExecJob(opts: { execId: string; timeoutMs: number }): Promise<ExecJobResult | null> {
		const rows = this.ctx.storage.sql
			.exec(`SELECT status, result FROM exec_jobs WHERE exec_id = ?`, opts.execId)
			.toArray()
		if (rows.length > 0 && rows[0].status === 'done' && rows[0].result) {
			return JSON.parse(rows[0].result as string) as ExecJobResult
		}
		if (rows.length > 0 && (rows[0].status === 'failed' || rows[0].status === 'expired')) {
			return rows[0].result ? (JSON.parse(rows[0].result as string) as ExecJobResult) : null
		}

		return new Promise<ExecJobResult | null>((resolve) => {
			const timer = setTimeout(() => {
				this.waiters.delete(opts.execId)
				resolve(null)
			}, opts.timeoutMs)
			this.waiters.set(opts.execId, { resolve, timer })
		})
	}

	getExecJobSummaries(): ExecJobSummary[] {
		this.expireStaleJobs()
		return this.ctx.storage.sql
			.exec(
				`SELECT exec_id, status, created_at, updated_at FROM exec_jobs ORDER BY created_at DESC LIMIT 10`
			)
			.toArray()
			.map((row) => ({
				execId: row.exec_id as string,
				status: row.status as ExecJobStatus,
				createdAt: row.created_at as number,
				updatedAt: row.updated_at as number,
			}))
	}

	// --- Internals ---

	private finalizeJob(execId: string, result: ExecJobResult): void {
		this.ctx.storage.sql.exec(
			`UPDATE exec_jobs SET status = ?, result = ?, updated_at = ? WHERE exec_id = ?`,
			result.success ? 'done' : 'failed',
			JSON.stringify(result),
			Date.now(),
			execId
		)
		const waiter = this.waiters.get(execId)
		if (waiter) {
			clearTimeout(waiter.timer)
			this.waiters.delete(execId)
			waiter.resolve(result)
		}
	}

	private async writeStateToTarget(
		targetCanvasId: string,
		state: { shapesJson: string; assetsJson?: string; bindingsJson?: string; contextJson?: string }
	): Promise<void> {
		if (targetCanvasId === this.getOwnCanvasId()) {
			this.putCanvasState({ ...state, source: 'exec' })
			return
		}
		const stub = this.env.CANVAS_STORE.get(
			this.env.CANVAS_STORE.idFromName(`canvas:${targetCanvasId}`)
		)
		await stub.putCanvasState({ ...state, source: 'exec' })
	}

	private expireStaleJobs(): void {
		const cutoff = Date.now() - EXEC_JOB_TTL_MS
		const stale = this.ctx.storage.sql
			.exec(
				`SELECT exec_id FROM exec_jobs WHERE status IN ('queued', 'dispatched') AND created_at < ?`,
				cutoff
			)
			.toArray()
		for (const row of stale) {
			const execId = row.exec_id as string
			this.ctx.storage.sql.exec(
				`UPDATE exec_jobs SET status = 'expired', updated_at = ? WHERE exec_id = ?`,
				Date.now(),
				execId
			)
			const waiter = this.waiters.get(execId)
			if (waiter) {
				clearTimeout(waiter.timer)
				this.waiters.delete(execId)
				waiter.resolve(null)
			}
		}
	}

	async alarm(): Promise<void> {
		this.expireStaleJobs()

		// Reclaim legacy rendezvous instances and idle canvases.
		const lastAccess = Number(this.getMeta('lastAccessAt') ?? 0)
		if (lastAccess > 0 && Date.now() - lastAccess >= CANVAS_IDLE_TTL_MS) {
			await this.ctx.storage.deleteAll()
			return
		}
		// Legacy exec:<key> instances have exec_results but never canvas_meta;
		// their stashes are single-use and stale after the old TTL.
		this.ctx.storage.sql.exec(
			`DELETE FROM exec_results WHERE created_at < ?`,
			Date.now() - EXEC_JOB_TTL_MS
		)

		await this.scheduleAlarm()
	}
}
