import { describe, expect, it } from 'vitest'
import { getRetryableSqlState, MIGRATION_MAX_ATTEMPTS, retryDelayMs } from './migrationRetry'

// Shaped like pg's DatabaseError, which is what kysely rethrows out of the transaction.
function pgError(code: string | undefined) {
	return Object.assign(new Error('boom'), { code })
}

describe('getRetryableSqlState', () => {
	it('names a deadlock', () => {
		expect(getRetryableSqlState(pgError('40P01'))).toEqual({
			code: '40P01',
			name: 'deadlock_detected',
		})
	})

	it('names a lock timeout', () => {
		expect(getRetryableSqlState(pgError('55P03'))).toEqual({
			code: '55P03',
			name: 'lock_not_available',
		})
	})

	// A rerun would only repeat these, and retrying a broken migration hides the real error
	// behind three more copies of it.
	it.each([
		['a syntax error', pgError('42601')],
		['a unique violation', pgError('23505')],
		['a serialization failure', pgError('40001')],
		['a pg error without a code', pgError(undefined)],
	])('does not retry %s', (_, e) => {
		expect(getRetryableSqlState(e)).toBeNull()
	})

	// The runner's own errors (dry-run rollback, missing migration, transaction block) are plain
	// Errors with no SQLSTATE, and non-Error throws must not crash the predicate.
	it.each([
		['a plain Error', new Error('dry-run-rollback')],
		['a string', 'nope'],
		['null', null],
		['undefined', undefined],
		['an object with a non-string code', { code: 40 }],
	])('does not retry %s', (_, e) => {
		expect(getRetryableSqlState(e)).toBeNull()
	})
})

describe('retryDelayMs', () => {
	it('doubles from two seconds without jitter', () => {
		const noJitter = () => 0
		expect([1, 2, 3].map((attempt) => retryDelayMs(attempt, noJitter))).toEqual([
			2_000, 4_000, 8_000,
		])
	})

	it('adds at most a quarter of the base delay as jitter', () => {
		const maxJitter = () => 1
		expect(retryDelayMs(1, maxJitter)).toBe(2_500)
		expect(retryDelayMs(3, maxJitter)).toBe(10_000)
	})

	// Guards the number in the doc comment: three retries plus three 10s lock timeouts stays
	// under a minute, so a deadlocked deploy fails fast enough to notice.
	it('keeps the worst case under a minute including lock timeouts', () => {
		const lockTimeoutMs = 10_000
		let total = 0
		for (let attempt = 1; attempt < MIGRATION_MAX_ATTEMPTS; attempt++) {
			total += retryDelayMs(attempt, () => 1) + lockTimeoutMs
		}
		expect(total).toBeLessThan(60_000)
	})
})
