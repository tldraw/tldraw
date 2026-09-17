/**
 * Deploying migration 050 deadlocked against a plain reader that had taken the tables in the
 * other order (#10725), which no lock ordering on our side can prevent. Both states below leave
 * the transaction rolled back with nothing applied, so rerunning it is safe: it re-reads
 * applied_migrations and starts over. Anything else is a real failure a rerun would only repeat.
 */
const RETRYABLE_SQLSTATES: Record<string, string> = {
	'40P01': 'deadlock_detected',
	// What `SET LOCAL lock_timeout` in migrate.ts raises when a reader holds a lock too long.
	'55P03': 'lock_not_available',
}

/**
 * The SQLSTATE and its name when `e` is a Postgres error the migration runner should retry, or
 * `null`. pg exposes the SQLSTATE as `code` on its DatabaseError, and kysely rethrows the driver
 * error as-is, so this is the only place it needs to be read.
 */
export function getRetryableSqlState(e: unknown): { code: string; name: string } | null {
	if (typeof e !== 'object' || e === null || !('code' in e) || typeof e.code !== 'string') {
		return null
	}
	const name = RETRYABLE_SQLSTATES[e.code]
	return name ? { code: e.code, name } : null
}

export const MIGRATION_MAX_ATTEMPTS = 4
const BASE_DELAY_MS = 2_000
const JITTER_FRACTION = 0.25

/**
 * Delay before the next attempt after `attempt` (1-based) failed: 2s, 4s, 8s, doubling, plus up
 * to 25% jitter so a rerun does not line up with whatever reader it just lost to. With
 * MIGRATION_MAX_ATTEMPTS and the 10s lock_timeout the worst case adds well under a minute to a
 * deploy.
 */
export function retryDelayMs(attempt: number, random: () => number = Math.random): number {
	const base = BASE_DELAY_MS * 2 ** (attempt - 1)
	return Math.round(base * (1 + random() * JITTER_FRACTION))
}
