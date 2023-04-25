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
	let app = createCounterHistoryManager()
	beforeEach(() => {
		app = createCounterHistoryManager()
	})
	it('creates a serializable undo stack', () => {
		expect(app.getCount()).toBe(0)
		app.increment()
		app.increment()
		app.history.mark('stop at 2')
		app.increment()
		app.increment()
		app.decrement()
		expect(app.getCount()).toBe(3)

		const undos = [...app.history._undos.value]
		const parsedUndos = JSON.parse(JSON.stringify(undos))
		app.history._undos.set(stack(parsedUndos))

		app.history.undo()

		expect(app.getCount()).toBe(2)
	})

	it('allows undoing and redoing', () => {
		expect(app.getCount()).toBe(0)
		app.increment()
		app.history.mark('stop at 1')
		app.increment()
		app.history.mark('stop at 2')
		app.increment()
		app.increment()
		app.history.mark('stop at 4')
		app.increment()
		app.increment()
		app.increment()
		expect(app.getCount()).toBe(7)

		app.history.undo()
		expect(app.getCount()).toBe(4)
		app.history.undo()
		expect(app.getCount()).toBe(2)
		app.history.undo()
		expect(app.getCount()).toBe(1)
		app.history.undo()
		expect(app.getCount()).toBe(0)
		app.history.undo()
		app.history.undo()
		app.history.undo()
		expect(app.getCount()).toBe(0)

		app.history.redo()
		expect(app.getCount()).toBe(1)
		app.history.redo()
		expect(app.getCount()).toBe(2)
		app.history.redo()
		expect(app.getCount()).toBe(4)
		app.history.redo()
		expect(app.getCount()).toBe(7)
	})

	it('clears the redo stack if you execute commands, but not if you mark stopping points', () => {
		expect(app.getCount()).toBe(0)
		app.increment()
		app.history.mark('stop at 1')
		app.increment()
		app.history.mark('stop at 2')
		app.increment()
		app.increment()
		app.history.mark('stop at 4')
		app.increment()
		app.increment()
		app.increment()
		expect(app.getCount()).toBe(7)
		app.history.undo()
		app.history.undo()
		expect(app.getCount()).toBe(2)
		app.history.mark('wayward stopping point')
		app.history.redo()
		app.history.redo()
		expect(app.getCount()).toBe(7)

		app.history.undo()
		app.history.undo()
		expect(app.getCount()).toBe(2)
		app.increment()
		expect(app.getCount()).toBe(3)
		app.history.redo()
		expect(app.getCount()).toBe(3)
		app.history.redo()
		expect(app.getCount()).toBe(3)
	})

	it('allows squashing of commands', () => {
		app.increment()

		app.history.mark('stop at 1')
		expect(app.getCount()).toBe(1)

		app.increment(1, true)
		app.increment(1, true)
		app.increment(1, true)
		app.increment(1, true)

		expect(app.getCount()).toBe(5)

		expect(app.history.numUndos).toBe(3)
	})

	it('allows ephemeral commands that do not affect the stack', () => {
		app.increment()
		app.history.mark('stop at 1')
		app.increment()
		app.setName('wilbur')
		app.increment()
		expect(app.getCount()).toBe(3)
		expect(app.getName()).toBe('wilbur')
		app.history.undo()
		expect(app.getCount()).toBe(1)
		expect(app.getName()).toBe('wilbur')
	})

	it('allows inconsequential commands that do not clear the redo stack', () => {
		app.increment()
		app.history.mark('stop at 1')
		app.increment()
		expect(app.getCount()).toBe(2)
		app.history.undo()
		expect(app.getCount()).toBe(1)
		app.history.mark('stop at age 35')
		app.setAge(23)
		app.history.mark('stop at age 23')
		expect(app.getCount()).toBe(1)
		app.history.redo()
		expect(app.getCount()).toBe(2)
		expect(app.getAge()).toBe(23)
		app.history.undo()
		expect(app.getCount()).toBe(1)
		expect(app.getAge()).toBe(23)
		app.history.undo()
		expect(app.getCount()).toBe(1)
		expect(app.getAge()).toBe(35)
		app.history.undo()
		expect(app.getCount()).toBe(0)
		expect(app.getAge()).toBe(35)
	})

	it('does not allow new history entries to be pushed if a command invokes them while doing or undoing', () => {
		app.incrementTwice()
		expect(app.history.numUndos).toBe(1)
		expect(app.getCount()).toBe(2)
		app.history.undo()
		expect(app.getCount()).toBe(0)
		expect(app.history.numUndos).toBe(0)
	})

	it('does not allow new history entries to be pushed if a command invokes them while bailing', () => {
		app.history.mark('0')
		app.incrementTwice()
		app.history.mark('2')
		app.incrementTwice()
		app.incrementTwice()
		expect(app.history.numUndos).toBe(5)
		expect(app.getCount()).toBe(6)
		app.history.bail()
		expect(app.getCount()).toBe(2)
		expect(app.history.numUndos).toBe(2)
		app.history.bailToMark('0')
		expect(app.history.numUndos).toBe(0)
		expect(app.getCount()).toBe(0)
	})

	it('supports bailing to a particular mark', () => {
		app.increment()
		app.history.mark('1')
		app.increment()
		app.history.mark('2')
		app.increment()
		app.history.mark('3')
		app.increment()

		expect(app.getCount()).toBe(4)
		app.history.bailToMark('2')
		expect(app.getCount()).toBe(2)
	})
})
