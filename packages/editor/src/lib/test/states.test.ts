import { StateNode } from '../editor/tools/StateNode'
import { TestEditor } from './TestEditor'

const editor = new TestEditor()

let root: StateNode

let eventLog: string[] = []

const flyingEnter = jest.fn(() => eventLog.push('flyingEnter'))
const flyingExit = jest.fn(() => eventLog.push('flyingExit'))
class Flying extends StateNode {
	static override id = 'flying'
	onEnter() {
		flyingEnter()
	}
	onExit() {
		flyingExit()
	}
}

const fallingEnter = jest.fn(() => eventLog.push('fallingEnter'))
const fallingExit = jest.fn(() => eventLog.push('fallingExit'))
class Falling extends StateNode {
	static override id = 'falling'
	onEnter() {
		fallingEnter()
	}
	onExit() {
		fallingExit()
	}
}

const dreamingEnter = jest.fn(() => eventLog.push('dreamingEnter'))
const dreamingExit = jest.fn(() => eventLog.push('dreamingExit'))
class Dreaming extends StateNode {
	static override id = 'dreaming'
	static override initial = 'flying'
	static override children() {
		return [Flying, Falling]
	}
	onEnter() {
		dreamingEnter()
	}
	onExit() {
		dreamingExit()
	}
}

const restingEnter = jest.fn(() => eventLog.push('restingEnter'))
const restingExit = jest.fn(() => eventLog.push('restingExit'))
class Resting extends StateNode {
	static override id = 'resting'
	onEnter() {
		restingEnter()
	}
	onExit() {
		restingExit()
	}
}

const asleepEnter = jest.fn(() => eventLog.push('asleepEnter'))
const asleepExit = jest.fn(() => eventLog.push('asleepExit'))
class Asleep extends StateNode {
	static override id = 'asleep'
	static override initial = 'resting'
	static override children() {
		return [Dreaming, Resting]
	}
	onEnter() {
		asleepEnter()
	}
	onExit() {
		asleepExit()
	}
}

class Eating extends StateNode {
	static override id = 'eating'
}

const workingEnter = jest.fn(() => eventLog.push('workingEnter'))
const workingExit = jest.fn(() => eventLog.push('workingExit'))
class Working extends StateNode {
	static override id = 'working'
	onEnter() {
		workingEnter()
	}
	onExit() {
		workingExit()
	}
}

const awakeEnter = jest.fn(() => eventLog.push('awakeEnter'))
const awakeExit = jest.fn(() => eventLog.push('awakeExit'))
class Awake extends StateNode {
	static override id = 'awake'
	static override initial = 'working'
	static override children() {
		return [Eating, Working]
	}
	onEnter() {
		awakeEnter()
	}
	onExit() {
		awakeExit()
	}
}

class Root extends StateNode {
	static override id = 'root'
	static override initial = 'awake'
	static override children() {
		return [Awake, Asleep]
	}
}

beforeEach(() => {
	root = new Root(editor)
	root.start()
	eventLog = []
})

afterEach(() => {
	jest.clearAllMocks()
})

describe('states', () => {
	it('has the state tree with the correct initial path', () => {
		expect(root.getPath()).toBe('root.awake.working')
		expect(root.getCurrent()!.getIsActive()).toBe(true)
		expect(root.getCurrent()!.getCurrent()!.getIsActive()).toBe(true)

		expect(root.getDescendant('awake.working')).toBe(root.getCurrent()!.getCurrent())
	})

	it('does not fire enter events when loaded', () => {
		expect(awakeEnter).toHaveBeenCalledTimes(1)
		expect(workingEnter).toHaveBeenCalledTimes(1)
	})

	it('transitions from root and picks up initial state', () => {
		expect(root.getIsActive()).toBe(true)
		expect(root.getDescendant('awake')!.getIsActive()).toBe(true)
		expect(root.getDescendant('awake.working')!.getIsActive()).toBe(true)

		root.transition('asleep')
		expect(root.getPath()).toBe('root.asleep.resting')

		// Everything happened in the right order
		expect(eventLog).toEqual(['awakeExit', 'workingExit', 'asleepEnter', 'restingEnter'])

		// exits the current states...
		expect(awakeExit).toHaveBeenCalledTimes(1)
		expect(workingExit).toHaveBeenCalledTimes(1)

		// enters the next states...
		expect(asleepEnter).toHaveBeenCalledTimes(1)
		expect(restingEnter).toHaveBeenCalledTimes(1)
	})

	it('transitions with deep path', () => {
		root.transition('asleep.dreaming.falling')
		expect(root.getPath()).toBe('root.asleep.dreaming.falling')

		expect(eventLog).toEqual([
			'awakeExit',
			'workingExit',
			'asleepEnter',
			'dreamingEnter',
			'fallingEnter',
		])

		// exits the current states...
		expect(awakeExit).toHaveBeenCalledTimes(1)
		expect(workingExit).toHaveBeenCalledTimes(1)

		// enters the next states...
		expect(asleepEnter).toHaveBeenCalledTimes(1)
		expect(dreamingEnter).toHaveBeenCalledTimes(1)
		expect(fallingEnter).toHaveBeenCalledTimes(1)
	})

	it('transitions from child to parent', () => {
		root.transition('asleep.dreaming.falling')
		expect(root.getPath()).toBe('root.asleep.dreaming.falling')

		expect(eventLog).toEqual([
			'awakeExit',
			'workingExit',
			'asleepEnter',
			'dreamingEnter',
			'fallingEnter',
		])

		root.transition('asleep.dreaming')
		expect(root.getPath()).toBe('root.asleep.dreaming.flying')

		expect(eventLog).toEqual([
			'awakeExit',
			'workingExit',
			'asleepEnter',
			'dreamingEnter',
			'fallingEnter',
			// ...
			'asleepExit',
			'dreamingExit',
			'fallingExit',
			'awakeEnter',
			'workingEnter',
			'awakeExit',
			'workingExit',
			'asleepEnter',
			'dreamingEnter',
			'flyingEnter',
		])

		// exits the current states...
		expect(awakeExit).toHaveBeenCalledTimes(2)
		expect(workingExit).toHaveBeenCalledTimes(2)

		// enters the next states...
		expect(asleepEnter).toHaveBeenCalledTimes(2)
		expect(dreamingEnter).toHaveBeenCalledTimes(2)
		expect(fallingEnter).toHaveBeenCalledTimes(1)
	})
})

describe('state events', () => {
	it('fires enter events when loaded', () => {
		expect(workingEnter).toHaveBeenCalledTimes(1)
	})
})
