import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import {
	MAX_ATTEMPTS,
	OutboxDeps,
	computeNextAlarm,
	drainOutbox,
	shouldReportEffectFailure,
} from './outboxDrain'

function row(partial: Partial<TlaEffectOutbox>): TlaEffectOutbox {
	return {
		id: 1,
		tableName: 'file',
		entityId: 'f1',
		command: 'update',
		payload: {},
		prevPayload: null,
		attempts: 0,
		createdAt: new Date(0),
		nextRetryAt: null,
		...partial,
	}
}

interface TestDeps extends OutboxDeps {
	calls: string[]
	bumped: Array<{ id: number; attempts: number }>
}

function makeDeps(rows: TlaEffectOutbox[], timeoutMs = 30_000): TestDeps {
	const calls: string[] = []
	const bumped: Array<{ id: number; attempts: number }> = []
	let batch = rows
	return {
		calls,
		bumped,
		timeoutMs,
		getBatch: async () => {
			const b = batch
			batch = []
			return b
		},
		deleteRow: async (id) => {
			calls.push(`deleteRow:${id}`)
		},
		bumpAttempts: async (r) => {
			calls.push(`bump:${r.id}`)
			bumped.push({ id: r.id, attempts: r.attempts })
		},
		deleteParkedRowsOlderThan: async () => {},
		process: async (r) => {
			calls.push(`process:${r.id}`)
		},
		onError: vi.fn(),
	}
}

describe('drainOutbox', () => {
	it('processes rows in id order and deletes them', async () => {
		const deps = makeDeps([row({ id: 1 }), row({ id: 2 })])
		await drainOutbox(deps)
		expect(deps.calls).toEqual(['process:1', 'deleteRow:1', 'process:2', 'deleteRow:2'])
	})

	it('on failure bumps attempts and skips later rows for the same entity only', async () => {
		const deps = makeDeps([
			row({ id: 1, entityId: 'f1' }),
			row({ id: 2, entityId: 'f1' }),
			row({ id: 3, entityId: 'f2' }),
		])
		deps.process = async (r) => {
			if (r.entityId === 'f1') throw new Error('room DO unavailable')
			deps.calls.push(`process:${r.id}`)
		}
		await drainOutbox(deps)
		// f1 and f2 are separate entities processed concurrently, so ordering across them
		// is not guaranteed; assert on membership instead.
		expect(deps.calls).toContain('bump:1')
		expect(deps.calls).toContain('process:3')
		expect(deps.calls).toContain('deleteRow:3')
		expect(deps.calls).not.toContain('process:2')
		expect(deps.calls).not.toContain('bump:2')
		expect(deps.onError).toHaveBeenCalledTimes(1)
	})

	it('same entityId in different tables does not cross-skip', async () => {
		const deps = makeDeps([
			row({ id: 1, tableName: 'file', entityId: 'x' }),
			row({ id: 2, tableName: 'comment', entityId: 'x' }),
		])
		deps.process = async (r) => {
			if (r.tableName === 'file') throw new Error('boom')
			deps.calls.push(`process:${r.id}`)
		}
		await drainOutbox(deps)
		expect(deps.calls).toContain('bump:1')
		expect(deps.calls).toContain('process:2')
		expect(deps.calls).toContain('deleteRow:2')
	})

	it('stops instead of spinning when the same failing batch keeps coming back', async () => {
		const rows = [row({ id: 1, entityId: 'f1' }), row({ id: 2, entityId: 'f2' })]
		const deps = makeDeps([])
		let getBatchCalls = 0
		deps.getBatch = async () => {
			getBatchCalls++
			return rows
		}
		deps.process = async () => {
			throw new Error('always fails')
		}
		await drainOutbox(deps)
		// Each entity bumped exactly once, then the loop breaks instead of refetching forever.
		expect(deps.calls.filter((c) => c === 'bump:1')).toHaveLength(1)
		expect(deps.calls.filter((c) => c === 'bump:2')).toHaveLength(1)
		expect(getBatchCalls).toBe(1)
	})

	it('bumps a failing entity at most once per drain even if later batches resurface it', async () => {
		const batch1 = [row({ id: 1, entityId: 'bad' }), row({ id: 2, entityId: 'good' })]
		// Simulates the failing row still being in range (attempts < MAX_ATTEMPTS) and reappearing
		// in the next getBatch call alongside a new healthy row.
		const batch2 = [row({ id: 1, entityId: 'bad' }), row({ id: 3, entityId: 'good2' })]
		const batches = [batch1, batch2, []]
		const deps = makeDeps([])
		deps.getBatch = async () => batches.shift() ?? []
		deps.process = async (r) => {
			if (r.entityId === 'bad') throw new Error('always fails')
			deps.calls.push(`process:${r.id}`)
		}
		await drainOutbox(deps)
		expect(deps.calls).toContain('process:2')
		expect(deps.calls).toContain('deleteRow:2')
		expect(deps.calls).toContain('process:3')
		expect(deps.calls).toContain('deleteRow:3')
		expect(deps.calls.filter((c) => c === 'bump:1')).toHaveLength(1)
	})

	it('processes independent entities concurrently: a hung entity does not block another', async () => {
		// entity "slow" row never resolves; entity "fast" must still complete because groups
		// run concurrently and the per-effect timeout unsticks the slow group.
		const deps = makeDeps(
			[row({ id: 1, entityId: 'slow' }), row({ id: 2, entityId: 'fast' })],
			5 // short injected timeout so the hung row fails fast
		)
		deps.process = (r) => {
			deps.calls.push(`process:${r.id}`)
			if (r.entityId === 'slow') return new Promise<void>(() => {}) // never resolves
			return Promise.resolve()
		}
		await drainOutbox(deps)
		// fast entity completed
		expect(deps.calls).toContain('process:2')
		expect(deps.calls).toContain('deleteRow:2')
		// slow entity timed out => failure path
		expect(deps.calls).toContain('bump:1')
		expect(deps.onError).toHaveBeenCalledTimes(1)
	})

	it('processes rows within a single entity strictly sequentially even under concurrency', async () => {
		const order: string[] = []
		const deps = makeDeps([
			row({ id: 1, entityId: 'e' }),
			row({ id: 2, entityId: 'e' }),
			row({ id: 3, entityId: 'e' }),
		])
		deps.process = async (r) => {
			order.push(`start:${r.id}`)
			await new Promise((res) => setTimeout(res, 1))
			order.push(`end:${r.id}`)
		}
		await drainOutbox(deps)
		// each row fully completes (start then end) before the next starts
		expect(order).toEqual(['start:1', 'end:1', 'start:2', 'end:2', 'start:3', 'end:3'])
	})

	it('a per-effect timeout counts as a failure: bumps and reports onError with a timeout error', async () => {
		const deps = makeDeps([row({ id: 1 })], 5)
		deps.process = () => new Promise<void>(() => {}) // never resolves
		await drainOutbox(deps)
		expect(deps.calls).toContain('bump:1')
		expect(deps.calls).not.toContain('deleteRow:1')
		expect(deps.onError).toHaveBeenCalledTimes(1)
		const err = (deps.onError as any).mock.calls[0][0]
		expect(String(err)).toMatch(/timed out/i)
	})

	it('late resolution after a timeout does not double-delete or double-bump', async () => {
		let resolveLate!: () => void
		const deps = makeDeps([row({ id: 1 })], 5)
		deps.process = () =>
			new Promise<void>((res) => {
				resolveLate = res
			})
		await drainOutbox(deps)
		// timeout already recorded a failure
		expect(deps.calls.filter((c) => c === 'bump:1')).toHaveLength(1)
		expect(deps.calls).not.toContain('deleteRow:1')
		// now the underlying RPC finally resolves; must not trigger a delete
		resolveLate()
		await new Promise((r) => setTimeout(r, 10))
		expect(deps.calls).not.toContain('deleteRow:1')
		expect(deps.calls.filter((c) => c === 'bump:1')).toHaveLength(1)
	})

	it('passes the row current attempts to bumpAttempts so backoff can be scheduled', async () => {
		const deps = makeDeps([row({ id: 7, attempts: 3 })])
		deps.process = async () => {
			throw new Error('fail')
		}
		await drainOutbox(deps)
		expect(deps.bumped).toEqual([{ id: 7, attempts: 3 }])
	})

	it('passes the FULL failed row to bumpAttempts so the impl can defer later siblings', async () => {
		// bumpAttempts is the only hook the DO has to defer the failed row's later same-entity
		// siblings (set their nextRetryAt) and preserve per-entity ordering across drains, so it
		// must receive the whole row (tableName + entityId + id), not just id/attempts.
		const failed = row({ id: 5, tableName: 'file', entityId: 'f1', attempts: 2 })
		let received: TlaEffectOutbox | undefined
		const deps = makeDeps([failed, row({ id: 6, tableName: 'file', entityId: 'f1' })])
		deps.bumpAttempts = async (r) => {
			received = r
		}
		deps.process = async () => {
			throw new Error('fail')
		}
		await drainOutbox(deps)
		expect(received).toEqual(failed)
		// the later sibling (id 6) is NOT processed this drain — the DO's sibling deferral keeps it
		// out of the next drain too, but here we only assert the in-drain skip.
		expect(deps.calls).not.toContain('process:6')
	})
})

