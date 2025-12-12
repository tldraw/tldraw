import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import { NodeSqliteWrapper } from './NodeSqliteWrapper'

describe('NodeSqliteSyncWrapper', () => {
	let db: DatabaseSync
	let wrapper: NodeSqliteWrapper

	beforeEach(() => {
		db = new DatabaseSync(':memory:')
		wrapper = new NodeSqliteWrapper(db)
		wrapper.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)')
	})

	describe('exec', () => {
		it('executes DDL statements', () => {
			wrapper.exec('CREATE TABLE another (id INTEGER PRIMARY KEY)')
			// Verify table exists by inserting
			wrapper.prepare('INSERT INTO another (id) VALUES (?)').run(1)
			const results = wrapper.prepare<{ id: number }>('SELECT * FROM another').all()
			expect(results).toEqual([{ id: 1 }])
		})

		it('executes multi-statement DDL', () => {
			wrapper.exec(`
				CREATE TABLE t1 (id INTEGER PRIMARY KEY);
				CREATE TABLE t2 (id INTEGER PRIMARY KEY);
				CREATE TABLE t3 (id INTEGER PRIMARY KEY)
			`)
			// Verify all tables exist
			wrapper.prepare('INSERT INTO t1 (id) VALUES (?)').run(1)
			wrapper.prepare('INSERT INTO t2 (id) VALUES (?)').run(2)
			wrapper.prepare('INSERT INTO t3 (id) VALUES (?)').run(3)
			expect(wrapper.prepare<{ id: number }>('SELECT * FROM t1').all()).toEqual([{ id: 1 }])
			expect(wrapper.prepare<{ id: number }>('SELECT * FROM t2').all()).toEqual([{ id: 2 }])
			expect(wrapper.prepare<{ id: number }>('SELECT * FROM t3').all()).toEqual([{ id: 3 }])
		})
	})

	describe('prepare', () => {
		describe('all()', () => {
			it('returns all results as an array', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)

				const results = wrapper
					.prepare<{ id: number; name: string; value: number }>('SELECT * FROM test ORDER BY id')
					.all()

				expect(results).toEqual([
					{ id: 1, name: 'alice', value: 100 },
					{ id: 2, name: 'bob', value: 200 },
				])
			})

			it('handles queries with bindings', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)

				const results = wrapper
					.prepare<{ name: string }>('SELECT name FROM test WHERE value > ?')
					.all(150)

				expect(results).toEqual([{ name: 'bob' }])
			})

			it('returns empty array for DML statements', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)

				const stmt = wrapper.prepare('UPDATE test SET value = ? WHERE id = ?')
				expect(stmt.all(999, 1)).toEqual([])

				// Verify the update happened
				const result = wrapper
					.prepare<{ value: number }>('SELECT value FROM test WHERE id = ?')
					.all(1)
				expect(result).toEqual([{ value: 999 }])
			})

			it('handles INSERT with RETURNING clause', () => {
				const results = wrapper
					.prepare<{
						id: number
						name: string
					}>('INSERT INTO test (name, value) VALUES (?, ?) RETURNING id, name')
					.all('charlie', 300)

				expect(results).toHaveLength(1)
				expect(results[0].name).toBe('charlie')
				expect(typeof results[0].id).toBe('number')
			})
		})

		describe('iterate()', () => {
			it('returns results via iteration', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)

				const stmt = wrapper.prepare<{ id: number; name: string; value: number }>(
					'SELECT * FROM test ORDER BY id'
				)
				const results: { id: number; name: string; value: number }[] = []
				for (const row of stmt.iterate()) {
					results.push(row)
				}

				expect(results).toEqual([
					{ id: 1, name: 'alice', value: 100 },
					{ id: 2, name: 'bob', value: 200 },
				])
			})

			it('handles queries with bindings', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(3, 'carol', 300)

				const results: { name: string }[] = []
				for (const row of wrapper
					.prepare<{ name: string }>('SELECT name FROM test WHERE value > ?')
					.iterate(150)) {
					results.push(row)
				}

				expect(results).toEqual([{ name: 'bob' }, { name: 'carol' }])
			})
		})

		describe('run()', () => {
			it('executes DML without returning results', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)

				// Verify the insert happened
				const results = wrapper.prepare<{ id: number }>('SELECT id FROM test').all()
				expect(results).toEqual([{ id: 1 }])
			})

			it('executes UPDATE', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('UPDATE test SET value = ? WHERE id = ?').run(999, 1)

				const results = wrapper
					.prepare<{ value: number }>('SELECT value FROM test WHERE id = ?')
					.all(1)
				expect(results).toEqual([{ value: 999 }])
			})

			it('executes DELETE', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)
				wrapper.prepare('DELETE FROM test WHERE id = ?').run(1)

				const results = wrapper.prepare<{ id: number }>('SELECT id FROM test').all()
				expect(results).toEqual([{ id: 2 }])
			})
		})

		describe('prepared statement reuse', () => {
			it('can be reused with different bindings', () => {
				const insert = wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)')
				insert.run(1, 'alice', 100)
				insert.run(2, 'bob', 200)
				insert.run(3, 'carol', 300)

				const results = wrapper.prepare<{ id: number }>('SELECT id FROM test ORDER BY id').all()
				expect(results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
			})

			it('iterate can be called multiple times', () => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)

				const stmt = wrapper.prepare<{ id: number }>('SELECT id FROM test ORDER BY id')

				// First iteration
				const results1: number[] = []
				for (const row of stmt.iterate()) {
					results1.push(row.id)
				}

				// Second iteration
				const results2: number[] = []
				for (const row of stmt.iterate()) {
					results2.push(row.id)
				}

				expect(results1).toEqual([1, 2])
				expect(results2).toEqual([1, 2])
			})
		})

		it('only executes first statement in multi-statement SQL (node:sqlite limitation)', () => {
			// node:sqlite's prepare() silently ignores statements after the first semicolon
			wrapper.prepare('INSERT INTO test (id) VALUES (1); INSERT INTO test (id) VALUES (2)').run()

			// Only the first statement was executed
			const results = wrapper.prepare<{ id: number }>('SELECT id FROM test').all()
			expect(results).toEqual([{ id: 1 }])
		})

		it('handles string with semicolon in value (not multi-statement)', () => {
			wrapper
				.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)')
				.run(1, 'hello; world', 100)

			const results = wrapper.prepare<{ name: string }>('SELECT name FROM test').all()
			expect(results).toEqual([{ name: 'hello; world' }])
		})
	})

	describe('transaction', () => {
		it('commits on success', () => {
			wrapper.transaction(() => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(2, 'bob', 200)
			})

			const results = wrapper.prepare<{ id: number }>('SELECT id FROM test ORDER BY id').all()
			expect(results).toEqual([{ id: 1 }, { id: 2 }])
		})

		it('rolls back on error', () => {
			expect(() => {
				wrapper.transaction(() => {
					wrapper
						.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)')
						.run(1, 'alice', 100)
					throw new Error('oops')
				})
			}).toThrow('oops')

			const results = wrapper.prepare('SELECT * FROM test').all()
			expect(results).toEqual([])
		})

		it('returns the callback result', () => {
			const result = wrapper.transaction(() => {
				wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)
				return 'done'
			})

			expect(result).toBe('done')
		})

		it('supports nested reads within transaction', () => {
			wrapper.prepare('INSERT INTO test (id, name, value) VALUES (?, ?, ?)').run(1, 'alice', 100)

			const result = wrapper.transaction(() => {
				const rows = wrapper
					.prepare<{ value: number }>('SELECT value FROM test WHERE id = ?')
					.all(1)
				wrapper.prepare('UPDATE test SET value = ? WHERE id = ?').run(rows[0].value + 50, 1)
				return wrapper.prepare<{ value: number }>('SELECT value FROM test WHERE id = ?').all(1)[0]
					.value
			})

			expect(result).toBe(150)
		})

		it('re-throws the original error after rollback', () => {
			const customError = new Error('custom error')

			try {
				wrapper.transaction(() => {
					throw customError
				})
			} catch (e) {
				expect(e).toBe(customError)
			}
		})
	})
})
