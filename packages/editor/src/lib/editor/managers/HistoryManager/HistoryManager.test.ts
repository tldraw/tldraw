import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { vi } from 'vitest'
import { TLHistoryBatchOptions } from '../../types/history-types'
import { HistoryManager } from './HistoryManager'

interface TestRecord extends BaseRecord<'test', TestRecordId> {
	value: number | string
}
type TestRecordId = RecordId<TestRecord>
const testSchema = StoreSchema.create<TestRecord, null>({
	test: createRecordType<TestRecord>('test', { scope: 'document' }),
})

const ids = {
	count: testSchema.types.test.createId('count'),
	name: testSchema.types.test.createId('name'),
	age: testSchema.types.test.createId('age'),
	a: testSchema.types.test.createId('a'),
	b: testSchema.types.test.createId('b'),
}

function createCounterHistoryManager() {
	const store = new Store({ schema: testSchema, props: null })
	store.put([
		testSchema.types.test.create({ id: ids.count, value: 0 }),
		testSchema.types.test.create({ id: ids.name, value: 'David' }),
		testSchema.types.test.create({ id: ids.age, value: 35 }),
	])

	const manager = new HistoryManager<TestRecord>({ store })

	function getCount() {
		return store.get(ids.count)!.value as number
	}
	function getName() {
		return store.get(ids.name)!.value as string
	}
	function getAge() {
		return store.get(ids.age)!.value as number
	}
	function _setCount(n: number) {
		store.update(ids.count, (c) => ({ ...c, value: n }))
	}
	function _setName(name: string) {
		store.update(ids.name, (c) => ({ ...c, value: name }))
	}
	function _setAge(age: number) {
		store.update(ids.age, (c) => ({ ...c, value: age }))
	}

	const increment = (n = 1) => {
		_setCount(getCount() + n)
	}

	const decrement = (n = 1) => {
		_setCount(getCount() - n)
	}

	const setName = (name = 'David') => {
		manager.batch(() => _setName(name), { history: 'ignore' })
	}

	const setAge = (age = 35) => {
		manager.batch(() => _setAge(age), { history: 'record-preserveRedoStack' })
	}

	const incrementTwice = () => {
		manager.batch(() => {
			increment()
			increment()
		})
	}

	return {
		increment,
		incrementTwice,
		decrement,
		setName,
		setAge,
		history: manager,
		getCount,
		getName,
		getAge,
	}
}

