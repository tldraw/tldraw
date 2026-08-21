export type PruneAction = 'destroy-scheduled' | 'kept' | 'would-destroy'

export interface PruneResult {
	id: string
	/** ms idle; null when the DO never recorded activity (treated as maximally idle). */
	idleMs: number | null
	checkpointCount: number
	bytes: number
	action: PruneAction
	note?: string
}

export interface PruneStats {
	/** ms epoch of the last checkpoint save; null when the DO never saved. */
	lastActivity: number | null
	checkpointCount: number
}

/** Subrequest budget per worker invocation caps how many DO stubs one batch may fan out to. */
export const ADMIN_PRUNE_MAX_IDS = 100

/** A real prune below this idle threshold kills live sessions; both the endpoint and the script require an explicit force. */
export const MIN_SAFE_IDLE_MS = 7 * 24 * 60 * 60 * 1000

export function decidePrune(
	stats: PruneStats,
	now: number,
	maxIdleMs: number,
	dryRun: boolean
): { idleMs: number; action: PruneAction } {
	const idleMs = stats.lastActivity === null ? Infinity : now - stats.lastActivity
	if (idleMs < maxIdleMs) return { idleMs, action: 'kept' }
	return { idleMs, action: dryRun ? 'would-destroy' : 'destroy-scheduled' }
}
