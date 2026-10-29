import { describe, expect, it } from 'vitest'
import { buildVersionIndexRow } from './versionIndexWrite'

const delta = {
	v: 2,
	diff: { 'shape:a': ['put', { id: 'shape:a' }], 'shape:b': ['remove'] },
	clocks: {},
	tombstones: null,
	hash: 'h',
} as any

describe('buildVersionIndexRow', () => {
	it('user window gives edit kind with authors', () => {
		expect(
			buildVersionIndexRow({
				iso: 't1',
				documentClock: 5,
				window: { authors: [{ userId: 'u1' }], hasUserChanges: true },
				delta: null,
			})
		).toEqual({
			ts: 't1',
			documentClock: 5,
			kind: 'edit',
			authors: [{ userId: 'u1' }],
			added: 0,
			updated: 0,
			removed: 0,
			restoreId: null,
			restoredFrom: null,
			name: null,
		})
	})

	it('empty window gives system kind', () => {
		expect(
			buildVersionIndexRow({
				iso: 't1',
				documentClock: 5,
				window: { authors: [], hasUserChanges: false },
				delta: null,
			}).kind
		).toBe('system')
	})

	it('override wins', () => {
		expect(
			buildVersionIndexRow({
				iso: 't1',
				documentClock: 5,
				window: { authors: [], hasUserChanges: false },
				delta: null,
				override: { kind: 'restore', restoreId: 'r1', restoredFrom: 't0' },
			})
		).toMatchObject({ kind: 'restore', restoreId: 'r1', restoredFrom: 't0' })
	})

	it('counts from delta', () => {
		expect(
			buildVersionIndexRow({
				iso: 't1',
				documentClock: 5,
				window: { authors: [{ userId: 'u1' }], hasUserChanges: true },
				delta,
			})
		).toMatchObject({ added: 1, updated: 0, removed: 1 })
	})

	it('anonymous author kept as userId null', () => {
		expect(
			buildVersionIndexRow({
				iso: 't1',
				documentClock: 5,
				window: { authors: [{ userId: null }], hasUserChanges: true },
				delta: null,
			})
		).toMatchObject({ kind: 'edit', authors: [{ userId: null }] })
	})
})