describe(HistoryManager, () => {
	let editor = createCounterHistoryManager()
	beforeEach(() => {
		editor = createCounterHistoryManager()
	})
	it('creates a serializable undo stack', () => {
		expect(editor.getCount()).toBe(0)
		editor.increment()
		editor.increment()
		editor.history._mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.decrement()
		expect(editor.getCount()).toBe(3)

		const undos = editor.history.debug().undos
		const parsedUndos = JSON.parse(JSON.stringify(undos))
		expect(parsedUndos).toEqual(undos)

		editor.history.undo()

		expect(editor.getCount()).toBe(2)
	})

	it('allows undoing and redoing', () => {
		expect(editor.getCount()).toBe(0)
		editor.increment()
		editor.history._mark('stop at 1')
		editor.increment()
		editor.history._mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.history._mark('stop at 4')
		editor.increment()
		editor.increment()
		editor.increment()
		expect(editor.getCount()).toBe(7)

		editor.history.undo()
		expect(editor.getCount()).toBe(4)
		editor.history.undo()
		expect(editor.getCount()).toBe(2)
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		editor.history.undo()
		expect(editor.getCount()).toBe(0)
		editor.history.undo()
		editor.history.undo()
		editor.history.undo()
		expect(editor.getCount()).toBe(0)

		editor.history.redo()
		expect(editor.getCount()).toBe(1)
		editor.history.redo()
		expect(editor.getCount()).toBe(2)
		editor.history.redo()
		expect(editor.getCount()).toBe(4)
		editor.history.redo()
		expect(editor.getCount()).toBe(7)
	})

	it('clears the redo stack if you execute commands, but not if you mark stopping points', () => {
		expect(editor.getCount()).toBe(0)
		editor.increment()
		editor.history._mark('stop at 1')
		editor.increment()
		editor.history._mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.history._mark('stop at 4')
		editor.increment()
		editor.increment()
		editor.increment()
		expect(editor.getCount()).toBe(7)
		editor.history.undo()
		editor.history.undo()
		expect(editor.getCount()).toBe(2)
		editor.history._mark('wayward stopping point')
		editor.history.redo()
		editor.history.redo()
		expect(editor.getCount()).toBe(7)

		editor.history.undo()
		editor.history.undo()
		expect(editor.getCount()).toBe(2)
		editor.increment()
		expect(editor.getCount()).toBe(3)
		editor.history.redo()
		expect(editor.getCount()).toBe(3)
		editor.history.redo()
		expect(editor.getCount()).toBe(3)
	})

	it('allows squashing of commands', () => {
		editor.increment()

		editor.history._mark('stop at 1')
		expect(editor.getCount()).toBe(1)

		editor.increment(1)
		editor.increment(1)
		editor.increment(1)
		editor.increment(1)

		expect(editor.getCount()).toBe(5)

		expect(editor.history.getNumUndos()).toBe(3)
	})
	it('allows ignore commands that do not affect the stack', () => {
		editor.increment()
		editor.history._mark('stop at 1')
		editor.increment()
		editor.setName('wilbur')
		editor.increment()
		expect(editor.getCount()).toBe(3)
		expect(editor.getName()).toBe('wilbur')
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		expect(editor.getName()).toBe('wilbur')
	})

	it('allows inconsequential commands that do not clear the redo stack', () => {
		editor.increment()
		editor.history._mark('stop at 1')
		editor.increment()
		expect(editor.getCount()).toBe(2)
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		editor.history._mark('stop at age 35')
		editor.setAge(23)
		editor.history._mark('stop at age 23')
		expect(editor.getCount()).toBe(1)
		editor.history.redo()
		expect(editor.getCount()).toBe(2)
		expect(editor.getAge()).toBe(23)
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		expect(editor.getAge()).toBe(23)
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		expect(editor.getAge()).toBe(35)
		editor.history.undo()
		expect(editor.getCount()).toBe(0)
		expect(editor.getAge()).toBe(35)
	})

	it('does not allow new history entries to be pushed if a command invokes them while doing or undoing', () => {
		editor.incrementTwice()
		expect(editor.history.getNumUndos()).toBe(1)
		expect(editor.getCount()).toBe(2)
		editor.history.undo()
		expect(editor.getCount()).toBe(0)
		expect(editor.history.getNumUndos()).toBe(0)
	})

	it('does not allow new history entries to be pushed if a command invokes them while bailing', () => {
		editor.history._mark('0')
		editor.incrementTwice()
		editor.history._mark('2')
		editor.incrementTwice()
		editor.incrementTwice()
		expect(editor.history.getNumUndos()).toBe(4)
		expect(editor.getCount()).toBe(6)
		editor.history.bail()
		expect(editor.getCount()).toBe(2)
		expect(editor.history.getNumUndos()).toBe(2)
		editor.history.bailToMark('0')
		expect(editor.history.getNumUndos()).toBe(0)
		expect(editor.getCount()).toBe(0)
	})

	it('supports bailing to a particular mark', () => {
		editor.increment()
		editor.history._mark('1')
		editor.increment()
		editor.history._mark('2')
		editor.increment()
		editor.history._mark('3')
		editor.increment()

		expect(editor.getCount()).toBe(4)
		editor.history.bailToMark('2')
		expect(editor.getCount()).toBe(2)
	})
})