describe('computeNextAlarm', () => {
	const SWEEP = 30_000
	const now = 1_000_000

	it('arms the next sweep when no alarm is persisted', () => {
		expect(computeNextAlarm(null, now, SWEEP)).toBe(now + SWEEP)
	})

	it('arms the next sweep when the persisted alarm is further out than the next sweep', () => {
		expect(computeNextAlarm(now + SWEEP + 5_000, now, SWEEP)).toBe(now + SWEEP)
	})

	it('honors a mid-drain poke (past-due alarm) by arming now+1s, not the full sweep', () => {
		// a poke during the drain set alarm(now); it is past-due in the finally and can't be
		// trusted to fire on its own, so re-arm with a small delay instead of swallowing it.
		expect(computeNextAlarm(now, now, SWEEP)).toBe(now + 1_000)
		expect(computeNextAlarm(now - 5_000, now, SWEEP)).toBe(now + 1_000)
	})

	it('leaves a sooner future alarm (imminent poke) untouched', () => {
		expect(computeNextAlarm(now + 1_000, now, SWEEP)).toBe(null)
	})
})

describe('shouldReportEffectFailure', () => {
	it.each([
		[0, true],
		[1, false],
		[MAX_ATTEMPTS - 2, false],
		[MAX_ATTEMPTS - 1, true],
	])('attempts=%i -> %s', (attempts, expected) => {
		expect(shouldReportEffectFailure(attempts)).toBe(expected)
	})
})
