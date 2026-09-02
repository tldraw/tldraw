import { describe, expect, it, vi } from 'vitest'
import { DurableObjectSqliteSyncWrapper } from './DurableObjectSqliteSyncWrapper'

// A minimal fake of the Durable Object storage API: `sql.exec` records each
// call and returns an iterable cursor with `toArray()`, and `transactionSync`
// just invokes the callback.
function makeFakeStorage(rows: unknown[] = []) {
	const calls: { sql: string; bindings: unknown[] }[] = []
	const storage = {
		sql: {
			exec(sql: string, ...bindings: unknown[]) {
				calls.push({ sql, bindings })
				return {
					[Symbol.iterator]() {
						return rows[Symbol.iterator]()
					},
					toArray() {
						return [...rows]
					},
				}
			},
		},
		transactionSync: vi.fn(<T>(callback: () => T): T => callback()),
	}
	return { storage, calls }
}

describe('DurableObjectSqliteSyncWrapper', () => {
	describe('prepare', () => {
		it('[DO1] iterate re-executes the stored SQL with the given bindings on every call', () => {
			const { storage, calls } = makeFakeStorage([{ id: 1 }, { id: 2 }])
			const wrapper = new DurableObjectSqliteSyncWrapper(storage)

			const stmt = wrapper.prepare<{ id: number }, [number]>('SELECT id FROM test WHERE value > ?')
			expect(calls).toHaveLength(0) // nothing executed at prepare time

			expect([...stmt.iterate(100)]).toEqual([{ id: 1 }, { id: 2 }])
			expect([...stmt.iterate(200)]).toEqual([{ id: 1 }, { id: 2 }])

			expect(calls).toEqual([
				{ sql: 'SELECT id FROM test WHERE value > ?', bindings: [100] },
				{ sql: 'SELECT id FROM test WHERE value > ?', bindings: [200] },
			])
		})

		it('[DO1] all re-executes the stored SQL with the given bindings and returns toArray()', () => {
			const { storage, calls } = makeFakeStorage([{ name: 'alice' }])
			const wrapper = new DurableObjectSqliteSyncWrapper(storage)

			const stmt = wrapper.prepare<{ name: string }, [number]>('SELECT name FROM test WHERE id = ?')
			expect(stmt.all(1)).toEqual([{ name: 'alice' }])
			expect(stmt.all(2)).toEqual([{ name: 'alice' }])

			expect(calls).toEqual([
				{ sql: 'SELECT name FROM test WHERE id = ?', bindings: [1] },
				{ sql: 'SELECT name FROM test WHERE id = ?', bindings: [2] },
			])
		})

		it('[DO1] run re-executes the stored SQL with the given bindings', () => {
			const { storage, calls } = makeFakeStorage()
			const wrapper = new DurableObjectSqliteSyncWrapper(storage)

			const stmt = wrapper.prepare<void, [number, string]>(
				'INSERT INTO test (id, name) VALUES (?, ?)'
			)
			stmt.run(1, 'alice')
			stmt.run(2, 'bob')

			expect(calls).toEqual([
				{ sql: 'INSERT INTO test (id, name) VALUES (?, ?)', bindings: [1, 'alice'] },
				{ sql: 'INSERT INTO test (id, name) VALUES (?, ?)', bindings: [2, 'bob'] },
			])
		})
	})

	describe('exec', () => {
		it('[DO1] forwards to sql.exec', () => {
			const { storage, calls } = makeFakeStorage()
			const wrapper = new DurableObjectSqliteSyncWrapper(storage)

			wrapper.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)')

			expect(calls).toEqual([{ sql: 'CREATE TABLE test (id INTEGER PRIMARY KEY)', bindings: [] }])
		})
	})

	describe('transaction', () => {
		it('[DO1] delegates to transactionSync and returns its result', () => {
			const { storage } = makeFakeStorage()
			const wrapper = new DurableObjectSqliteSyncWrapper(storage)

			const callback = vi.fn(() => 'done')
			const result = wrapper.transaction(callback)

			expect(result).toBe('done')
			expect(callback).toHaveBeenCalledTimes(1)
			expect(storage.transactionSync).toHaveBeenCalledTimes(1)
			expect(storage.transactionSync).toHaveBeenCalledWith(callback)
		})
	})
})