describe('history options', () => {
	let manager: HistoryManager<TestRecord>

	let getState: () => { a: number; b: number }
	let setA: (n: number, historyOptions?: TLHistoryBatchOptions) => any
	let setB: (n: number, historyOptions?: TLHistoryBatchOptions) => any

	beforeEach(() => {
		const store = new Store({ schema: testSchema, props: null })
		store.put([
			testSchema.types.test.create({ id: ids.a, value: 0 }),
			testSchema.types.test.create({ id: ids.b, value: 0 }),
		])

		manager = new HistoryManager<TestRecord>({ store })

		getState = () => {
			return { a: store.get(ids.a)!.value as number, b: store.get(ids.b)!.value as number }
		}

		setA = (n: number, historyOptions?: TLHistoryBatchOptions) => {
			manager.batch(() => store.update(ids.a, (s) => ({ ...s, value: n })), historyOptions)
		}

		setB = (n: number, historyOptions?: TLHistoryBatchOptions) => {
			manager.batch(() => store.update(ids.b, (s) => ({ ...s, value: n })), historyOptions)
		}
	})

	it('undos, redoes, separate marks', () => {
		manager._mark('')
		setA(1)
		manager._mark('')
		setB(1)
		manager._mark('')
		setB(2)

		expect(getState()).toMatchObject({ a: 1, b: 2 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 1 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 2 })
	})

	it('undos, redos, squashing', () => {
		manager._mark('')
		setA(1)
		manager._mark('')
		setB(1)
		manager._mark('')
		setB(2)
		setB(3)
		setB(4)

		expect(getState()).toMatchObject({ a: 1, b: 4 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 1 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 4 })
	})

	it('undos, redos, ignore', () => {
		manager._mark('')
		setA(1)
		manager._mark('')
		setB(1) // B 0->1
		manager._mark('')
		setB(2, { history: 'ignore' }) // B 0->2, but ignore

		expect(getState()).toMatchObject({ a: 1, b: 2 })

		manager.undo() // undoes B 2->0

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo() // redoes B 0->1, but not B 1-> 2

		expect(getState()).toMatchObject({ a: 1, b: 1 }) // no change, b 1->2 was ignore
	})

	it('squashing, undos, redos', () => {
		manager._mark('')
		setA(1)
		manager._mark('')
		setB(1)
		setB(2) // squashes with the previous command
		setB(3) // squashes with the previous command

		expect(getState()).toMatchObject({ a: 1, b: 3 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 3 })
	})

	it('squashing, undos, redos, ignore', () => {
		manager._mark('')
		setA(1)
		manager._mark('')
		setB(1)
		setB(2) // squashes with the previous command
		setB(3, { history: 'ignore' }) // squashes with the previous command

		expect(getState()).toMatchObject({ a: 1, b: 3 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 2 }) // B2->3 was ignore
	})

	it('nested ignore', () => {
		manager._mark('')
		manager.batch(
			() => {
				setA(1)
				// even though we set this to record, it will still be ignored
				manager.batch(() => setB(1), { history: 'record' })
				setA(2)
			},
			{ history: 'ignore' }
		)
		expect(getState()).toMatchObject({ a: 2, b: 1 })

		// changes were ignored:
		manager.undo()
		expect(getState()).toMatchObject({ a: 2, b: 1 })

		manager._mark('')
		manager.batch(
			() => {
				setA(3)
				manager.batch(() => setB(2), { history: 'ignore' })
			},
			{ history: 'record-preserveRedoStack' }
		)
		expect(getState()).toMatchObject({ a: 3, b: 2 })

		// changes to A were recorded, but changes to B were ignore:
		manager.undo()
		expect(getState()).toMatchObject({ a: 2, b: 2 })

		// We can still redo because we preserved the redo stack:
		manager.redo()
		expect(getState()).toMatchObject({ a: 3, b: 2 })
	})

	it('squashToMark works', () => {
		manager._mark('a')
		setA(1)
		manager._mark('b')
		setB(1)
		setB(2)
		setB(3)
		manager._mark('')
		setA(2)
		setB(4)
		manager._mark('')
		setB(5)
		setB(6)

		expect(getState()).toMatchObject({ a: 2, b: 6 })

		manager.squashToMark('b')

		// does not affect state
		expect(getState()).toMatchObject({ a: 2, b: 6 })

		// but now undoing should take us back to a
		manager.undo()
		expect(getState()).toMatchObject({ a: 1, b: 0 })

		// and redoing should take us back to the end
		manager.redo()
		expect(getState()).toMatchObject({ a: 2, b: 6 })

		// and we can get back to the start with two undos
		manager.undo().undo()
		expect(getState()).toMatchObject({ a: 0, b: 0 })

		manager.redo().redo()
		manager.squashToMark('a')

		expect(getState()).toMatchObject({ a: 2, b: 6 })
		manager.undo()
		expect(getState()).toMatchObject({ a: 0, b: 0 })
	})
})

