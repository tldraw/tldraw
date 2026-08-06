import { TlaEffectOutbox } from '@tldraw/dotcom-shared'

export const MAX_ATTEMPTS = 10
export const PARKED_ROW_TTL_DAYS = 7
// Groups (one per entity) processed at once. A slow publish/cold-boot only stalls its own
// group; other entities keep draining. Small so a burst can't fan out to unbounded RPCs.
export const MAX_CONCURRENT_ENTITIES = 5
// Per-effect ceiling. The underlying room-DO RPC can't be cancelled, but the drain stops
// waiting on it and moves on; a timed-out effect is treated as a failure and retried later.
export const EFFECT_TIMEOUT_MS = 30_000

export interface OutboxDeps {
	getBatch(): Promise<TlaEffectOutbox[]> // WHERE attempts < MAX_ATTEMPTS AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= now()) ORDER BY id LIMIT 50
	deleteRow(id: number): Promise<void>
	// attempts is the row's CURRENT attempt count, so backoff scheduling can be derived from it.
	bumpAttempts(id: number, attempts: number): Promise<void>
	deleteParkedRowsOlderThan(days: number): Promise<void>
	process(row: TlaEffectOutbox): Promise<void> // dispatches by tableName (wired in the DO)
	onError(error: unknown, row: TlaEffectOutbox): void
	// Overridable so tests don't wait the full timeout in real time.
	timeoutMs?: number
}

class EffectTimeoutError extends Error {
	constructor(row: TlaEffectOutbox, ms: number) {
		super(`effect for ${row.tableName}:${row.entityId} (outbox ${row.id}) timed out after ${ms}ms`)
		this.name = 'EffectTimeoutError'
	}
}

// Races process(row) against a timeout. Resolves true on success, false on failure/timeout.
// A late resolution of the underlying promise after a timeout is swallowed so it can't
// double-act; only the first settlement of the race drives delete/bump.
async function processWithTimeout(deps: OutboxDeps, row: TlaEffectOutbox): Promise<boolean> {
	const ms = deps.timeoutMs ?? EFFECT_TIMEOUT_MS
	let timer: ReturnType<typeof setTimeout> | undefined
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(() => reject(new EffectTimeoutError(row, ms)), ms)
	})
	// Swallow late rejections from BOTH branches: only the race's first settlement drives
	// delete/bump. Without this, a timeout firing while deleteRow is still awaited (or a late
	// work rejection) becomes an unhandled rejection.
	timeout.catch(() => {})
	const work = deps.process(row)
	work.catch(() => {})
	try {
		await Promise.race([work, timeout])
		// Stop the clock before the follow-up await so a slow deleteRow can't trip the timeout.
		if (timer) clearTimeout(timer)
		await deps.deleteRow(row.id)
		return true
	} catch (error) {
		await deps.bumpAttempts(row.id, row.attempts)
		deps.onError(error, row)
		return false
	} finally {
		if (timer) clearTimeout(timer)
	}
}

// Runs tasks with a bounded concurrency, preserving nothing about order (callers that need
// ordering enforce it inside a single task).
async function runWithConcurrency(tasks: Array<() => Promise<void>>, limit: number) {
	let next = 0
	async function worker() {
		while (next < tasks.length) {
			const task = tasks[next++]
			await task()
		}
	}
	const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
	await Promise.all(workers)
}

const entityKey = (row: TlaEffectOutbox) => `${row.tableName}:${row.entityId}`

export async function drainOutbox(deps: OutboxDeps) {
	// Hoisted above the batch loop: an entity that fails must be skipped for the rest of this
	// drain call, not just the rest of its batch, so a stuck entity can't burn all its attempts
	// (and reach the parking threshold) in a single drain while other entities keep it looping.
	const failedEntities = new Set<string>()

	while (true) {
		const rows = await deps.getBatch()
		if (rows.length === 0) break

		// Group rows by entity, preserving id order within each group. Different entities have
		// no ordering constraint between them, so their groups run concurrently.
		const groups = new Map<string, TlaEffectOutbox[]>()
		for (const row of rows) {
			const key = entityKey(row)
			if (failedEntities.has(key)) continue
			let group = groups.get(key)
			if (!group) groups.set(key, (group = []))
			group.push(row)
		}

		let processedAny = false
		const tasks = Array.from(groups.entries()).map(([key, group]) => async () => {
			for (const row of group) {
				processedAny = true
				const ok = await processWithTimeout(deps, row)
				if (!ok) {
					// A failed entity skips its remaining rows this drain and, via failedEntities,
					// any rows that resurface in later batches.
					failedEntities.add(key)
					return
				}
			}
		})
		await runWithConcurrency(tasks, MAX_CONCURRENT_ENTITIES)

		// If every row in the batch was already-failed or failed just now, we'd spin refetching
		// the same rows; stop and let the alarm retry after backoff.
		if (!processedAny || rows.every((r) => failedEntities.has(entityKey(r)))) break
	}
	await deps.deleteParkedRowsOlderThan(PARKED_ROW_TTL_DAYS)
}
