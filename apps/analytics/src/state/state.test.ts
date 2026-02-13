import { AnalyticsState } from './state'

describe('mini reactive state', () => {
	test('creates a state with an initial value', () => {
		class MyState extends AnalyticsState<number> {}
		const myState = new MyState(10)
		expect(myState.getValue()).toBe(10)
		const myOtherState = new MyState(20)
		expect(myOtherState.getValue()).toBe(20)
	})

	test('updates the state', () => {
		class MyState extends AnalyticsState<number> {}
		const myState = new MyState(10)
		myState.setValue(20)
		expect(myState.getValue()).toBe(20)
	})

	test('handles subscribers', () => {
		class MyState extends AnalyticsState<number> {}
		const myState = new MyState(10)
		const fn = vi.fn()
		myState.subscribe((value) => fn(value))
		myState.setValue(20)
		expect(fn).toHaveBeenCalledWith(20)
		expect(fn).toHaveBeenCalledOnce()
	})

	test('removes subscribers', () => {
		class MyState extends AnalyticsState<number> {}
		const myState = new MyState(10)
		const fn = vi.fn()
		const unsubscribe = myState.subscribe((value) => fn(value))
		unsubscribe()
		myState.setValue(20)
		expect(fn).not.toHaveBeenCalled()
	})

	test('handles initializer / dispose', () => {
		const someState = {} as { something?: boolean }

		class MyState extends AnalyticsState<number> {
			override initialize(): void {
				someState.something = true
			}
			override dispose(): void {
				delete someState.something
			}
		}
		const myState = new MyState(10)
		expect(someState.something).not.toBeDefined()
		myState.initialize()
		expect(someState.something).toBeDefined()
		myState.dispose()
		expect(someState.something).not.toBeDefined()
	})
})