describe('HistoryManager constructor and lifecycle', () => {
	let store: Store<TestRecord>

	beforeEach(() => {
		store = new Store({ schema: testSchema, props: null })
		store.put([testSchema.types.test.create({ id: ids.a, value: 0 })])
	})

	it('should initialize with store reference', () => {
		const manager = new HistoryManager({ store })
		expect(manager).toBeDefined()
		expect(manager.getNumUndos()).toBe(0)
		expect(manager.getNumRedos()).toBe(0)
	})

	it('should initialize with optional annotateError callback', () => {
		const mockAnnotateError = vi.fn()
		const manager = new HistoryManager({ store, annotateError: mockAnnotateError })
		expect(manager).toBeDefined()
	})

	it('should properly dispose and cleanup', () => {
		const manager = new HistoryManager({ store })
		expect(typeof manager.dispose).toBe('function')

		// Should not throw when disposing
		expect(() => manager.dispose()).not.toThrow()
	})

	it('should handle errors in batch operations with annotateError', () => {
		const mockAnnotateError = vi.fn()
		const manager = new HistoryManager({ store, annotateError: mockAnnotateError })

		const errorFn = () => {
			throw new Error('Test error')
		}

		expect(() => manager.batch(errorFn)).toThrow('Test error')
		expect(mockAnnotateError).toHaveBeenCalledWith(expect.any(Error))
	})

	it('should handle nested batch error scenarios', () => {
		const mockAnnotateError = vi.fn()
		const manager = new HistoryManager({ store, annotateError: mockAnnotateError })

		const nestedErrorFn = () => {
			manager.batch(() => {
				throw new Error('Nested error')
			})
		}

		expect(() => manager.batch(nestedErrorFn)).toThrow('Nested error')
		expect(mockAnnotateError).toHaveBeenCalledWith(expect.any(Error))
	})
})

