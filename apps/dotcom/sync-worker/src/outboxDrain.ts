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
	while (true) {
		const rows = await deps.getBatch()
		if (rows.length === 0) break
		// A failing entity's later rows must not run out of order; other entities continue.
		const failedEntities = new Set<string>()
		const entityKey = (row: TlaEffectOutbox) => `${row.tableName}:${row.entityId}`
		for (const row of rows) {
			if (failedEntities.has(entityKey(row))) continue
			try {
				await deps.process(row)
				await deps.deleteRow(row.id)
			} catch (error) {
				failedEntities.add(entityKey(row))
				await deps.bumpAttempts(row.id)
				deps.onError(error, row)
			}
		}
		// If every row in the batch failed we'd spin on the same batch; stop and let the
		// alarm retry after backoff.
		if (failedEntities.size > 0 && rows.every((r) => failedEntities.has(entityKey(r)))) break
	}
	await deps.deleteParkedRowsOlderThan(PARKED_ROW_TTL_DAYS)
}
