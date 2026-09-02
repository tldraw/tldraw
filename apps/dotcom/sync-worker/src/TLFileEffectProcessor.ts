import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { sql } from 'kysely'
import { FileEffectDeps, processFileEffect } from './fileEffects'
import {
	EFFECT_TIMEOUT_MS,
	MAX_ATTEMPTS,
	computeNextAlarm,
	drainOutbox,
	shouldReportEffectFailure,
} from './outboxDrain'
import { createPostgresConnectionPool } from './postgres'
import { Analytics, Environment } from './types'
import { EventData, writeDataPoint } from './utils/analytics'
import { getRoomDurableObject } from './utils/durableObjects'
import { publishSnapshot, unpublishSnapshot } from './utils/publishSnapshots'

const SWEEP_INTERVAL_MS = 30_000

// Singleton DO that drains effect_outbox. Poked by the Zero push endpoint and
// admin routes after file writes; the alarm sweep catches PG-trigger writes
// (workspace-delete cascade) and lost pokes.
export class TLFileEffectProcessor extends DurableObject<Environment> {
	private drainPromise: Promise<void> | null = null
	private sentry
	private measure: Analytics | undefined

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)
		this.measure = env.MEASURE
		// Keep the sweep chain alive across restarts/evictions: if the persisted alarm is
		// missing or past-due (a past-due alarm can't be trusted to fire), re-arm it. Note this
		// runs only once something instantiates the DO — the first poke() ever is what starts
		// the chain; until then, outbox rows wait.
		ctx.blockConcurrencyWhile(async () => {
			const scheduled = await ctx.storage.getAlarm()
			if (scheduled === null || scheduled <= Date.now()) {
				await ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS)
			}
		})
	}

	// eslint-disable-next-line tldraw/prefer-class-methods
	private captureException = (exception: unknown, extras?: Record<string, unknown>) => {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		this.sentry?.withScope((scope) => {
			if (extras) scope.setExtras(extras)
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			this.sentry?.captureException(exception) as any
		})
		if (!this.sentry) {
			console.error(`[TLFileEffectProcessor]: `, exception)
		}
	}

	// eslint-disable-next-line tldraw/prefer-class-methods
	private writeEvent = (name: string, eventData: EventData) => {
		writeDataPoint(this.sentry, this.measure, this.env, name, eventData)
	}

	async poke() {
		// Always (re)arm: a past-due persisted alarm can't be trusted to fire (the runtime can
		// drop one, e.g. across restarts), and re-setting an imminent alarm is a harmless
		// storage write.
		await this.ctx.storage.setAlarm(Date.now())
	}

	override async alarm() {
		try {
			await this.drain()
		} catch (e) {
			// row-level failures are handled inside the drain; this catches drain-level
			// crashes like an unreachable database
			this.captureException(e)
		} finally {
			// Re-arm the sweep without swallowing a mid-drain poke: a poke that arrived during
			// the drain set alarm(now), which is past-due by now; computeNextAlarm re-arms it at
			// ~1s (a past-due alarm can't be trusted to fire on its own). null => leave as-is.
			const scheduled = await this.ctx.storage.getAlarm()
			const next = computeNextAlarm(scheduled, Date.now(), SWEEP_INTERVAL_MS)
			if (next !== null) await this.ctx.storage.setAlarm(next)
		}
	}

	private drain() {
		// Coalesce: one drain in flight; a poke during a drain lands on the ~1s follow-up alarm
		// computeNextAlarm arms after this drain finishes.
		if (!this.drainPromise) {
			const promise = this._drain().finally(() => {
				// Identity guard: only clear the latch if it's still ours.
				if (this.drainPromise === promise) this.drainPromise = null
			})
			this.drainPromise = promise
		}
		return this.drainPromise
	}

	private async _drain() {
		const drainStart = Date.now()
		let processed = 0
		let failed = 0
		const db = createPostgresConnectionPool(this.env, 'TLFileEffectProcessor')
		const fileDeps: FileEffectDeps = {
			getCurrentFile: (fileId) =>
				db.selectFrom('file').selectAll().where('id', '=', fileId).executeTakeFirst(),
			notifyInsert: (file) => getRoomDurableObject(this.env, file.id).appFileRecordCreated(file),
			notifyUpdate: (file) => getRoomDurableObject(this.env, file.id).appFileRecordDidUpdate(file),
			notifyDelete: (fileRow) =>
				getRoomDurableObject(this.env, fileRow.id).appFileRecordDidDelete(fileRow),
			publish: (file) =>
				publishSnapshot(this.env, file, (error) =>
					this.captureException(error, { publishThumbnailEnqueue: true })
				),
			unpublish: (file) => unpublishSnapshot(this.env, file),
		}
		// One handler per source table. Future effect sources (e.g. notifications)
		// register here alongside their trigger.
		const handlers: Record<string, (row: TlaEffectOutbox) => Promise<void>> = {
			file: (row) => processFileEffect(fileDeps, row),
		}
		try {
			await drainOutbox({
				getBatch: () =>
					db
						.selectFrom('effect_outbox')
						.selectAll()
						.where('attempts', '<', MAX_ATTEMPTS)
						.where((eb) =>
							eb.or([eb('nextRetryAt', 'is', null), eb('nextRetryAt', '<=', sql<Date>`now()`)])
						)
						.orderBy('id')
						.limit(50)
						.execute(),
				deleteRow: async (id) => {
					await db.deleteFrom('effect_outbox').where('id', '=', id).execute()
					processed++
				},
				bumpAttempts: async (row) => {
					failed++
					// Exponential backoff from the row's current attempt count, capped at 5 minutes.
					// The base IS the effect timeout, so the first retry can't land before a
					// timed-out RPC's window closes (the RPC keeps running — it can't be cancelled),
					// avoiding an overlapping retry. This relies on the RPC actually finishing within
					// the window: a publish effect's awaitPersist used to retry for up to ~200s
					// (PERSIST_RETRIES_MAX * 2s), well past this 30s timeout, so a zombie publish
					// could still be running when a retried attempt started. awaitPersist now caps
					// its throwing retries at ~20s (PERSIST_RETRIES_MAX_THROWING), so it can't.
					const backoffSeconds = Math.min(2 ** row.attempts * (EFFECT_TIMEOUT_MS / 1000), 300)
					const backoff = sql<Date>`now() + (${backoffSeconds} || ' seconds')::interval`
					// (a) Back off the failed row itself and bump its attempt count.
					await db
						.updateTable('effect_outbox')
						.set((eb) => ({
							attempts: eb('attempts', '+', 1),
							nextRetryAt: backoff,
						}))
						.where('id', '=', row.id)
						.execute()
					// (b) Defer the failed row's later same-entity siblings so per-entity ordering
					// holds across drains: they must not run while this row is backing off. Do NOT
					// touch their attempts (they haven't been tried), and never shrink an existing
					// later nextRetryAt (GREATEST keeps the furthest-out schedule).
					await db
						.updateTable('effect_outbox')
						.set({
							nextRetryAt: sql<Date>`GREATEST("nextRetryAt", ${backoff})`,
						})
						.where('tableName', '=', row.tableName)
						.where('entityId', '=', row.entityId)
						.where('id', '>', row.id)
						.execute()
				},
				deleteParkedRowsOlderThan: async (days) => {
					await db
						.deleteFrom('effect_outbox')
						.where('attempts', '>=', MAX_ATTEMPTS)
						.where('createdAt', '<', sql<Date>`now() - (${days} || ' days')::interval`)
						.execute()
				},
				process: async (row) => {
					const handler = handlers[row.tableName]
					if (!handler) {
						// trigger + handler ship together; this only catches mistakes
						this.captureException(new Error('effect_outbox row for unhandled table, dropping'), {
							tableName: row.tableName,
							outboxId: row.id,
						})
						return
					}
					await handler(row)
					// End-to-end effect latency: time from the row landing in the outbox (its
					// transaction commit) to the effect completing. This is the user-facing number —
					// how long after a file change the room notification / publish actually lands.
					this.writeEvent('outbox_effect', {
						blobs: [row.tableName, row.command],
						doubles: [Date.now() - new Date(row.createdAt).getTime()],
					})
				},
				onError: (error, row) => {
					// Report the first failure (immediate visibility) and the parking failure (data
					// loss), but not every retry in between - under an outage, one row can burn through
					// MAX_ATTEMPTS attempts, and reporting each would eat Sentry's rate limit and drop
					// the parking events that matter most. See shouldReportEffectFailure's doc comment.
					const isParking = row.attempts + 1 >= MAX_ATTEMPTS
					if (shouldReportEffectFailure(row.attempts)) {
						this.captureException(error, {
							tableName: row.tableName,
							entityId: row.entityId,
							command: row.command,
							outboxId: row.id,
							attempts: row.attempts + 1,
						})
					}
					if (isParking) {
						this.writeEvent('outbox_parked', { blobs: [row.tableName, row.command] })
					}
				},
			})
		} finally {
			await db.destroy()
			// Per-drain summary: throughput (processed/failed) and how long the drain took.
			// Drains coalesce, so this is low-volume; the sweep also emits an empty summary every
			// ~30s, which doubles as a liveness heartbeat for the processor.
			this.writeEvent('outbox_drain', { doubles: [processed, failed, Date.now() - drainStart] })
		}
	}
}