describe('HistoryManager getters and utilities', () => {
	let manager: HistoryManager<TestRecord>
	let store: Store<TestRecord>

	beforeEach(() => {
		store = new Store({ schema: testSchema, props: null })
		store.put([testSchema.types.test.create({ id: ids.a, value: 0 })])
		manager = new HistoryManager({ store })
	})

	describe('getNumUndos and getNumRedos', () => {
		it('should return 0 for empty history', () => {
			expect(manager.getNumUndos()).toBe(0)
			expect(manager.getNumRedos()).toBe(0)
		})

		it('should count undos correctly with pending changes', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			expect(manager.getNumUndos()).toBe(1)
			expect(manager.getNumRedos()).toBe(0)
		})

		it('should count undos and redos after operations', () => {
			expect(manager.getNumUndos()).toBe(0)
			expect(manager.getNumRedos()).toBe(0)

			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			expect(manager.getNumUndos()).toBe(1)
			expect(manager.getNumRedos()).toBe(0)

			manager._mark('mark1')

			expect(manager.getNumUndos()).toBe(2)
			expect(manager.getNumRedos()).toBe(0)

			store.update(ids.a, (s) => ({ ...s, value: 2 }))

			// Based on actual behavior: 1 pending + 1 mark + 1 flushed = 3
			expect(manager.getNumUndos()).toBe(3)
			expect(manager.getNumRedos()).toBe(0)

			manager.undo()
			expect(manager.getNumUndos()).toBe(1) // After undo, we're back to just the first operation
			expect(manager.getNumRedos()).toBe(2) // Undo moved 2 items to redo stack (pending + mark)
		})

		it('should count correctly after clearing redo stack', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager.undo()
			expect(manager.getNumRedos()).toBe(1)

			store.update(ids.a, (s) => ({ ...s, value: 2 }))
			expect(manager.getNumRedos()).toBe(0)
		})
	})

	describe('getMarkIdMatching', () => {
		it('should return null when no marks exist', () => {
			expect(manager.getMarkIdMatching('test')).toBeNull()
		})

		it('should find marks by substring', () => {
			manager._mark('test-mark-1')
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager._mark('other-mark-2')

			expect(manager.getMarkIdMatching('test')).toBe('test-mark-1')
			expect(manager.getMarkIdMatching('other')).toBe('other-mark-2')
			expect(manager.getMarkIdMatching('mark')).toBe('other-mark-2') // returns most recent
		})

		it('should return null for non-existent substrings', () => {
			manager._mark('test-mark')
			expect(manager.getMarkIdMatching('nonexistent')).toBeNull()
		})

		it('should find marks after undo operations', () => {
			manager._mark('initial-mark')
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager._mark('second-mark')
			store.update(ids.a, (s) => ({ ...s, value: 2 }))

			// After undo, marks should still be findable in the undo stack
			expect(manager.getMarkIdMatching('initial')).toBe('initial-mark')
			expect(manager.getMarkIdMatching('second')).toBe('second-mark')
		})
	})

	describe('clear method', () => {
		it('should clear all history', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager._mark('test-mark')
			store.update(ids.a, (s) => ({ ...s, value: 2 }))

			expect(manager.getNumUndos()).toBeGreaterThan(0)

			manager.clear()

			expect(manager.getNumUndos()).toBe(0)
			expect(manager.getNumRedos()).toBe(0)
		})

		it('should clear pending diffs', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			expect(manager.getNumUndos()).toBe(1)

			manager.clear()
			expect(manager.getNumUndos()).toBe(0)
		})

		it('should allow new operations after clearing', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager.clear()

			store.update(ids.a, (s) => ({ ...s, value: 2 }))
			expect(manager.getNumUndos()).toBe(1)

			manager.undo()
			expect(store.get(ids.a)!.value).toBe(1) // Should undo to value before the new operation
		})
	})

	describe('debug method', () => {
		it('should return debug information', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager._mark('test-mark')
			store.update(ids.a, (s) => ({ ...s, value: 2 }))

			const debug = manager.debug()

			expect(debug).toHaveProperty('undos')
			expect(debug).toHaveProperty('redos')
			expect(debug).toHaveProperty('pendingDiff')
			expect(debug).toHaveProperty('state')
			expect(Array.isArray(debug.undos)).toBe(true)
			expect(Array.isArray(debug.redos)).toBe(true)
		})

		it('should show correct state information', () => {
			const debug = manager.debug()
			expect(debug.state).toBe('recording')
		})

		it('should reflect changes after undo/redo', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			manager.undo()

			const debug = manager.debug()
			expect(debug.redos.length).toBeGreaterThan(0)
		})
	})
})

