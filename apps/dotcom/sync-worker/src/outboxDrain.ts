import { TlaEffectOutbox } from '@tldraw/dotcom-shared'

export const MAX_ATTEMPTS = 10
export const PARKED_ROW_TTL_DAYS = 7

export interface OutboxDeps {
	getBatch(): Promise<TlaEffectOutbox[]> // WHERE attempts < MAX_ATTEMPTS ORDER BY id LIMIT 50
	deleteRow(id: number): Promise<void>
	bumpAttempts(id: number): Promise<void>
	deleteParkedRowsOlderThan(days: number): Promise<void>
	process(row: TlaEffectOutbox): Promise<void> // dispatches by tableName (wired in the DO)
	onError(error: unknown, row: TlaEffectOutbox): void
}

export async function drainOutbox(deps: OutboxDeps) {
	// Hoisted above the batch loop: an entity that fails must be skipped for the rest of this
	// drain call, not just the rest of its batch, so a stuck entity can't burn all its attempts
	// (and reach the parking threshold) in a single drain while other entities keep it looping.
	const failedEntities = new Set<string>()
	const entityKey = (row: TlaEffectOutbox) => `${row.tableName}:${row.entityId}`
	while (true) {
		const rows = await deps.getBatch()
		if (rows.length === 0) break
		let processedAny = false
		for (const row of rows) {
			if (failedEntities.has(entityKey(row))) continue
			processedAny = true
			try {
				await deps.process(row)
				await deps.deleteRow(row.id)
			} catch (error) {
				failedEntities.add(entityKey(row))
				await deps.bumpAttempts(row.id)
				deps.onError(error, row)
			}
		}
		// If every row in the batch was already-failed or failed just now, we'd spin refetching
		// the same rows; stop and let the alarm retry after backoff.
		if (!processedAny || rows.every((r) => failedEntities.has(entityKey(r)))) break
	}
	await deps.deleteParkedRowsOlderThan(PARKED_ROW_TTL_DAYS)
}
