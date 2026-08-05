import { TlaEffectOutbox } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import { OutboxDeps, drainOutbox } from './outboxDrain'

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
		...partial,
	}
}

function makeDeps(rows: TlaEffectOutbox[]): OutboxDeps & { calls: string[] } {
	const calls: string[] = []
	let batch = rows
	return {
		calls,
		getBatch: async () => {
			const b = batch
			batch = []
			return b
		},
		deleteRow: async (id) => {
			calls.push(`deleteRow:${id}`)
		},
		bumpAttempts: async (id) => {
			calls.push(`bump:${id}`)
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
		expect(deps.calls).toEqual(['bump:1', 'process:3', 'deleteRow:3'])
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
		expect(deps.calls).toEqual(['bump:1', 'process:2', 'deleteRow:2'])
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
		// Each row bumped exactly once, then the loop breaks instead of refetching forever.
		expect(deps.calls).toEqual(['bump:1', 'bump:2'])
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
		expect(deps.calls).toEqual(['bump:1', 'process:2', 'deleteRow:2', 'process:3', 'deleteRow:3'])
		expect(deps.calls.filter((c) => c === 'bump:1')).toHaveLength(1)
	})
})
