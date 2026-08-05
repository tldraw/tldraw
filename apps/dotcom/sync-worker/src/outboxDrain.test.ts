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
})
