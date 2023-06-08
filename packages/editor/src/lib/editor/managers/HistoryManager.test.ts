import { HistoryManager } from './HistoryManager'
import { stack } from './Stack'

function createCounterHistoryManager() {
	const manager = new HistoryManager(
		{ emit: () => void null },
		() => null,
		() => {
			return
		}
	)
	const state = {
		count: 0,
		name: 'David',
		age: 35,
	}
	const increment = manager.createCommand(
		'increment',
		(n = 1, squashing = false) => ({
			data: { n },
			squashing,
		}),
		{
			do: ({ n }) => {
				state.count += n
			},
			undo: ({ n }) => {
				state.count -= n
			},
			squash: ({ n: n1 }, { n: n2 }) => ({ n: n1 + n2 }),
		}
	)

	const decrement = manager.createCommand(
		'decrement',
		(n = 1, squashing = false) => ({
			data: { n },
			squashing,
		}),
		{
			do: ({ n }) => {
				state.count -= n
			},
			undo: ({ n }) => {
				state.count += n
			},
			squash: ({ n: n1 }, { n: n2 }) => ({ n: n1 + n2 }),
		}
	)

	const setName = manager.createCommand(
		'setName',
		(name = 'David') => ({
			data: { name, prev: state.name },
			ephemeral: true,
		}),
		{
			do: ({ name }) => {
				state.name = name
			},
			undo: ({ prev }) => {
				state.name = prev
			},
		}
	)

	const setAge = manager.createCommand(
		'setAge',
		(age = 35) => ({
			data: { age, prev: state.age },
			preservesRedoStack: true,
		}),
		{
			do: ({ age }) => {
				state.age = age
			},
			undo: ({ prev }) => {
				state.age = prev
			},
		}
	)

	const incrementTwice = manager.createCommand('incrementTwice', () => ({ data: {} }), {
		do: () => {
			increment()
			increment()
		},
		undo: () => {
			decrement()
			decrement()
		},
	})

	return {
		increment,
		incrementTwice,
		decrement,
		setName,
		setAge,
		history: manager,
		getCount: () => state.count,
		getName: () => state.name,
		getAge: () => state.age,
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

		const undos = [...editor.history._undos.value]
		const parsedUndos = JSON.parse(JSON.stringify(undos))
		editor.history._undos.set(stack(parsedUndos))

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

		editor.increment(1, true)
		editor.increment(1, true)
		editor.increment(1, true)
		editor.increment(1, true)

		expect(editor.getCount()).toBe(5)

		expect(editor.history.numUndos).toBe(3)
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
		expect(editor.history.numUndos).toBe(1)
		expect(editor.getCount()).toBe(2)
		editor.history.undo()
		expect(editor.getCount()).toBe(0)
		expect(editor.history.numUndos).toBe(0)
	})

	it('does not allow new history entries to be pushed if a command invokes them while bailing', () => {
		editor.history.mark('0')
		editor.incrementTwice()
		editor.history.mark('2')
		editor.incrementTwice()
		editor.incrementTwice()
		expect(editor.history.numUndos).toBe(5)
		expect(editor.getCount()).toBe(6)
		editor.history.bail()
		expect(editor.getCount()).toBe(2)
		expect(editor.history.numUndos).toBe(2)
		editor.history.bailToMark('0')
		expect(editor.history.numUndos).toBe(0)
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