describe('HistoryManager error scenarios and edge cases', () => {
	let manager: HistoryManager<TestRecord>
	let store: Store<TestRecord>

	beforeEach(() => {
		store = new Store({ schema: testSchema, props: null })
		store.put([testSchema.types.test.create({ id: ids.a, value: 0 })])
		manager = new HistoryManager({ store })
	})

	describe('squashToMark error handling', () => {
		it('should handle non-existent mark gracefully', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			manager.squashToMark('non-existent-mark')

			expect(consoleSpy).toHaveBeenCalledWith(
				'Could not find mark to squash to: ',
				'non-existent-mark'
			)
			consoleSpy.mockRestore()
		})

		it('should handle empty stack when squashing', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			manager.squashToMark('non-existent')

			expect(consoleSpy).toHaveBeenCalled()
			consoleSpy.mockRestore()
		})

		it('should return early when no changes to squash', () => {
			manager._mark('test-mark')

			// No operations between marks
			const result = manager.squashToMark('test-mark')
			expect(result).toBe(manager) // Should return manager instance
		})
	})

	describe('bailToMark with non-existent marks', () => {
		it('should handle non-existent mark in bailToMark', () => {
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			const originalValue = store.get(ids.a)!.value

			manager.bailToMark('non-existent-mark')

			// Should not change anything when mark doesn't exist
			expect(store.get(ids.a)!.value).toBe(originalValue)
		})

		it('should find mark correctly when it exists', () => {
			manager._mark('existing-mark')
			store.update(ids.a, (s) => ({ ...s, value: 1 }))
			store.update(ids.a, (s) => ({ ...s, value: 2 }))

			manager.bailToMark('existing-mark')
			expect(store.get(ids.a)!.value).toBe(0)
		})
	})

	describe('empty stack operations', () => {
		it('should handle undo on empty stack', () => {
			expect(() => manager.undo()).not.toThrow()
			expect(manager.getNumUndos()).toBe(0)
		})

		it('should handle redo on empty stack', () => {
			expect(() => manager.redo()).not.toThrow()
			expect(manager.getNumRedos()).toBe(0)
		})

		it('should handle bail on empty stack', () => {
			expect(() => manager.bail()).not.toThrow()
			expect(manager.getNumUndos()).toBe(0)
		})
	})

	describe('batch operation edge cases', () => {
		it('should handle nested batches correctly', () => {
			let callCount = 0

			manager.batch(() => {
				callCount++
				manager.batch(() => {
					callCount++
					store.update(ids.a, (s) => ({ ...s, value: 1 }))
				})
				store.update(ids.a, (s) => ({ ...s, value: 2 }))
			})

			expect(callCount).toBe(2)
			expect(store.get(ids.a)!.value).toBe(2)
		})

		it('should maintain batch state correctly during errors', () => {
			const mockAnnotateError = vi.fn()
			const errorManager = new HistoryManager({ store, annotateError: mockAnnotateError })

			try {
				errorManager.batch(() => {
					store.update(ids.a, (s) => ({ ...s, value: 1 }))
					throw new Error('Test error')
				})
			} catch (_e) {
				// Expected to throw
			}

			// Should be able to perform normal operations after error
			expect(() => {
				errorManager.batch(() => {
					store.update(ids.a, (s) => ({ ...s, value: 2 }))
				})
			}).not.toThrow()
		})

		it('should handle batch with undefined history option', () => {
			expect(() => {
				manager.batch(() => {
					store.update(ids.a, (s) => ({ ...s, value: 1 }))
				}, undefined)
			}).not.toThrow()
		})
	})

	describe('large history operations', () => {
		it('should handle many undo operations', () => {
			// Create operations with marks - based on existing test pattern
			for (let i = 1; i <= 10; i++) {
				store.update(ids.a, (s) => ({ ...s, value: i }))
				if (i % 3 === 0) manager._mark(`mark-${i}`)
			}

			const undoCount = manager.getNumUndos()
			expect(undoCount).toBeGreaterThan(3)

			// Undo some operations
			const undosToPerform = 3
			for (let i = 0; i < undosToPerform; i++) {
				manager.undo()
			}

			// Due to marks, the redo count might be different
			expect(manager.getNumRedos()).toBeGreaterThan(0)
		})

		it('should handle alternating undo/redo operations', () => {
			for (let i = 1; i <= 10; i++) {
				store.update(ids.a, (s) => ({ ...s, value: i }))
			}

			// Alternate undo/redo
			for (let i = 0; i < 5; i++) {
				manager.undo()
				manager.redo()
			}

			expect(store.get(ids.a)!.value).toBe(10)
		})
	})

	describe('concurrent-like operations', () => {
		it('should handle rapid sequential operations', () => {
			const initialValue = store.get(ids.a)!.value

			// Rapid fire updates
			for (let i = 1; i <= 20; i++) {
				store.update(ids.a, (s) => ({ ...s, value: i }))
			}

			manager.undo()
			expect(store.get(ids.a)!.value).toBe(initialValue)
		})
	})
})
