import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { createSentry } from '@tldraw/worker-shared'
import { DurableObject } from 'cloudflare:workers'
import { sql } from 'kysely'
import { FileEffectDeps, processFileEffect } from './fileEffects'
import { EFFECT_TIMEOUT_MS, MAX_ATTEMPTS, computeNextAlarm, drainOutbox } from './outboxDrain'
import { createPostgresConnectionPool } from './postgres'
import { Environment } from './types'
import { getRoomDurableObject } from './utils/durableObjects'
import { publishSnapshot, unpublishSnapshot } from './utils/publishSnapshots'

const SWEEP_INTERVAL_MS = 30_000

// Singleton DO that drains effect_outbox. Poked by the Zero push endpoint and
// admin routes after file writes; the alarm sweep catches PG-trigger writes
// (workspace-delete cascade) and lost pokes.
export class TLFileEffectProcessor extends DurableObject<Environment> {
	private drainPromise: Promise<void> | null = null
	private sentry

	constructor(ctx: DurableObjectState, env: Environment) {
		super(ctx, env)
		this.sentry = createSentry(ctx, env)
		// Bootstrap the sweep so a never-poked DO still drains trigger-only rows (e.g. the
		// workspace-delete cascade on an otherwise idle env) instead of sitting forever.
		ctx.blockConcurrencyWhile(async () => {
			const scheduled = await ctx.storage.getAlarm()
			// A past-due persisted alarm may never fire (see poke()); re-arm it too.
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

	async poke() {
		// Always (re)arm. Skipping when an alarm is already due (scheduled <= now) assumes the
		// runtime will fire it momentarily — but a stale past-due alarm the runtime dropped
		// (observed in local dev after restarts) then starves the queue forever, with every
		// poke no-oping against it. Re-setting an imminent alarm is a harmless storage write.
		await this.ctx.storage.setAlarm(Date.now())
	}

	async drainNow() {
		// A drain already in flight may have fetched its batch before rows this call needs to see
		// were committed, so wait for it, then always run one more drain for read-your-writes
		// semantics. Can't just call drain() afterwards: if its `finally` hasn't cleared
		// drainPromise yet by the time we resume, drain() would coalesce into the very promise we
		// just awaited instead of starting a fresh one. Start the new cycle unconditionally and
		// only ever clear the latch if it's still pointing at this call's own promise.
		if (this.drainPromise) await this.drainPromise
		const promise = this._drain().finally(() => {
			if (this.drainPromise === promise) this.drainPromise = null
		})
		this.drainPromise = promise
		await promise
	}

	override async alarm() {
		try {
			await this.drain()
		} catch (e) {
			// row-level failures are handled inside the drain; this catches drain-level
			// crashes like an unreachable database
			this.captureException(e)
		} finally {
			// Re-arm the sweep without swallowing a mid-drain poke. A poke that arrived during the
			// drain set alarm(now) and is past-due by the time we get here; computeNextAlarm honors
			// it with a ~1s delay rather than pushing it out to the next full sweep, while still
			// never trusting a past-due alarm to fire on its own. null => leave it as-is.
			const scheduled = await this.ctx.storage.getAlarm()
			const next = computeNextAlarm(scheduled, Date.now(), SWEEP_INTERVAL_MS)
			if (next !== null) await this.ctx.storage.setAlarm(next)
		}
	}

	private drain() {
		// Coalesce: one drain in flight; a poke during a drain lands on the next alarm.
		if (!this.drainPromise) {
			const promise = this._drain().finally(() => {
				// Same identity guard as drainNow(): only clear the latch if it's still ours, so
				// this doesn't clobber a newer drainPromise set by an interleaved drainNow() call.
				if (this.drainPromise === promise) this.drainPromise = null
			})
			this.drainPromise = promise
		}
		return this.drainPromise
	}

	private async _drain() {
		const db = createPostgresConnectionPool(this.env, 'TLFileEffectProcessor')
		const fileDeps: FileEffectDeps = {
			getCurrentFile: (fileId) =>
				db.selectFrom('file').selectAll().where('id', '=', fileId).executeTakeFirst(),
			notifyInsert: (file) => getRoomDurableObject(this.env, file.id).appFileRecordCreated(file),
			notifyUpdate: (file) => getRoomDurableObject(this.env, file.id).appFileRecordDidUpdate(file),
			notifyDelete: (fileRow) =>
				getRoomDurableObject(this.env, fileRow.id).appFileRecordDidDelete(fileRow),
			publish: (file) => publishSnapshot(this.env, file),
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
				},
				bumpAttempts: async (row) => {
					// Exponential backoff from the row's current attempt count, capped at 5 minutes.
					// The base IS the effect timeout, so the first retry can't land before a
					// timed-out RPC's window closes (the RPC keeps running — it can't be cancelled),
					// avoiding an overlapping retry.
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
				},
				onError: (error, row) => {
					// only report at the parking threshold to avoid a Sentry event per retry
					if (row.attempts + 1 >= MAX_ATTEMPTS) {
						this.captureException(error, {
							tableName: row.tableName,
							entityId: row.entityId,
							command: row.command,
							outboxId: row.id,
						})
					}
				},
			})
		} finally {
			await db.destroy()
		}
	}
}
