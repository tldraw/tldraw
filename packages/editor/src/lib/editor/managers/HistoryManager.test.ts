import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { noop } from '@tldraw/utils'
import { TLHistoryBatchOptions } from '../types/history-types'
import { HistoryManager } from './HistoryManager'
import { stack } from './Stack'

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

	const ctx = { store, emit: noop }
	const manager = new HistoryManager<TestRecord, typeof ctx>(ctx, () => {
		return
	})

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
		manager.ephemeral(() => _setName(name))
	}

	const setAge = (age = 35) => {
		manager.preserveRedoStack(() => _setAge(age))
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
		editor.history.mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.decrement()
		expect(editor.getCount()).toBe(3)

		const undos = [...editor.history.stacks.get().undos]
		const parsedUndos = JSON.parse(JSON.stringify(undos))
		editor.history.stacks.update(({ redos }) => ({ undos: stack(parsedUndos), redos }))

		editor.history.undo()

		expect(editor.getCount()).toBe(2)
	})

	it('allows undoing and redoing', () => {
		expect(editor.getCount()).toBe(0)
		editor.increment()
		editor.history.mark('stop at 1')
		editor.increment()
		editor.history.mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.history.mark('stop at 4')
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
		editor.history.mark('stop at 1')
		editor.increment()
		editor.history.mark('stop at 2')
		editor.increment()
		editor.increment()
		editor.history.mark('stop at 4')
		editor.increment()
		editor.increment()
		editor.increment()
		expect(editor.getCount()).toBe(7)
		editor.history.undo()
		editor.history.undo()
		expect(editor.getCount()).toBe(2)
		editor.history.mark('wayward stopping point')
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

		editor.history.mark('stop at 1')
		expect(editor.getCount()).toBe(1)

		editor.increment(1)
		editor.increment(1)
		editor.increment(1)
		editor.increment(1)

		expect(editor.getCount()).toBe(5)

		expect(editor.history.getNumUndos()).toBe(3)
	})
	it('allows ephemeral commands that do not affect the stack', () => {
		editor.increment()
		editor.history.mark('stop at 1')
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
		editor.history.mark('stop at 1')
		editor.increment()
		expect(editor.getCount()).toBe(2)
		editor.history.undo()
		expect(editor.getCount()).toBe(1)
		editor.history.mark('stop at age 35')
		editor.setAge(23)
		editor.history.mark('stop at age 23')
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
		editor.history.mark('0')
		editor.incrementTwice()
		editor.history.mark('2')
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
		editor.history.mark('1')
		editor.increment()
		editor.history.mark('2')
		editor.increment()
		editor.history.mark('3')
		editor.increment()

		expect(editor.getCount()).toBe(4)
		editor.history.bailToMark('2')
		expect(editor.getCount()).toBe(2)
	})
})

describe('history options', () => {
	let manager: HistoryManager<TestRecord, any>

	let getState: () => { a: number; b: number }
	let setA: (n: number, historyOptions?: TLHistoryBatchOptions) => any
	let setB: (n: number, historyOptions?: TLHistoryBatchOptions) => any

	beforeEach(() => {
		const store = new Store({ schema: testSchema, props: null })
		store.put([
			testSchema.types.test.create({ id: ids.a, value: 0 }),
			testSchema.types.test.create({ id: ids.b, value: 0 }),
		])

		const ctx = { store, emit: noop }
		manager = new HistoryManager<TestRecord, typeof ctx>(ctx, noop)

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

	it('sets, undoes, redoes', () => {
		manager.mark()
		setA(1)
		manager.mark()
		setB(1)
		manager.mark()
		setB(2)

		expect(getState()).toMatchObject({ a: 1, b: 2 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 1 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 2 })
	})

	it('sets, undoes, redoes', () => {
		manager.mark()
		setA(1)
		manager.mark()
		setB(1)
		manager.mark()
		setB(2)
		setB(3)
		setB(4)

		expect(getState()).toMatchObject({ a: 1, b: 4 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 1 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 4 })
	})

	it('sets ephemeral, undoes, redos', () => {
		manager.mark()
		setA(1)
		manager.mark()
		setB(1) // B 0->1
		manager.mark()
		setB(2, { history: 'ephemeral' }) // B 0->2, but ephemeral

		expect(getState()).toMatchObject({ a: 1, b: 2 })

		manager.undo() // undoes B 2->0

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo() // redoes B 0->1, but not B 1-> 2

		expect(getState()).toMatchObject({ a: 1, b: 1 }) // no change, b 1->2 was ephemeral
	})

	it('sets squashing, undoes, redos', () => {
		manager.mark()
		setA(1)
		manager.mark()
		setB(1)
		setB(2) // squashes with the previous command
		setB(3) // squashes with the previous command

		expect(getState()).toMatchObject({ a: 1, b: 3 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 3 })
	})

	it('sets squashing and ephemeral, undoes, redos', () => {
		manager.mark()
		setA(1)
		manager.mark()
		setB(1)
		setB(2) // squashes with the previous command
		setB(3, { history: 'ephemeral' }) // squashes with the previous command

		expect(getState()).toMatchObject({ a: 1, b: 3 })

		manager.undo()

		expect(getState()).toMatchObject({ a: 1, b: 0 })

		manager.redo()

		expect(getState()).toMatchObject({ a: 1, b: 2 }) // B2->3 was ephemeral
	})
})
